"""
main.py — Telegram Bot Agent asosiy fayli

Funksiyalar:
  ✅ AI yangiliklari (kunlik kanal post + /news buyrug'i)
  ✅ Fayl konvertatsiya (rasm, audio, hujjat)
  ✅ Ovozli xabar tahlili va ovozli javob

Ishga tushirish:
  python main.py
"""

import asyncio
import logging
import os
import sys
from datetime import datetime

from telegram import (
    Update,
    BotCommand,
)
from telegram.request import HTTPXRequest

from telegram.ext import (
    Application,
    CommandHandler,
    MessageHandler,
    CallbackQueryHandler,
    filters,
)

from config import BOT_TOKEN, CHANNEL_ID, validate_config, TEMP_DIR
from handlers.voice_handler import handle_voice
from handlers.file_handler import handle_document, handle_photo, handle_conversion_callback
from handlers.news_handler import cmd_news, publish_news_to_channel
from scheduler.daily_news import create_scheduler

# ── Logging sozlash ──────────────────────────────────────────────────────────
import io

# Windows CP1251 konsolida emoji uchun UTF-8 stream
_stdout_utf8 = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[
        logging.StreamHandler(_stdout_utf8),
        logging.FileHandler("bot.log", encoding="utf-8"),
    ],
)

logger = logging.getLogger(__name__)

# Vaqtinchalik papka yaratish
os.makedirs(TEMP_DIR, exist_ok=True)


# ── Buyruqlar ────────────────────────────────────────────────────────────────

async def cmd_start(update: Update, context) -> None:
    """/start buyrug'i."""
    user = update.effective_user
    await update.message.reply_text(
        f"🤖 Salom, *{user.first_name}*!\n\n"
        "Men AI-agent botman. Quyidagi imkoniyatlarim bor:\n\n"
        "📰 *AI Yangiliklari*\n"
        "   └ Har kuni ertalab kanalga AI yangiliklari postini chiqaraman\n"
        "   └ /news — hoziroq yangiliklar olish\n\n"
        "📁 *Fayl Konvertatsiya*\n"
        "   └ Rasm: JPG ↔ PNG ↔ WEBP ↔ BMP ↔ TIFF\n"
        "   └ Audio: MP3 ↔ OGG ↔ WAV ↔ FLAC\n"
        "   └ Hujjat: PDF ↔ DOCX ↔ TXT\n"
        "   └ Faylni yuboring va format tanlang!\n\n"
        "🎙️ *Ovozli Xabar*\n"
        "   └ Ovozli xabar yuboring → AI tushunadi → Ovozli javob qaytaradi\n\n"
        "Qo'shimcha ma'lumot: /help",
        parse_mode="Markdown"
    )


async def cmd_help(update: Update, context) -> None:
    """/help buyrug'i."""
    await update.message.reply_text(
        "📚 *Yordam*\n\n"
        "*Buyruqlar:*\n"
        "/start — Botni ishga tushirish\n"
        "/news — So'nggi AI yangiliklari\n"
        "/post_news — Kanalga yangilik post chiqarish (admin)\n"
        "/status — Bot holati\n"
        "/help — Ushbu yordam xabari\n\n"
        "*Fayl yuborish:*\n"
        "Istalgan faylni yuboring va bot avtomatik format tanlash tugmalarini ko'rsatadi.\n\n"
        "*Ovozli xabar:*\n"
        "Ovozli xabar yuboring → AI uni tushunib ovozli javob beradi.\n\n"
        "*Qo'llab-quvvatlanadigan formatlar:*\n"
        "🖼 JPG, PNG, WEBP, BMP, GIF, TIFF\n"
        "🎵 MP3, OGG, WAV, M4A, FLAC\n"
        "📄 PDF, DOCX, TXT",
        parse_mode="Markdown"
    )


async def cmd_status(update: Update, context) -> None:
    """/status buyrug'i — bot holati."""
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    scheduler = context.bot_data.get("scheduler")
    jobs_info = ""
    if scheduler:
        for job in scheduler.get_jobs():
            next_run = job.next_run_time
            jobs_info += f"\n  ⏰ {job.name}: {next_run.strftime('%Y-%m-%d %H:%M') if next_run else 'N/A'}"

    no_jobs_text = " Yo\u2019q"
    await update.message.reply_text(
        f"✅ *Bot faol*\n\n"
        f"🕐 Hozirgi vaqt: `{now}`\n"
        f"📢 Kanal: `{CHANNEL_ID}`\n"
        f"📅 Rejalashtirilgan joblar:{jobs_info or no_jobs_text}",
        parse_mode="Markdown"
    )


async def cmd_post_news(update: Update, context) -> None:
    """/post_news — Admin uchun: kanalga yangilik porti chiqarish."""
    from config import ADMIN_USER_ID
    user_id = update.effective_user.id

    if ADMIN_USER_ID and user_id != ADMIN_USER_ID:
        await update.message.reply_text("🚫 Bu buyruq faqat admin uchun.")
        return

    await update.message.reply_text("📡 Yangilik yuklanmoqda va kanalga yuboriLmoqda...")
    success = await publish_news_to_channel(context.bot, CHANNEL_ID)

    if success:
        await update.message.reply_text(f"✅ Post muvaffaqiyatli `{CHANNEL_ID}` kanaliga chiqarildi!", parse_mode="Markdown")
    else:
        await update.message.reply_text("❌ Post chiqarishda xatolik yuz berdi.")


async def handle_text(update: Update, context) -> None:
    """Oddiy matnli xabarlar uchun umumiy javob."""
    text = update.message.text or ""
    if len(text) < 3:
        return

    from services.ai_service import generate_text
    await update.message.reply_text("🤔 O'ylamoqda...")
    response = await generate_text(
        prompt=text,
        system_instruction=(
            "Siz yordamchi AI agentsiz. Foydalanuvchi savollariga qisqa, "
            "aniq va foydali javoblar ber. O'zbek tilida yozing."
        )
    )
    await update.message.reply_text(response)


# ── Asosiy funksiya ───────────────────────────────────────────────────────────

async def post_init(application: Application) -> None:
    """Bot ishga tushgandan keyin scheduler va buyruqlarni sozlash."""
    bot = application.bot

    # Bot buyruqlarini sozlash
    await bot.set_my_commands([
        BotCommand("start", "Botni ishga tushirish"),
        BotCommand("news", "So'nggi AI yangiliklari"),
        BotCommand("post_news", "Kanalga yangilik chiqarish (admin)"),
        BotCommand("status", "Bot holati"),
        BotCommand("help", "Yordam"),
    ])

    # Scheduler yaratish va ishga tushirish
    scheduler = create_scheduler(bot)
    scheduler.start()
    application.bot_data["scheduler"] = scheduler
    logger.info("✅ Scheduler ishga tushdi.")


async def post_shutdown(application: Application) -> None:
    """Bot to'xtaganda schedulerni to'xtatish."""
    scheduler = application.bot_data.get("scheduler")
    if scheduler and scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("Scheduler to'xtatildi.")


def main() -> None:
    """Bot agent ishga tushirish."""
    # Konfiguratsiya tekshiruvi
    if not validate_config():
        logger.error("Konfiguratsiya xatosi! .env faylini tekshiring.")
        sys.exit(1)

    logger.info("🚀 Telegram Bot Agent ishga tushmoqda...")

    # Application yaratish (tarmoq uzilishlariga chidamli timeoutlar bilan)
    req = HTTPXRequest(
        connect_timeout=30.0,
        read_timeout=30.0,
        write_timeout=30.0,
        pool_timeout=30.0,
    )
    app = (
        Application.builder()
        .token(BOT_TOKEN)
        .request(req)
        .post_init(post_init)
        .post_shutdown(post_shutdown)
        .build()
    )

    # ── Buyruq handlerlari ───────────────────────────────────────────────────
    app.add_handler(CommandHandler("start", cmd_start))
    app.add_handler(CommandHandler("help", cmd_help))
    app.add_handler(CommandHandler("news", cmd_news))
    app.add_handler(CommandHandler("post_news", cmd_post_news))
    app.add_handler(CommandHandler("status", cmd_status))

    # ── Ovozli xabar ────────────────────────────────────────────────────────
    app.add_handler(MessageHandler(filters.VOICE, handle_voice))

    # ── Fayl va rasm handlerlari ─────────────────────────────────────────────
    app.add_handler(MessageHandler(filters.Document.ALL, handle_document))
    app.add_handler(MessageHandler(filters.PHOTO, handle_photo))

    # ── Inline tugma callbacklari ────────────────────────────────────────────
    app.add_handler(CallbackQueryHandler(handle_conversion_callback, pattern=r"^convert:"))

    # ── Matnli xabarlar ──────────────────────────────────────────────────────
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_text))

    # ── Botni ishga tushirish ────────────────────────────────────────────────
    logger.info("✅ Barcha handlerlar ulandi. Polling boshlandi...")
    app.run_polling(
        allowed_updates=Update.ALL_TYPES,
        drop_pending_updates=True,
    )


if __name__ == "__main__":
    main()
