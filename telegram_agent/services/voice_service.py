"""
services/voice_service.py — Ovozli xabar: TTS (Muxlisa AI) va yordamchi funksiyalar
"""

import asyncio
import io
import logging
import os
from pathlib import Path

import httpx
from pydub import AudioSegment

from config import (
    TEMP_DIR,
    MUXLISA_API_KEY,
    MUXLISA_TTS_URL,
    MUXLISA_STT_URL,
    MUXLISA_DEFAULT_SPEAKER,
)

logger = logging.getLogger(__name__)

os.makedirs(TEMP_DIR, exist_ok=True)


# ── TTS: Muxlisa AI (asosiy) ─────────────────────────────────────────────────

async def muxlisa_tts(
    text: str,
    speaker: int = MUXLISA_DEFAULT_SPEAKER,
    output_path: str = None,
) -> str:
    """
    Muxlisa AI TTS API orqali matnni audio (WAV) ga aylantiradi.
    
    speaker: 0 = Ayol ovozi (Maftuna), 1 = Erkak ovozi (Asomiddin)
    Qaytaradi: OGG fayl yo'lini (Telegram voice uchun)
    """
    if output_path is None:
        output_path = os.path.join(TEMP_DIR, f"tts_{id(text)}.ogg")

    wav_path = output_path.replace(".ogg", ".wav")

    try:
        logger.info(f"Muxlisa TTS: {len(text)} belgi, speaker={speaker}")

        # Muxlisa API ga JSON so'rov
        payload = {
            "text": text,
            "speaker": speaker,
        }
        headers = {
            "x-api-key": MUXLISA_API_KEY,
            "Content-Type": "application/json",
        }

        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                MUXLISA_TTS_URL,
                json=payload,
                headers=headers,
            )
            response.raise_for_status()

        # WAV ni saqlash
        with open(wav_path, "wb") as f:
            f.write(response.content)

        logger.info(f"Muxlisa TTS WAV saqlandi: {wav_path} ({len(response.content)} bytes)")

        # WAV → OGG (Telegram voice message uchun)
        await asyncio.to_thread(_wav_to_ogg, wav_path, output_path)

        # Vaqtinchalik WAV ni o'chirish
        if os.path.exists(wav_path):
            os.remove(wav_path)

        return output_path

    except httpx.HTTPStatusError as e:
        logger.error(f"Muxlisa TTS HTTP xato {e.response.status_code}: {e.response.text}")
        # Fallback: gTTS ishlatish
        logger.info("gTTS fallback ishlatilmoqda...")
        return await _gtts_fallback(text, output_path)
    except Exception as e:
        logger.error(f"Muxlisa TTS xatosi: {e}")
        return await _gtts_fallback(text, output_path)


async def muxlisa_tts_for_channel(text: str, speaker: int = MUXLISA_DEFAULT_SPEAKER) -> bytes:
    """
    Kanal uchun TTS: WAV bytes ni to'g'ridan-to'g'ri qaytaradi.
    Kanal postiga audio xabar biriktirishda ishlatiladi.
    """
    payload = {
        "text": text,
        "speaker": speaker,
    }
    headers = {
        "x-api-key": MUXLISA_API_KEY,
        "Content-Type": "application/json",
    }

    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(
            MUXLISA_TTS_URL,
            json=payload,
            headers=headers,
        )
        response.raise_for_status()

    return response.content  # WAV bytes


# ── STT: Muxlisa AI ──────────────────────────────────────────────────────────

async def muxlisa_stt(audio_path: str) -> str:
    """
    Muxlisa AI STT API orqali audio ni matnga aylantiradi.
    """
    try:
        ext = Path(audio_path).suffix.lstrip(".").lower()
        mime_map = {
            "wav": "audio/wav",
            "ogg": "audio/ogg",
            "mp3": "audio/mpeg",
            "m4a": "audio/x-m4a",
            "flac": "audio/flac",
        }
        mime_type = mime_map.get(ext, "audio/wav")

        headers = {"x-api-key": MUXLISA_API_KEY}

        with open(audio_path, "rb") as f:
            audio_bytes = f.read()

        files = {"audio": (Path(audio_path).name, audio_bytes, mime_type)}

        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                MUXLISA_STT_URL,
                headers=headers,
                files=files,
            )
            response.raise_for_status()

        data = response.json()
        # Muxlisa STT javobi: {"text": "..."}
        return data.get("text", "").strip()

    except Exception as e:
        logger.error(f"Muxlisa STT xatosi: {e}")
        return ""


# ── Audio konversiya yordamchilari ────────────────────────────────────────────

async def ogg_to_wav(ogg_path: str) -> str:
    """Telegram OGG/OPUS faylni WAV ga aylantiradi (Muxlisa STT uchun)."""
    wav_path = ogg_path.replace(".ogg", ".wav")
    await asyncio.to_thread(_convert_ogg_to_wav, ogg_path, wav_path)
    return wav_path


def _convert_ogg_to_wav(ogg_path: str, wav_path: str) -> None:
    audio = AudioSegment.from_ogg(ogg_path)
    audio = audio.set_frame_rate(16000).set_channels(1)  # Muxlisa STT uchun optimal
    audio.export(wav_path, format="wav")


def _wav_to_ogg(wav_path: str, ogg_path: str) -> None:
    """WAV → OGG/OPUS (Telegram voice message uchun)."""
    audio = AudioSegment.from_wav(wav_path)
    audio.export(ogg_path, format="ogg", codec="libopus")


async def ogg_to_mp3(ogg_path: str) -> str:
    """OGG ni MP3 ga aylantiradi."""
    mp3_path = ogg_path.replace(".ogg", ".mp3")
    await asyncio.to_thread(_convert_ogg_to_mp3, ogg_path, mp3_path)
    return mp3_path


def _convert_ogg_to_mp3(ogg_path: str, mp3_path: str) -> None:
    audio = AudioSegment.from_ogg(ogg_path)
    audio.export(mp3_path, format="mp3", bitrate="128k")


# ── gTTS Fallback ─────────────────────────────────────────────────────────────

async def _gtts_fallback(text: str, output_ogg_path: str) -> str:
    """
    Muxlisa AI ishlamasa gTTS ni ishlatadi (zaxira variant).
    """
    try:
        from gtts import gTTS

        mp3_path = output_ogg_path.replace(".ogg", "_gtts.mp3")
        lang = detect_language(text)
        lang_map = {"uz": "uz", "ru": "ru", "en": "en"}
        gtts_lang = lang_map.get(lang, "ru")

        def _synth():
            try:
                tts = gTTS(text=text, lang=gtts_lang, slow=False)
                tts.save(mp3_path)
            except Exception:
                tts = gTTS(text=text, lang="ru", slow=False)
                tts.save(mp3_path)

        await asyncio.to_thread(_synth)

        # MP3 → OGG
        def _to_ogg():
            audio = AudioSegment.from_mp3(mp3_path)
            audio.export(output_ogg_path, format="ogg", codec="libopus")

        await asyncio.to_thread(_to_ogg)

        if os.path.exists(mp3_path):
            os.remove(mp3_path)

        return output_ogg_path
    except Exception as e:
        logger.error(f"gTTS fallback ham ishlamadi: {e}")
        raise


# ── Til aniqlash ──────────────────────────────────────────────────────────────

def detect_language(text: str) -> str:
    """Matn tilini aniqlaydi: 'uz', 'ru', 'en'."""
    cyrillic_count = sum(1 for c in text if "\u0400" <= c <= "\u04ff")
    latin_count = sum(1 for c in text if c.isalpha() and c.isascii())

    if cyrillic_count > 5:
        russian_specific = sum(1 for c in text if c in "ёыэъЁЫЭЪ")
        return "ru" if russian_specific > 2 else "uz"
    elif latin_count > 5:
        return "en"
    return "uz"


# ── Text to voice (eski interfeys bilan moslik) ───────────────────────────────

async def text_to_voice(text: str, lang: str = "uz", output_path: str = None) -> str:
    """
    Asosiy TTS funksiya. Avvalo Muxlisa AI ishlatadi, xato bo'lsa gTTS.
    """
    if output_path is None:
        output_path = os.path.join(TEMP_DIR, f"tts_{id(text)}.ogg")

    if MUXLISA_API_KEY:
        speaker = MUXLISA_DEFAULT_SPEAKER
        return await muxlisa_tts(text, speaker=speaker, output_path=output_path)
    else:
        return await _gtts_fallback(text, output_path)
