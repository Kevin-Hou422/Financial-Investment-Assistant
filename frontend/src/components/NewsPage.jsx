import { useEffect, useState } from 'react';
import { newsService } from '../services/newsService';

export default function NewsPage() {
  const [items, setItems] = useState([]);

  const load = async () => {
    const data = await newsService.list();
    setItems(data);
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold">Market News</h3>
        <button
          type="button"
          onClick={load}
          className="px-3 py-1 text-xs rounded bg-slate-100 text-slate-700 hover:bg-slate-200"
        >
          Refresh
        </button>
      </div>
      <div className="space-y-3">
        {items.map((n) => (
          <div key={n.id} className="border border-slate-100 rounded-lg p-3">
            <p className="text-sm font-semibold text-slate-800">
              {n.headline}
            </p>
            <p className="text-xs text-slate-600 mt-1">{n.summary}</p>
            <p className="text-[10px] text-slate-400 mt-2 uppercase tracking-wide">
              {n.source}
            </p>
          </div>
        ))}
        {items.length === 0 && (
          <p className="text-sm text-gray-500">No news available.</p>
        )}
      </div>
    </div>
  );
}

