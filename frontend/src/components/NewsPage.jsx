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

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-white">Market News</h1>
            {isLive && (
              <span className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/20 text-emerald-400 uppercase tracking-wide border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live
              </span>
            )}
          </div>
          <p className="text-gray-400 text-sm mt-1">Latest financial news from global markets</p>
        </div>
        <button type="button" onClick={load} disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-800 border border-gray-700 text-gray-300 hover:bg-gray-700 hover:text-white text-sm font-medium transition-all disabled:opacity-50">
          <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((n) => (
          <div key={n.id}
            className="bg-gray-800 border border-gray-700 rounded-2xl p-5 flex flex-col gap-3 hover:border-gray-600 hover:bg-gray-750 transition-all group">
            <div className="flex items-start justify-between gap-2">
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 uppercase tracking-wide flex-shrink-0">
                {n.source}
              </span>
              {n.url && (
                <a href={n.url} target="_blank" rel="noopener noreferrer"
                  className="text-gray-600 hover:text-orange-400 transition-colors flex-shrink-0">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              )}
            </div>
            {n.url ? (
              <a href={n.url} target="_blank" rel="noopener noreferrer"
                className="text-white font-semibold text-sm leading-snug group-hover:text-orange-300 transition-colors line-clamp-3">
                {n.headline}
              </a>
            ) : (
              <p className="text-white font-semibold text-sm leading-snug line-clamp-3">{n.headline}</p>
            )}
            {n.summary && (
              <p className="text-gray-400 text-xs leading-relaxed line-clamp-3">{n.summary}</p>
            )}
            {n.published_at && (
              <p className="text-gray-600 text-xs mt-auto">{n.published_at}</p>
            )}
          </div>
        ))}
      </div>

      {!loading && items.length === 0 && (
        <div className="text-center text-gray-500 bg-gray-800 border border-gray-700 rounded-2xl p-10">
          No news available. Try refreshing.
        </div>
      )}
    </div>
  );
}
