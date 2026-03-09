from fastapi import APIRouter


router = APIRouter(prefix="/api/news", tags=["news"])


@router.get("")
def list_news() -> dict:
    """
    Simple mocked financial news feed. In a real deployment this could
    be backed by a news API or RSS aggregator.
    """
    items = [
        {
            "id": 1,
            "headline": "Global markets mixed as investors watch central bank signals",
            "summary": "Equities traded in a tight range while bond yields eased ahead of key inflation data.",
            "source": "MockWire",
        },
        {
            "id": 2,
            "headline": "Bitcoin consolidates near recent highs after volatility spike",
            "summary": "Crypto markets saw profit-taking following a sharp rally, with funding rates normalizing.",
            "source": "CryptoDaily",
        },
        {
            "id": 3,
            "headline": "Gold holds steady as dollar softens",
            "summary": "Precious metals remained supported by safe-haven demand and lower real yields.",
            "source": "CommoditiesNow",
        },
    ]
    return {"items": items}

