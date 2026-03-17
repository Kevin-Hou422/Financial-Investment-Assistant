const CACHE_KEY = 'dashboard_cache_v1';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export function getDashboardCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || Date.now() - data.ts > CACHE_TTL) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

export function setDashboardCache(payload) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ...payload, ts: Date.now() }));
  } catch {}
}

export function invalidateDashboardCache() {
  localStorage.removeItem(CACHE_KEY);
}
