/**
 * Client-side FX rate manager.
 * Fetches live rates from the backend (/api/fx/rates) with 1-hour localStorage cache.
 * Provides synchronous `getCurrentRates()` for use in rendering paths.
 */
import { FX_RATES_TO_USD as FALLBACK } from './assetCategories';

const CACHE_KEY = 'fx_rates_cache_v1';
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

// In-memory live rates (starts as fallback, updated on first successful fetch)
let _liveRates = { ...FALLBACK };

/** Synchronous read — always returns the best available rates. */
export function getCurrentRates() {
  return _liveRates;
}

/** Convert a value from a foreign currency to USD using live rates. */
export function convertToUSD(value, currencyCode = 'USD') {
  const rate = _liveRates[currencyCode] ?? 1.0;
  return value * rate;
}

/** Load persisted rates from localStorage if still fresh. */
function loadFromStorage() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return false;
    const { rates, ts } = JSON.parse(raw);
    if (!rates || Date.now() - ts > CACHE_TTL) return false;
    _liveRates = { ...FALLBACK, ...rates };
    return true;
  } catch {
    return false;
  }
}

function saveToStorage(rates) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ rates, ts: Date.now() }));
  } catch {}
}

/** Fetch fresh rates from the backend and update in-memory + localStorage cache. */
export async function refreshFxRates() {
  // Try localStorage first
  if (loadFromStorage()) return _liveRates;

  try {
    const resp = await fetch('/api/fx/rates');
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    if (data.rates && typeof data.rates === 'object') {
      _liveRates = { ...FALLBACK, ...data.rates };
      saveToStorage(_liveRates);
    }
  } catch (err) {
    console.warn('[FX] Rate refresh failed, using fallback:', err.message);
  }
  return _liveRates;
}

// Kick off a refresh immediately on module load (non-blocking)
refreshFxRates();
