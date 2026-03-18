import { useEffect, useState } from 'react';
import { marketService } from '../services/marketService';
import { useMarketWebSocket } from '../hooks/useMarketWebSocket';

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

const inputCls = 'bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 outline-none focus:border-violet-400 text-sm';
const selectCls = 'bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 outline-none focus:border-violet-400 text-sm';

function TickerItem({ item }) {
  const pos = item.change_pct > 0;
  const neg = item.change_pct < 0;
  return (
    <div className="flex flex-col items-center bg-gray-800/60 border border-gray-700/50 rounded-xl px-3 py-2 min-w-[90px]">
      <span className="text-[10px] text-gray-500 font-medium">{item.label}</span>
      <span className="text-sm font-black text-white mt-0.5">
        {item.price < 10 ? item.price.toFixed(4) : item.price.toFixed(2)}
      </span>
      <span className={`text-[11px] font-bold ${pos ? 'text-emerald-400' : neg ? 'text-rose-400' : 'text-gray-400'}`}>
        {item.change_pct >= 0 ? '+' : ''}{item.change_pct?.toFixed(2)}%
      </span>
    </div>
  );
}

export default function MarketTickerPanel() {
  const { tickerData, connected, lastUpdate } = useMarketWebSocket();

  const [symbol, setSymbol]       = useState('AAPL');
  const [assetType, setAssetType] = useState('stock');
  const [exchange, setExchange]   = useState('US');
  const [data, setData]           = useState(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');

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

  const changePct = data?.change_pct ?? null;
  const changePctStr = changePct != null ? `${changePct >= 0 ? '+' : ''}${changePct.toFixed(2)}%` : '--';
  const changeColor = changePct > 0 ? 'text-emerald-400' : changePct < 0 ? 'text-rose-400' : 'text-gray-400';

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-2xl p-5 space-y-4">
      {/* Live market stream */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
          <span className="text-white font-bold text-sm">Live Market</span>
          <div className={`flex items-center gap-1.5 ml-auto text-xs ${connected ? 'text-emerald-400' : 'text-gray-500'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-emerald-400 animate-pulse' : 'bg-gray-600'}`} />
            {connected ? 'Live' : 'Connecting…'}
          </div>
          {lastUpdate && (
            <span className="text-[10px] text-gray-600">
              {lastUpdate.toLocaleTimeString()}
            </span>
          )}
        </div>
        {tickerData.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {tickerData.map((item) => <TickerItem key={item.symbol} item={item} />)}
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs text-gray-500 animate-pulse">
            <span className="w-2 h-2 bg-gray-600 rounded-full" />
            Waiting for market data…
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="border-t border-gray-700" />

      {/* Manual quote lookup */}
      <div className="flex flex-col md:flex-row md:items-center gap-4">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-indigo-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
          </svg>
          <span className="text-white font-bold text-sm">Quote Lookup</span>
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
            {loading ? 'Fetching…' : 'Fetch'}
          </button>
        </div>
        <div className="text-right min-w-[140px]">
          {error && <p className="text-rose-400 text-xs mb-1">{error}</p>}
          {data && !error && (
            <>
              <p className="text-gray-500 text-xs uppercase tracking-wider">{data.symbol || symbol} · {assetType}</p>
              <p className="text-2xl font-black text-white">{data.price != null ? data.price.toFixed(4) : '--'}</p>
              <p className={`text-sm font-bold ${changeColor}`}>{changePctStr}</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
