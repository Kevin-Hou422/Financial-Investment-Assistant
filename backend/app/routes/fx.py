"""
/api/fx  — exposes live FX rates to the frontend.
"""
from fastapi import APIRouter

from app.external.fx_api import get_fx_rates, get_cache_info

router = APIRouter(prefix="/api/fx", tags=["fx"])


@router.get("/rates")
def fx_rates():
    """
    Returns current FX rates (against USD) with cache metadata.
    Clients should cache for ~1 hour to avoid unnecessary calls.
    """
    rates = get_fx_rates()
    info = get_cache_info()
    return {
        "rates": rates,
        "source": info["source"],
        "cached_at": info["cached_at"],
        "age_s": info["age_s"],
        "ttl_s": info["ttl_s"],
        "currency_count": info["currency_count"],
    }
