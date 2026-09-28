"""
services/ai_service.py — Google Gemini AI integratsiyasi
"""

import asyncio
import logging
from pathlib import Path

import google.generativeai as genai
from config import GEMINI_API_KEY

logger = logging.getLogger(__name__)

# Gemini konfiguratsiyasi
genai.configure(api_key=GEMINI_API_KEY)

# Modellar
_text_model = genai.GenerativeModel("gemini-3.6-flash")
_vision_model = genai.GenerativeModel("gemini-3.6-flash")
_audio_model = genai.GenerativeModel("gemini-3.6-flash")



async def generate_text(prompt: str, system_instruction: str = "") -> str:
    """Matn generatsiya qilish."""
    try:
        full_prompt = f"{system_instruction}\n\n{prompt}" if system_instruction else prompt
        response = await asyncio.to_thread(
            _text_model.generate_content, full_prompt
        )
        return response.text.strip()
    except Exception as e:
        logger.error(f"Matn generatsiya xatosi: {e}")
        return f"AI xatosi: {e}"


async def analyze_audio_file(audio_path: str) -> str:
    """
    Ovozli faylni Gemini yordamida tahlil qiladi va matnni qaytaradi.
    Gemini 1.5 Flash multimodal audio ni to'g'ridan-to'g'ri qabul qiladi.
    """
    try:
        audio_file_path = Path(audio_path)
        
        # Faylni Gemini File API orqali yuklash
        logger.info(f"Audio fayl yuklanmoqda: {audio_path}")
        uploaded = await asyncio.to_thread(
            genai.upload_file,
            path=str(audio_file_path),
            mime_type="audio/ogg"
        )
        
        # Gemini orqali audio tahlil
        response = await asyncio.to_thread(
            _audio_model.generate_content,
            [
                uploaded,
                (
                    "Bu ovozli xabarni o'zbek, rus yoki ingliz tilida tinglab, "
                    "mazmunini to'liq tushuntirib ber. "
                    "Agar savol bo'lsa, javob ber. "
                    "Tahlilni foydalanuvchi tilidagi tilda yoz."
                ),
            ],
        )
        
        # Yuklangan faylni o'chirish
        await asyncio.to_thread(genai.delete_file, uploaded.name)
        
        return response.text.strip()
    except Exception as e:
        logger.error(f"Audio tahlil xatosi: {e}")
        return f"Ovozli xabarni tahlil qilishda xato yuz berdi: {e}"


async def generate_ai_news_post(news_items: list[dict]) -> str:
    """
    AI yangiliklar ro'yxatidan Telegram postini yaratadi.

    news_items: [{"title": "...", "summary": "...", "link": "..."}]
    """
    news_text = "\n\n".join(
        f"📰 {item.get('title', '')}\n{item.get('summary', '')}\n🔗 {item.get('link', '')}"
        for item in news_items[:5]
    )

    prompt = f"""
Siz professional AI yangiliklar tahlilchisisiz. Quyidagi xom yangiliklar asosida 
Telegram kanaliga chiqarish uchun chiroyli, qiziqarli va informativli post tayyorla.

Yangiliklar:
{news_text}

Talab qilingan format:
- Sarlavha: 🤖 AI Yangiliklari — [bugungi sana]
- Har bir yangilik uchun: emoji + qisqa tahlil (2-3 jumla)
- Oxirida: #AIYangiliklari #SuniyIntelekt #Tech
- Til: O'zbek tili (texnik atamalar inglizcha qolishi mumkin)
- Uzunlik: 300-500 so'z
"""
    return await generate_text(prompt)


async def generate_voice_response(user_message_text: str, ai_analysis: str) -> str:
    """
    Foydalanuvchining ovozli xabari tahlili asosida ovozli javob uchun matn tayyorlaydi.
    """
    prompt = f"""
Foydalanuvchi ovozli xabar yubordi. Siz uning mazmunini tushundingiz:

FOYDALANUVCHI XABARI MAZMUNI:
{ai_analysis}

Endi foydalanuvchiga do'stona, aniq va foydali javob tayyorla.
Javob ovozga aylantiriladi, shuning uchun:
- Tabiiy va qulay nutq uslubida yoz
- Qisqa va tushunarli gaplar ishlat  
- Imlo belgilari juda ko'p bo'lmasin
- 100-200 so'z

Javob tili: foydalanuvchi tili bilan bir xil bo'lsin.
"""
    return await generate_text(prompt)
