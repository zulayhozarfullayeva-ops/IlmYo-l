"""
services/file_converter.py — Fayl format konvertatsiyasi
"""

import asyncio
import logging
import os
from pathlib import Path

from config import SUPPORTED_IMAGE_FORMATS, SUPPORTED_AUDIO_FORMATS, SUPPORTED_DOC_FORMATS, TEMP_DIR

logger = logging.getLogger(__name__)

os.makedirs(TEMP_DIR, exist_ok=True)


def get_file_extension(filename: str) -> str:
    """Fayl kengaytmasini kichik harfda qaytaradi."""
    return Path(filename).suffix.lstrip(".").lower()


def get_file_category(ext: str) -> str | None:
    """Fayl turini qaytaradi: 'image', 'audio', 'document' yoki None."""
    if ext in SUPPORTED_IMAGE_FORMATS:
        return "image"
    if ext in SUPPORTED_AUDIO_FORMATS:
        return "audio"
    if ext in SUPPORTED_DOC_FORMATS:
        return "document"
    return None


async def convert_image(input_path: str, target_format: str) -> str:
    """
    Rasmni target_format ga aylantiradi.
    Qo'llab-quvvatlanadigan: jpg, jpeg, png, webp, bmp, gif, tiff
    """
    try:
        from PIL import Image

        target_format = target_format.lower().strip(".")
        output_path = os.path.join(
            TEMP_DIR,
            Path(input_path).stem + f"_converted.{target_format}"
        )

        def _convert():
            with Image.open(input_path) as img:
                # RGBA ni RGB ga aylantirish (JPG alpha qabul qilmaydi)
                if target_format in ("jpg", "jpeg") and img.mode in ("RGBA", "P", "LA"):
                    img = img.convert("RGB")
                # GIF animatsiyasini saqlash
                fmt_map = {"jpg": "JPEG", "jpeg": "JPEG", "tiff": "TIFF"}
                fmt = fmt_map.get(target_format, target_format.upper())
                img.save(output_path, format=fmt, optimize=True)

        await asyncio.to_thread(_convert)
        logger.info(f"Rasm konvertatsiya: {input_path} → {output_path}")
        return output_path
    except Exception as e:
        logger.error(f"Rasm konvertatsiya xatosi: {e}")
        raise ValueError(f"Rasm konvertatsiya muvaffaqiyatsiz: {e}")


async def convert_audio(input_path: str, target_format: str) -> str:
    """
    Audio faylni target_format ga aylantiradi.
    Qo'llab-quvvatlanadigan: mp3, ogg, wav, m4a, flac
    """
    try:
        from pydub import AudioSegment

        target_format = target_format.lower().strip(".")
        output_path = os.path.join(
            TEMP_DIR,
            Path(input_path).stem + f"_converted.{target_format}"
        )

        def _convert():
            # Manba formatini aniqlash
            src_ext = get_file_extension(input_path)
            if src_ext == "ogg":
                audio = AudioSegment.from_ogg(input_path)
            elif src_ext == "mp3":
                audio = AudioSegment.from_mp3(input_path)
            elif src_ext == "wav":
                audio = AudioSegment.from_wav(input_path)
            elif src_ext == "m4a":
                audio = AudioSegment.from_file(input_path, format="m4a")
            elif src_ext == "flac":
                audio = AudioSegment.from_file(input_path, format="flac")
            else:
                audio = AudioSegment.from_file(input_path)

            fmt_map = {"mp3": "mp3", "ogg": "ogg", "wav": "wav", "m4a": "mp4", "flac": "flac"}
            codec_map = {"ogg": "libopus"}
            export_fmt = fmt_map.get(target_format, target_format)
            codec = codec_map.get(target_format)

            if codec:
                audio.export(output_path, format=export_fmt, codec=codec)
            else:
                audio.export(output_path, format=export_fmt)

        await asyncio.to_thread(_convert)
        logger.info(f"Audio konvertatsiya: {input_path} → {output_path}")
        return output_path
    except Exception as e:
        logger.error(f"Audio konvertatsiya xatosi: {e}")
        raise ValueError(f"Audio konvertatsiya muvaffaqiyatsiz: {e}")


async def convert_document(input_path: str, target_format: str) -> str:
    """
    Hujjatni target_format ga aylantiradi.
    Qo'llab-quvvatlanadigan: pdf → txt, docx → txt, txt → pdf
    """
    try:
        target_format = target_format.lower().strip(".")
        src_ext = get_file_extension(input_path)
        output_path = os.path.join(
            TEMP_DIR,
            Path(input_path).stem + f"_converted.{target_format}"
        )

        # PDF → TXT
        if src_ext == "pdf" and target_format == "txt":
            await asyncio.to_thread(_pdf_to_txt, input_path, output_path)

        # DOCX → TXT
        elif src_ext == "docx" and target_format == "txt":
            await asyncio.to_thread(_docx_to_txt, input_path, output_path)

        # DOCX → PDF
        elif src_ext == "docx" and target_format == "pdf":
            await asyncio.to_thread(_docx_to_pdf, input_path, output_path)

        # TXT → PDF
        elif src_ext == "txt" and target_format == "pdf":
            await asyncio.to_thread(_txt_to_pdf, input_path, output_path)

        # PDF → DOCX
        elif src_ext == "pdf" and target_format == "docx":
            await asyncio.to_thread(_pdf_to_docx, input_path, output_path)

        else:
            raise ValueError(
                f"'{src_ext}' → '{target_format}' konvertatsiyasi qo'llab-quvvatlanmaydi."
            )

        logger.info(f"Hujjat konvertatsiya: {input_path} → {output_path}")
        return output_path
    except ValueError:
        raise
    except Exception as e:
        logger.error(f"Hujjat konvertatsiya xatosi: {e}")
        raise ValueError(f"Hujjat konvertatsiya muvaffaqiyatsiz: {e}")


# ── Sinxron yordamchi funksiyalar ─────────────────────────────────────────────

def _pdf_to_txt(input_path: str, output_path: str) -> None:
    import PyPDF2

    with open(input_path, "rb") as f:
        reader = PyPDF2.PdfReader(f)
        text = "\n\n".join(
            page.extract_text() or "" for page in reader.pages
        )
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(text)


def _docx_to_txt(input_path: str, output_path: str) -> None:
    from docx import Document

    doc = Document(input_path)
    text = "\n".join(para.text for para in doc.paragraphs)
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(text)


def _docx_to_pdf(input_path: str, output_path: str) -> None:
    """
    DOCX → PDF: reportlab + python-docx orqali sodda konversiya.
    To'liq formatlash uchun libreoffice kerak.
    """
    from docx import Document
    from reportlab.lib.pagesizes import A4
    from reportlab.pdfgen import canvas
    from reportlab.lib.units import cm

    doc = Document(input_path)
    c = canvas.Canvas(output_path, pagesize=A4)
    width, height = A4
    y = height - 2 * cm
    c.setFont("Helvetica", 11)

    for para in doc.paragraphs:
        if y < 2 * cm:
            c.showPage()
            y = height - 2 * cm
            c.setFont("Helvetica", 11)

        text = para.text.strip()
        if text:
            # Uzun matnlarni bo'lish
            words = text.split()
            line = ""
            for word in words:
                test_line = f"{line} {word}".strip()
                if c.stringWidth(test_line, "Helvetica", 11) < width - 4 * cm:
                    line = test_line
                else:
                    if y < 2 * cm:
                        c.showPage()
                        y = height - 2 * cm
                        c.setFont("Helvetica", 11)
                    c.drawString(2 * cm, y, line)
                    y -= 0.6 * cm
                    line = word
            if line:
                c.drawString(2 * cm, y, line)
                y -= 0.6 * cm
        else:
            y -= 0.4 * cm  # Bo'sh qator

    c.save()


def _txt_to_pdf(input_path: str, output_path: str) -> None:
    from reportlab.lib.pagesizes import A4
    from reportlab.pdfgen import canvas
    from reportlab.lib.units import cm

    with open(input_path, "r", encoding="utf-8", errors="ignore") as f:
        lines = f.readlines()

    c = canvas.Canvas(output_path, pagesize=A4)
    width, height = A4
    y = height - 2 * cm
    c.setFont("Helvetica", 10)

    for line in lines:
        if y < 2 * cm:
            c.showPage()
            y = height - 2 * cm
            c.setFont("Helvetica", 10)
        c.drawString(2 * cm, y, line.rstrip()[:100])
        y -= 0.5 * cm

    c.save()


def _pdf_to_docx(input_path: str, output_path: str) -> None:
    import PyPDF2
    from docx import Document

    with open(input_path, "rb") as f:
        reader = PyPDF2.PdfReader(f)
        text = "\n\n".join(
            page.extract_text() or "" for page in reader.pages
        )

    doc = Document()
    for para_text in text.split("\n\n"):
        doc.add_paragraph(para_text.strip())
    doc.save(output_path)
