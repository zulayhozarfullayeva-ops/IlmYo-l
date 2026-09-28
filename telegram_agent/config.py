"""
config.py — Bot konfiguratsiyasi
"""

import os
from dotenv import load_dotenv

load_dotenv()

# ── Telegram ────────────────────────────────────────────────────────────────
BOT_TOKEN: str = os.getenv("BOT_TOKEN", "")
CHANNEL_ID: str = os.getenv("CHANNEL_ID", "")
ADMIN_USER_ID: int = int(os.getenv("ADMIN_USER_ID", "0"))

# ── Google Gemini ────────────────────────────────────────────────────────────
GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")

# ── Muxlisa AI (O'zbek TTS/STT) ─────────────────────────────────────────────
MUXLISA_API_KEY: str = os.getenv("MUXLISA_API_KEY", "")
MUXLISA_TTS_URL: str = "https://service.muxlisa.uz/api/v2/tts"
MUXLISA_STT_URL: str = "https://service.muxlisa.uz/api/v2/stt"
# Speaker: 0 = Ayol ovozi (Maftuna), 1 = Erkak ovozi (Asomiddin)
MUXLISA_DEFAULT_SPEAKER: int = 0


# ── Scheduler ────────────────────────────────────────────────────────────────
NEWS_POST_HOUR: int = int(os.getenv("NEWS_POST_HOUR", "9"))
NEWS_POST_MINUTE: int = int(os.getenv("NEWS_POST_MINUTE", "0"))

# ── Fayl sozlamalari ─────────────────────────────────────────────────────────
MAX_FILE_SIZE_MB: int = int(os.getenv("MAX_FILE_SIZE_MB", "50"))
MAX_FILE_SIZE_BYTES: int = MAX_FILE_SIZE_MB * 1024 * 1024

TEMP_DIR: str = "temp_files"

# ── AI Yangiliklar manbalari (RSS) ───────────────────────────────────────────
AI_NEWS_FEEDS: list[str] = [
    "https://feeds.feedburner.com/TechCrunch/",
    "https://huggingface.co/blog/feed.xml",
    "https://openai.com/blog/rss.xml",
    "https://feeds.bbci.co.uk/news/technology/rss.xml",
    "https://www.artificialintelligence-news.com/feed/",
]

# ── Qo'llab-quvvatlanadigan format konversiyalari ────────────────────────────
SUPPORTED_IMAGE_FORMATS: list[str] = ["jpg", "jpeg", "png", "webp", "bmp", "gif", "tiff"]
SUPPORTED_AUDIO_FORMATS: list[str] = ["mp3", "ogg", "wav", "m4a", "flac"]
SUPPORTED_DOC_FORMATS: list[str] = ["pdf", "docx", "txt"]

# ── Validatsiya ──────────────────────────────────────────────────────────────
def validate_config() -> bool:
    """Muhim konfiguratsiyalarni tekshiradi."""
    errors = []
    if not BOT_TOKEN:
        errors.append("BOT_TOKEN .env faylida topilmadi!")
    if not GEMINI_API_KEY:
        errors.append("GEMINI_API_KEY .env faylida topilmadi!")
    if not CHANNEL_ID:
        errors.append("CHANNEL_ID .env faylida topilmadi!")
    
    if errors:
        for err in errors:
            print(f"[XATO] {err}")
        return False
    return True
