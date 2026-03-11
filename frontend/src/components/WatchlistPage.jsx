import { useEffect, useState } from 'react';
import { watchlistService } from '../services/watchlistService';

const inputCls = 'bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2.5 outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400/40 placeholder:text-gray-500 text-sm w-full';
const selectCls = 'bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2.5 outline-none focus:border-sky-400 text-sm w-full';

const TYPE_COLORS = {
  Stock: 'bg-violet-500/20 text-violet-300',
  Fund: 'bg-cyan-500/20 text-cyan-300',
  Crypto: 'bg-orange-500/20 text-orange-300',
  Gold: 'bg-yellow-500/20 text-yellow-300',
  Bond: 'bg-blue-500/20 text-blue-300',
  Forex: 'bg-emerald-500/20 text-emerald-300',
  Custom: 'bg-pink-500/20 text-pink-300',
};

export default function WatchlistPage() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ symbol: '', asset_type: 'Stock', note: '' });

  const load = async () => {
    const data = await watchlistService.list();
    setItems(data);
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await watchlistService.add(form);
      setForm({ symbol: '', asset_type: 'Stock', note: '' });
      load();
    } catch (error) {
      alert(error?.response?.data?.detail || error?.message || 'Failed to add watchlist item.');
    }
  };

  const handleDelete = async (id) => {
    try { await watchlistService.remove(id); load(); }
    catch (error) { alert(error?.response?.data?.detail || error?.message || 'Failed to delete watchlist item.'); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-white">Watchlist</h1>
        <p className="text-gray-400 text-sm mt-1">Monitor symbols you're interested in</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-gray-800 border border-gray-700 rounded-2xl p-6 space-y-4">
        <h3 className="text-white font-bold flex items-center gap-2">
          <svg className="w-4 h-4 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add to Watchlist
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input required placeholder="Symbol (e.g. AAPL)" className={inputCls}
            value={form.symbol} onChange={(e) => setForm({ ...form, symbol: e.target.value })} />
          <select className={selectCls} value={form.asset_type}
            onChange={(e) => setForm({ ...form, asset_type: e.target.value })}>
            {['Stock', 'Fund', 'Crypto', 'Gold', 'Bond', 'Forex', 'Custom'].map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <input placeholder="Note (optional)" className={inputCls}
            value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
        </div>
        <div className="flex justify-end">
          <button type="submit"
            className="bg-sky-600 text-white px-6 py-2 rounded-lg hover:bg-sky-700 text-sm font-semibold transition-colors">
            Add
          </button>
        </div>
      </form>

      <div className="bg-gray-800 border border-gray-700 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-700 bg-gray-800/50">
                <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Symbol</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Type</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Note</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((i) => (
                <tr key={i.id} className="border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors">
                  <td className="px-4 py-3 font-bold text-white">{i.symbol}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${TYPE_COLORS[i.asset_type] || 'bg-gray-700 text-gray-300'}`}>
                      {i.asset_type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-sm">{i.note}</td>
                  <td className="px-4 py-3 text-right">
                    <button type="button" onClick={() => handleDelete(i.id)}
                      className="text-rose-400 hover:text-rose-300 text-xs font-semibold transition-colors">Delete</button>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan="4" className="px-4 py-10 text-center text-gray-500 text-sm">No watchlist items yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
