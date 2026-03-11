import { useEffect, useState } from 'react';
import { marketService } from '../services/marketService';

const ASSET_TYPES = [
  { value: 'stock', label: 'Stock' },
  { value: 'fund', label: 'Fund' },
  { value: 'crypto', label: 'Crypto' },
  { value: 'gold', label: 'Gold' },
];

const STOCK_EXCHANGES = [
  { value: 'US', label: 'US' },
  { value: 'HK', label: 'HK' },
  { value: 'AShare', label: 'A-Share' },
];

const inputCls = 'bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 outline-none focus:border-indigo-400 text-sm';
const selectCls = 'bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 outline-none focus:border-indigo-400 text-sm';

export default function MarketTickerPanel() {
  const [symbol, setSymbol] = useState('AAPL');
  const [assetType, setAssetType] = useState('stock');
  const [exchange, setExchange] = useState('US');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(false);

  const fetchPrice = async () => {
    if (!symbol) return;
    try {
      setLoading(true);
      setError('');
      const ex = assetType === 'stock' ? exchange : null;
      const res = await marketService.getPrice(symbol.trim(), assetType, ex);
      setData(res);
    } catch {
      setError('Failed to fetch market data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPrice(); }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(fetchPrice, 30_000);
    return () => clearInterval(id);
  }, [autoRefresh, symbol, assetType, exchange]);

  const changePct = data && data.change_pct != null ? data.change_pct : null;
  const changePctStr = changePct != null ? `${changePct >= 0 ? '+' : ''}${changePct.toFixed(2)}%` : '--';
  const changeColor = changePct > 0 ? 'text-emerald-400' : changePct < 0 ? 'text-rose-400' : 'text-gray-400';

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-2xl p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-5">
      <div className="flex items-center gap-2">
        <svg className="w-5 h-5 text-indigo-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
        </svg>
        <span className="text-white font-bold text-sm">Live Quote</span>
      </div>

      <div className="flex flex-wrap items-center gap-3 flex-1">
        <input className={`${inputCls} w-28`} value={symbol}
          onChange={(e) => setSymbol(e.target.value.toUpperCase())} placeholder="Symbol" />
        <select className={selectCls} value={assetType} onChange={(e) => setAssetType(e.target.value)}>
          {ASSET_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        {assetType === 'stock' && (
          <select className={selectCls} value={exchange} onChange={(e) => setExchange(e.target.value)}>
            {STOCK_EXCHANGES.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
        )}
        <button type="button" onClick={fetchPrice} disabled={loading}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-60 text-sm font-semibold transition-colors">
          {loading ? 'Fetching...' : 'Fetch'}
        </button>
        <label className="inline-flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
          <input type="checkbox" className="accent-indigo-500"
            checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} />
          Auto 30s
        </label>
      </div>

      <div className="text-right min-w-[140px]">
        {error && <p className="text-rose-400 text-xs mb-1">{error}</p>}
        {data && !error && (
          <>
            <p className="text-gray-500 text-xs uppercase tracking-wider">{data.symbol || symbol} · {assetType}</p>
            <p className="text-2xl font-black text-white">{data.price != null ? data.price.toFixed(2) : '--'}</p>
            <p className={`text-sm font-bold ${changeColor}`}>{changePctStr}</p>
          </>
        )}
      </div>
    </div>
  );
}
