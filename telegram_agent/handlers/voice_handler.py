"""
handlers/voice_handler.py — Ovozli xabarni qabul qilish, Muxlisa STT/Gemini tahlil, Muxlisa TTS javob
"""

import logging
import os
import uuid

from telegram import Update, Voice
from telegram.ext import ContextTypes
from telegram.constants import ChatAction

from config import TEMP_DIR, MUXLISA_API_KEY
from services.ai_service import analyze_audio_file, generate_voice_response, generate_text
from services.voice_service import (
    ogg_to_wav,
    muxlisa_stt,
    text_to_voice,
    detect_language,
)

logger = logging.getLogger(__name__)

os.makedirs(TEMP_DIR, exist_ok=True)


async def handle_voice(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """
    Telegram ovozli xabarini qayta ishlash:
    1. OGG yuklab olish
    2. Muxlisa STT → matn (O'zbek/Rus)  YOKI  Gemini Audio tahlil
    3. Gemini orqali javob generatsiya
    4. Muxlisa TTS → ovozli javob
    """
    message = update.message
    voice: Voice = message.voice

    if not voice:
        return

    await message.reply_text("🎙️ Ovozli xabaringiz qabul qilindi, tahlil qilinmoqda...")
    await context.bot.send_chat_action(
        chat_id=message.chat_id, action=ChatAction.RECORD_VOICE
    )

    uid = uuid.uuid4().hex[:8]
    ogg_path = os.path.join(TEMP_DIR, f"voice_{uid}.ogg")
    wav_path = os.path.join(TEMP_DIR, f"voice_{uid}.wav")
    response_ogg_path = os.path.join(TEMP_DIR, f"response_{uid}.ogg")

    try:
        # ① OGG faylini yuklab olish
        voice_file = await voice.get_file()
        await voice_file.download_to_drive(ogg_path)
        logger.info(f"Ovozli xabar yuklandi: {ogg_path}")

        await context.bot.send_chat_action(
            chat_id=message.chat_id, action=ChatAction.TYPING
        )

        # ② Matnni ajratish — Muxlisa STT (O'zbek uchun aniq)
        recognized_text = ""
        if MUXLISA_API_KEY:
            try:
                # OGG → WAV (Muxlisa STT uchun)
                wav_path = await ogg_to_wav(ogg_path)
                recognized_text = await muxlisa_stt(wav_path)
                logger.info(f"Muxlisa STT natija: {recognized_text[:100]}...")
            except Exception as e:
                logger.warning(f"Muxlisa STT ishlamadi ({e}), Gemini ishlatilmoqda...")

        # ③ Gemini Audio tahlil (Muxlisa STT ishlamasa yoki qo'shimcha tahlil)
        if recognized_text:
            # Muxlisa STT muvaffaqiyatli bo'lsa — Gemini faqat javob generatsiya qiladi
            ai_analysis = recognized_text
            ai_response = await generate_text(
                prompt=recognized_text,
                system_instruction=(
                    "Foydalanuvchi siz bilan ovozli suhbat qilmoqda. "
                    "Uning xabariga qisqa, do'stona va foydali javob ber. "
                    "Javob 100-200 so'z bo'lsin va tabiiy gapirish uslubida yozilsin. "
                    "Til: foydalanuvchi tiliga mos (o'zbek yoki rus)."
                )
            )
        else:
            # Gemini Audio tahlil (ko'p tilli qo'llab-quvvatlash uchun)
            ai_analysis = await analyze_audio_file(ogg_path)
            ai_response = await generate_voice_response(
                user_message_text="",
                ai_analysis=ai_analysis
            )

        logger.info(f"AI javob tayyor: {ai_response[:80]}...")

        # Matn ko'rinishida qisqa preview
        short_text = recognized_text or ai_analysis
        preview = short_text[:200] + ("..." if len(short_text) > 200 else "")
        await message.reply_text(
            f"📝 *Men tushundim:*\n\n{preview}",
            parse_mode="Markdown"
        )

        # ④ Muxlisa TTS — javobni ovozga aylantirish
        await context.bot.send_chat_action(
            chat_id=message.chat_id, action=ChatAction.RECORD_VOICE
        )

        lang = detect_language(ai_response)
        response_ogg_path = await text_to_voice(
            text=ai_response,
            lang=lang,
            output_path=response_ogg_path
        )

        # ⑤ Ovozli javob yuborish
        with open(response_ogg_path, "rb") as af:
            await message.reply_voice(
                voice=af,
                caption="🤖 *Muxlisa AI ovozli javobi*",
                parse_mode="Markdown"
            )

        logger.info("Ovozli javob muvaffaqiyatli yuborildi.")

    except Exception as e:
        logger.error(f"Ovozli xabar xatosi: {e}")
        await message.reply_text(
            f"❌ Xatolik yuz berdi: {e}\n\nIltimos, qayta urinib ko'ring."
        )
    finally:
        # Vaqtinchalik fayllarni tozalash
        for path in [ogg_path, wav_path, response_ogg_path]:
            if path and os.path.exists(path):
                try:
                    os.remove(path)
                except Exception:
                    pass
