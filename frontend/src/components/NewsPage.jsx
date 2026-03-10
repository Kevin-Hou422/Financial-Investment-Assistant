import { useEffect, useState } from 'react';
import { newsService } from '../services/newsService';

export default function NewsPage() {
  const [items, setItems] = useState([]);
  const [isLive, setIsLive] = useState(false);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await newsService.listWithMeta();
      setItems(data.items || []);
      setIsLive(data.source === 'live');
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-bold">Market News</h3>
          {isLive && (
            <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-green-100 text-green-700 uppercase tracking-wide">
              Live
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="px-3 py-1 text-xs rounded bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-50"
        >
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>
      <div className="space-y-3">
        {items.map((n) => (
          <div key={n.id} className="border border-slate-100 rounded-lg p-3">
            {n.url ? (
              <a
                href={n.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-semibold text-blue-700 hover:underline"
              >
                {n.headline}
              </a>
            ) : (
              <p className="text-sm font-semibold text-slate-800">{n.headline}</p>
            )}
            {n.summary && (
              <p className="text-xs text-slate-600 mt-1">{n.summary}</p>
            )}
            <div className="flex items-center gap-3 mt-2">
              <p className="text-[10px] text-slate-400 uppercase tracking-wide">
                {n.source}
              </p>
              {n.published_at && (
                <p className="text-[10px] text-slate-400">{n.published_at}</p>
              )}
            </div>
          </div>
        ))}
        {!loading && items.length === 0 && (
          <p className="text-sm text-gray-500">No news available.</p>
        )}
      </div>
    </div>
  );
}
