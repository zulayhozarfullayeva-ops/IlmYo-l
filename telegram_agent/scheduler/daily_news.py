"""
scheduler/daily_news.py — Kunlik AI yangiliklari scheduleri
"""

import asyncio
import logging

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

from config import CHANNEL_ID, NEWS_POST_HOUR, NEWS_POST_MINUTE
from handlers.news_handler import publish_news_to_channel

logger = logging.getLogger(__name__)


def create_scheduler(bot) -> AsyncIOScheduler:
    """
    AsyncIO Scheduler yaratadi va kunlik yangiliklar jobini qo'shadi.
    
    Vaqt: NEWS_POST_HOUR:NEWS_POST_MINUTE UTC+5 (lokal vaqt)
    """
    scheduler = AsyncIOScheduler(timezone="Asia/Tashkent")

    async def _job():
        logger.info(f"📰 Kunlik yangiliklar scheduleri ishga tushdi → {CHANNEL_ID}")
        success = await publish_news_to_channel(bot, CHANNEL_ID)
        if success:
            logger.info("✅ Kunlik post muvaffaqiyatli chiqarildi.")
        else:
            logger.warning("⚠️ Kunlik post chiqarilmadi.")

    scheduler.add_job(
        _job,
        trigger=CronTrigger(
            hour=NEWS_POST_HOUR,
            minute=NEWS_POST_MINUTE,
        ),
        id="daily_ai_news",
        name="Kunlik AI Yangiliklari",
        replace_existing=True,
        misfire_grace_time=300,  # 5 daqiqa kechikish mumkin
    )

    logger.info(
        f"📅 Kunlik scheduler sozlandi: har kuni soat {NEWS_POST_HOUR:02d}:{NEWS_POST_MINUTE:02d} (Asia/Tashkent)"
    )
    return scheduler
