"""
handlers/file_handler.py — Faylni qabul qilish va format konvertatsiyasi
"""

import logging
import os
import uuid
from pathlib import Path

from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup, Document, PhotoSize
from telegram.ext import ContextTypes, CallbackQueryHandler
from telegram.constants import ChatAction

from config import TEMP_DIR, MAX_FILE_SIZE_BYTES, SUPPORTED_IMAGE_FORMATS, SUPPORTED_AUDIO_FORMATS, SUPPORTED_DOC_FORMATS
from services.file_converter import (
    get_file_extension, get_file_category,
    convert_image, convert_audio, convert_document
)

logger = logging.getLogger(__name__)

os.makedirs(TEMP_DIR, exist_ok=True)

# Konversiya variantlari
CONVERSION_OPTIONS = {
    "image": ["jpg", "png", "webp", "bmp", "tiff"],
    "audio": ["mp3", "ogg", "wav", "flac"],
    "document": ["txt", "pdf", "docx"],
}


async def handle_document(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """
    Foydalanuvchi yuborgan hujjat/faylni qayta ishlaydi.
    Format tanlash uchun inline tugmalar ko'rsatadi.
    """
    message = update.message
    doc: Document = message.document

    if not doc:
        return

    # Fayl hajmi tekshiruvi
    if doc.file_size and doc.file_size > MAX_FILE_SIZE_BYTES:
        await message.reply_text(
            f"⚠️ Fayl hajmi {doc.file_size // (1024*1024)} MB — ruxsat etilgan maksimal {MAX_FILE_SIZE_BYTES // (1024*1024)} MB."
        )
        return

    # Fayl kengaytmasini aniqlash
    filename = doc.file_name or f"file_{doc.file_unique_id}"
    ext = get_file_extension(filename)
    category = get_file_category(ext)

    if not category:
        await message.reply_text(
            f"❌ `{ext}` formati qo'llab-quvvatlanmaydi.\n\n"
            f"✅ Qo'llab-quvvatlanadigan formatlar:\n"
            f"🖼 Rasm: {', '.join(SUPPORTED_IMAGE_FORMATS)}\n"
            f"🎵 Audio: {', '.join(SUPPORTED_AUDIO_FORMATS)}\n"
            f"📄 Hujjat: {', '.join(SUPPORTED_DOC_FORMATS)}",
            parse_mode="Markdown"
        )
        return

    # Mavjud konversiya variantlarini filtrlash (manba formatini chiqarish)
    options = [fmt for fmt in CONVERSION_OPTIONS[category] if fmt != ext]

    # Inline klaviatura
    keyboard = [
        [InlineKeyboardButton(f"→ .{fmt.upper()}", callback_data=f"convert:{doc.file_id}:{filename}:{fmt}")]
        for fmt in options
    ]

    emoji = {"image": "🖼", "audio": "🎵", "document": "📄"}[category]

    await message.reply_text(
        f"{emoji} *{filename}* fayli qabul qilindi!\n\n"
        f"📂 Tur: `{ext.upper()}` ({category})\n\n"
        f"Qaysi formatga aylantirmoqchisiz?",
        parse_mode="Markdown",
        reply_markup=InlineKeyboardMarkup(keyboard)
    )


async def handle_photo(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """
    Telegram rasm (compressed photo) ni qayta ishlaydi.
    """
    message = update.message
    photos = message.photo

    if not photos:
        return

    # Eng yuqori sifatli rasm
    photo: PhotoSize = photos[-1]

    options = ["jpg", "png", "webp", "bmp"]
    keyboard = [
        [InlineKeyboardButton(f"→ .{fmt.upper()}", callback_data=f"convert:{photo.file_id}:photo.jpg:{fmt}")]
        for fmt in options
    ]

    await message.reply_text(
        "🖼 Rasm qabul qilindi!\n\n"
        "Qaysi formatga aylantirmoqchisiz?",
        reply_markup=InlineKeyboardMarkup(keyboard)
    )


async def handle_conversion_callback(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """
    Inline tugma bosilganda faylni konvertatsiya qiladi.
    Callback data format: convert:{file_id}:{filename}:{target_format}
    """
    query = update.callback_query
    await query.answer()

    try:
        _, file_id, filename, target_format = query.data.split(":", 3)
    except ValueError:
        await query.edit_message_text("❌ Noto'g'ri format tanlash.")
        return

    await query.edit_message_text(
        f"⏳ `{filename}` → `.{target_format.upper()}` aylantirilmoqda...",
        parse_mode="Markdown"
    )

    await context.bot.send_chat_action(
        chat_id=query.message.chat_id, action=ChatAction.UPLOAD_DOCUMENT
    )

    uid = uuid.uuid4().hex[:8]
    src_ext = get_file_extension(filename)
    input_path = os.path.join(TEMP_DIR, f"input_{uid}.{src_ext}")
    output_path = None

    try:
        # Faylni yuklab olish
        tg_file = await context.bot.get_file(file_id)
        await tg_file.download_to_drive(input_path)
        logger.info(f"Fayl yuklandi: {input_path}")

        # Kategoriya va konvertatsiya
        category = get_file_category(src_ext)

        if category == "image":
            output_path = await convert_image(input_path, target_format)
        elif category == "audio":
            output_path = await convert_audio(input_path, target_format)
        elif category == "document":
            output_path = await convert_document(input_path, target_format)
        else:
            raise ValueError(f"Noma'lum kategoriya: {category}")

        # Natijani yuborish
        out_filename = Path(filename).stem + f".{target_format}"
        with open(output_path, "rb") as f:
            await context.bot.send_document(
                chat_id=query.message.chat_id,
                document=f,
                filename=out_filename,
                caption=f"✅ `{filename}` → `{out_filename}` muvaffaqiyatli aylantiriIdi!",
                parse_mode="Markdown"
            )

        await query.edit_message_text(
            f"✅ Konvertatsiya tugadi: `{out_filename}`",
            parse_mode="Markdown"
        )
        logger.info(f"Konvertatsiya muvaffaqiyatli: {output_path}")

    except Exception as e:
        logger.error(f"Konvertatsiya xatosi: {e}")
        await query.edit_message_text(
            f"❌ Xatolik: {e}\n\nQayta urinib ko'ring."
        )
    finally:
        # Vaqtinchalik fayllarni tozalash
        for path in [input_path, output_path]:
            if path and os.path.exists(path):
                try:
                    os.remove(path)
                except Exception:
                    pass
