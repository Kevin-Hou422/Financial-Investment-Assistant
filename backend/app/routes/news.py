import feedparser
from fastapi import APIRouter

router = APIRouter(prefix="/api/news", tags=["news"])

RSS_FEEDS = [
    ("Yahoo Finance", "https://finance.yahoo.com/news/rssindex"),
    ("Reuters Business", "https://feeds.reuters.com/reuters/businessNews"),
    ("MarketWatch", "https://feeds.marketwatch.com/marketwatch/topstories/"),
]

FALLBACK_ITEMS = [
    {
        "id": 1,
        "headline": "Global markets mixed as investors watch central bank signals",
        "summary": "Equities traded in a tight range while bond yields eased ahead of key inflation data.",
        "source": "MockWire",
        "url": None,
        "published_at": None,
    },
    {
        "id": 2,
        "headline": "Bitcoin consolidates near recent highs after volatility spike",
        "summary": "Crypto markets saw profit-taking following a sharp rally, with funding rates normalizing.",
        "source": "CryptoDaily",
        "url": None,
        "published_at": None,
    },
    {
        "id": 3,
        "headline": "Gold holds steady as dollar softens",
        "summary": "Precious metals remained supported by safe-haven demand and lower real yields.",
        "source": "CommoditiesNow",
        "url": None,
        "published_at": None,
    },
]


def _fetch_feed(source_name: str, url: str, limit: int = 10) -> list[dict]:
    try:
        feed = feedparser.parse(url)
        items = []
        for entry in feed.entries[:limit]:
            summary = getattr(entry, "summary", "") or ""
            if len(summary) > 300:
                summary = summary[:297] + "..."
            published = None
            if hasattr(entry, "published"):
                published = entry.published
            items.append({
                "headline": entry.get("title", ""),
                "summary": summary,
                "source": source_name,
                "url": entry.get("link", None),
                "published_at": published,
            })
        return items
    except Exception:
        return []


@router.get("")
def list_news(limit: int = 30) -> dict:
    all_items = []
    per_feed = max(5, limit // len(RSS_FEEDS))
    for source_name, url in RSS_FEEDS:
        all_items.extend(_fetch_feed(source_name, url, per_feed))

    if not all_items:
        return {"items": FALLBACK_ITEMS, "source": "fallback"}

    for i, item in enumerate(all_items):
        item["id"] = i + 1

    return {"items": all_items[:limit], "source": "live"}
