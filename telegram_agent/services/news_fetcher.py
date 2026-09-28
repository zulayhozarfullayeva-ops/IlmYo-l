"""
services/news_fetcher.py — RSS va web manbalardan AI yangiliklar olish
"""

import asyncio
import logging
from datetime import datetime, timedelta

import feedparser
import httpx

from config import AI_NEWS_FEEDS

logger = logging.getLogger(__name__)


async def fetch_rss_feed(url: str, max_items: int = 3) -> list[dict]:
    """Bitta RSS manbadan so'nggi yangiliklar oladi."""
    try:
        async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
            resp = await client.get(url, headers={"User-Agent": "Mozilla/5.0"})
            resp.raise_for_status()

        feed = feedparser.parse(resp.text)
        items = []
        cutoff = datetime.now() - timedelta(hours=48)  # oxirgi 48 soat

        for entry in feed.entries[:max_items]:
            title = entry.get("title", "").strip()
            link = entry.get("link", "").strip()
            summary = entry.get("summary", entry.get("description", "")).strip()
            # HTML teglarni tozalash
            summary = _strip_html(summary)[:300]

            # Sana filtri
            published = entry.get("published_parsed")
            if published:
                pub_dt = datetime(*published[:6])
                if pub_dt < cutoff:
                    continue

            if title and link:
                items.append({"title": title, "summary": summary, "link": link})

        return items
    except Exception as e:
        logger.warning(f"RSS xatosi ({url}): {e}")
        return []


async def fetch_all_news() -> list[dict]:
    """Barcha RSS manbalardan parallel yangiliklar oladi."""
    tasks = [fetch_rss_feed(url) for url in AI_NEWS_FEEDS]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    all_news: list[dict] = []
    for result in results:
        if isinstance(result, list):
            all_news.extend(result)

    # Dublikatlarni olib tashlash (sarlavha bo'yicha)
    seen_titles: set[str] = set()
    unique_news: list[dict] = []
    for item in all_news:
        title_key = item["title"].lower()[:50]
        if title_key not in seen_titles:
            seen_titles.add(title_key)
            unique_news.append(item)

    logger.info(f"Jami {len(unique_news)} ta noyob yangilik topildi.")
    return unique_news[:10]  # eng ko'pi bilan 10 ta


def _strip_html(text: str) -> str:
    """Oddiy HTML teglarni matndan olib tashlaydi."""
    import re
    clean = re.sub(r"<[^>]+>", "", text)
    clean = re.sub(r"&nbsp;", " ", clean)
    clean = re.sub(r"&amp;", "&", clean)
    clean = re.sub(r"&lt;", "<", clean)
    clean = re.sub(r"&gt;", ">", clean)
    clean = re.sub(r"\s+", " ", clean)
    return clean.strip()
