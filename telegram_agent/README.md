# 🤖 Telegram AI Bot Agent

AI yangiliklari, fayl konvertatsiyasi va ovozli xabar tahlili uchun Telegram bot agenti.

## ✨ Funksiyalar

| Funksiya | Tavsif |
|----------|--------|
| 📰 **AI Yangiliklari** | Har kuni soat 09:00 da kanalga AI sohasidagi yangiliklar |
| 📁 **Fayl Konvertor** | Rasm (JPG/PNG/WEBP), Audio (MP3/OGG/WAV), Hujjat (PDF/DOCX/TXT) |
| 🎙️ **Ovozli Agent** | Ovozli xabar → AI tahlil → Ovozli javob |
| 💬 **Chat** | Oddiy matnli savollar uchun AI javob |

## 🚀 O'rnatish

### 1. Python virtual muhit

```bash
python -m venv venv
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate
```

### 2. Kutubxonalar o'rnatish

```bash
pip install -r requirements.txt
```

### 3. FFmpeg o'rnatish (audio konversiya uchun MAJBURIY)

**Windows:**
```bash
# Chocolatey orqali:
choco install ffmpeg

# Yoki https://ffmpeg.org/download.html dan yuklab, PATH ga qo'shish
```

**Linux/Mac:**
```bash
sudo apt install ffmpeg   # Ubuntu/Debian
brew install ffmpeg        # macOS
```

### 4. `.env` fayli sozlash

```bash
cp .env.example .env
```

`.env` faylini oching va to'ldiring:

```env
BOT_TOKEN=your_telegram_bot_token    # @BotFather dan
CHANNEL_ID=@your_channel             # Telegram kanal username
GEMINI_API_KEY=your_gemini_api_key   # https://aistudio.google.com/
ADMIN_USER_ID=123456789              # Sizning Telegram ID
```

> **BOT_TOKEN** olish: [@BotFather](https://t.me/BotFather) → `/newbot`  
> **GEMINI_API_KEY** olish: [Google AI Studio](https://aistudio.google.com/app/apikey)  
> **CHANNEL_ID**: Botni kanalga admin sifatida qo'shing!

### 5. Botni ishga tushirish

```bash
python main.py
```

## 📋 Bot Buyruqlari

| Buyruq | Tavsif |
|--------|--------|
| `/start` | Botni ishga tushirish va xush kelibsiz |
| `/news` | So'nggi AI yangiliklari (shaxsiy chat) |
| `/post_news` | Kanalga yangilik post chiqarish (admin) |
| `/status` | Bot va scheduler holati |
| `/help` | Yordam |

## 🗂️ Loyiha Tuzilmasi

```
telegram_agent/
├── .env                    # Maxfiy kalitlar
├── .env.example            # Namuna konfiguratsiya
├── requirements.txt        # Kutubxonalar
├── main.py                 # Bot ishga tushuruvchi
├── config.py               # Konfiguratsiya
├── handlers/
│   ├── voice_handler.py    # Ovozli xabar agent
│   ├── file_handler.py     # Fayl konvertatsiya
│   └── news_handler.py     # AI yangiliklari
├── services/
│   ├── ai_service.py       # Gemini AI
│   ├── news_fetcher.py     # RSS yangiliklar
│   ├── file_converter.py   # Format konversiya
│   └── voice_service.py    # STT + TTS
└── scheduler/
    └── daily_news.py       # Kunlik scheduler
```

## 🔧 Arxitektura

```
Foydalanuvchi
    │
    ▼
Telegram Bot API (python-telegram-bot)
    │
    ├── Ovozli xabar → [voice_service: OGG→MP3] → [ai_service: Gemini Audio] → [voice_service: TTS] → Ovozli javob
    │
    ├── Fayl yuborish → [file_handler: kategoriya aniqlash] → [Inline tugma] → [file_converter] → Konvertatsiya
    │
    ├── /news buyrug'i → [news_fetcher: RSS] → [ai_service: Post generatsiya] → Xabar
    │
    └── APScheduler (09:00 Toshkent) → [news_fetcher + ai_service] → Kanal Post
```

## ⚠️ Muhim Eslatmalar

- **FFmpeg** audio konversiya uchun tizimda o'rnatilgan bo'lishi shart
- Bot kanalda **Admin** huquqiga ega bo'lishi kerak
- Gemini API **bepul** ishlatiladi (kuniga 15 RPM limit)
- Fayl hajmi maksimum **50 MB**

## 📝 Litsenziya

MIT License
