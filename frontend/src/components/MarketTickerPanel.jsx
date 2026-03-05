import { useEffect, useState } from 'react';
import { marketService } from '../services/marketService';

const ASSET_TYPES = [
  { value: 'stock', label: 'Stock' },
  { value: 'fund', label: 'Fund' },
  { value: 'crypto', label: 'Crypto' },
  { value: 'gold', label: 'Gold' },
];

export default function MarketTickerPanel() {
  const [symbol, setSymbol] = useState('AAPL');
  const [assetType, setAssetType] = useState('stock');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(false);

  const fetchPrice = async () => {
    if (!symbol) return;
    try {
      setLoading(true);
      setError('');
      const res = await marketService.getPrice(symbol.trim(), assetType);
      setData(res);
    } catch (e) {
      setError('Failed to fetch market data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrice();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(fetchPrice, 30_000);
    return () => clearInterval(id);
  }, [autoRefresh, symbol, assetType]);

  const changePct =
    data && data.change_pct != null ? `${data.change_pct.toFixed(2)}%` : '--';

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <input
          className="border p-2 rounded outline-none focus:border-blue-500 w-32"
          value={symbol}
          onChange={(e) => setSymbol(e.target.value.toUpperCase())}
          placeholder="Symbol"
        />
        <select
          className="border p-2 rounded outline-none"
          value={assetType}
          onChange={(e) => setAssetType(e.target.value)}
        >
          {ASSET_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={fetchPrice}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-60"
          disabled={loading}
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
        <label className="inline-flex items-center gap-2 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={autoRefresh}
            onChange={(e) => setAutoRefresh(e.target.checked)}
          />
          Auto refresh every 30s
        </label>
      </div>

      <div className="text-right">
        {error && (
          <p className="text-sm text-red-500 mb-1">
            {error}
          </p>
        )}
        {data && !error && (
          <>
            <p className="text-xs text-gray-500 uppercase tracking-wide">
              {data.symbol || symbol} ({assetType})
            </p>
            <p className="text-2xl font-bold text-gray-900">
              {data.price != null ? data.price.toFixed(2) : '--'}
            </p>
            <p
              className={`text-sm font-semibold ${
                data.change_pct > 0
                  ? 'text-green-600'
                  : data.change_pct < 0
                  ? 'text-red-600'
                  : 'text-gray-500'
              }`}
            >
              {changePct}
            </p>
          </>
        )}
      </div>
    </div>
  );
}

