"""
handlers/news_handler.py — AI yangiliklari buyruqlari va kanal postlar
Kanal postga matn + ovozli xabar biriktiriladi (Muxlisa AI TTS)
"""

import logging
import os
import uuid
from datetime import datetime

from telegram import Update
from telegram.ext import ContextTypes
from telegram.constants import ChatAction

from config import TEMP_DIR, MUXLISA_API_KEY
from services.news_fetcher import fetch_all_news
from services.ai_service import generate_ai_news_post
from services.voice_service import muxlisa_tts, _gtts_fallback
from pydub import AudioSegment

logger = logging.getLogger(__name__)

os.makedirs(TEMP_DIR, exist_ok=True)


async def cmd_news(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """/news buyrug'i — so'nggi AI yangiliklar postini shaxsiy chatga yuboradi."""
    message = update.message

    await message.reply_text("📡 AI yangiliklari yuklanmoqda, iltimos kuting...")
    await context.bot.send_chat_action(
        chat_id=message.chat_id, action=ChatAction.TYPING
    )

    try:
        news_items = await fetch_all_news()
        if not news_items:
            await message.reply_text(
                "⚠️ Hozircha yangi AI yangiliklari topilmadi. Keyinroq urinib ko'ring."
            )
            return

        post_text = await generate_ai_news_post(news_items)
        await message.reply_text(post_text, parse_mode="Markdown", disable_web_page_preview=False)

        # Shaxsiy chatga ham ovozli xabar yuborish
        await context.bot.send_chat_action(
            chat_id=message.chat_id, action=ChatAction.RECORD_VOICE
        )
        audio_path = await _generate_news_audio(post_text)
        if audio_path and os.path.exists(audio_path):
            with open(audio_path, "rb") as af:
                await message.reply_voice(
                    voice=af,
                    caption="🔊 *AI Yangiliklari — Ovozli versiya*",
                    parse_mode="Markdown"
                )
            os.remove(audio_path)

    except Exception as e:
        logger.error(f"/news xatosi: {e}")
        await message.reply_text(f"❌ Yangiliklar olishda xato: {e}")


async def publish_news_to_channel(bot, channel_id: str) -> bool:
    """
    Kanalga AI yangiliklari postini VA ovozli xabarni chiqaradi.
    APScheduler tomonidan chaqiriladi.
    """
    audio_path = None
    try:
        logger.info(f"Kanal uchun yangiliklar yuklanmoqda: {channel_id}")
        news_items = await fetch_all_news()

        if not news_items:
            logger.warning("Yangiliklar topilmadi, post chiqarilmadi.")
            return False

        post_text = await generate_ai_news_post(news_items)

        # ① Matn postni yuborish
        await bot.send_message(
            chat_id=channel_id,
            text=post_text,
            parse_mode="Markdown",
            disable_web_page_preview=False
        )
        logger.info("✅ Matn post kanal ga yuborildi.")

        # ② Ovozli xabarni yaratish va kanal ga yuborish
        audio_path = await _generate_news_audio(post_text)

        if audio_path and os.path.exists(audio_path):
            with open(audio_path, "rb") as af:
                await bot.send_voice(
                    chat_id=channel_id,
                    voice=af,
                    caption=(
                        "🔊 *Yangiliklar ovozli versiyasi*\n"
                        f"📅 {datetime.now().strftime('%d.%m.%Y %H:%M')} (Toshkent)"
                    ),
                    parse_mode="Markdown"
                )
            logger.info("✅ Ovozli xabar kanal ga yuborildi.")
        else:
            logger.warning("Ovozli xabar yaratilmadi, faqat matn post chiqarildi.")

        date_str = datetime.now().strftime("%Y-%m-%d %H:%M")
        logger.info(f"✅ Kanal posti muvaffaqiyatli chiqarildi [{date_str}]")
        return True

    except Exception as e:
        logger.error(f"Kanal post xatosi: {e}")
        return False
    finally:
        if audio_path and os.path.exists(audio_path):
            try:
                os.remove(audio_path)
            except Exception:
                pass


async def _generate_news_audio(post_text: str) -> str | None:
    """
    Yangiliklar matni uchun ovozli xabar yaratadi (Muxlisa AI TTS).
    
    Muxlisa TTS uchun 1000 belgidan kam matn yuboring.
    Uzoq matnlarni qisqartirib oladi.
    """
    try:
        # Matnni TTS uchun tayyorlash
        # Markdown belgilarini tozalash va qisqartirish
        clean_text = _clean_for_tts(post_text)

        # Muxlisa TTS maksimum belgilar chegarasi (~2000 belgi)
        if len(clean_text) > 1800:
            clean_text = clean_text[:1800] + "... Batafsil ma'lumot kanal matnida."

        uid = uuid.uuid4().hex[:8]
        output_path = os.path.join(TEMP_DIR, f"news_audio_{uid}.ogg")

        if MUXLISA_API_KEY:
            audio_path = await muxlisa_tts(
                text=clean_text,
                speaker=0,  # Maftuna ayol ovozi
                output_path=output_path
            )
        else:
            # Fallback: gTTS
            audio_path = await _gtts_fallback(clean_text, output_path)

        return audio_path

    except Exception as e:
        logger.error(f"Yangiliklar audio yaratish xatosi: {e}")
        return None


def _clean_for_tts(text: str) -> str:
    """Markdown formatini TTS uchun tozalaydi."""
    import re
    # Markdown teglarini olib tashlash
    text = re.sub(r"\*\*(.*?)\*\*", r"\1", text)  # **bold**
    text = re.sub(r"\*(.*?)\*", r"\1", text)       # *italic*
    text = re.sub(r"`(.*?)`", r"\1", text)         # `code`
    text = re.sub(r"#{1,6}\s", "", text)            # ## headings
    text = re.sub(r"\[(.*?)\]\(.*?\)", r"\1", text) # [link](url)
    text = re.sub(r"https?://\S+", "", text)        # URL larni olib tashlash
    text = re.sub(r"#\w+", "", text)                # #hashtag
    text = re.sub(r"\n{3,}", "\n\n", text)          # Ko'p qatorlarni kamaytirish
    text = re.sub(r"[_~|\\]", "", text)             # Markdown maxsus belgilari
    return text.strip()
