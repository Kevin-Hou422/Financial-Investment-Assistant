import { useEffect, useState } from 'react';
import { alertService } from '../services/alertService';

const inputCls = 'bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2.5 outline-none focus:border-rose-400 focus:ring-1 focus:ring-rose-400/40 placeholder:text-gray-500 text-sm w-full';
const selectCls = 'bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2.5 outline-none focus:border-rose-400 text-sm w-full';

export default function AlertsPage() {
  const [alerts, setAlerts] = useState([]);
  const [triggered, setTriggered] = useState([]);
  const [form, setForm] = useState({ symbol: '', asset_type: 'Stock', exchange: 'US', direction: 'above', target_price: '' });

  const load = async () => { const data = await alertService.list(); setAlerts(data); };
  const loadTriggered = async () => { const data = await alertService.checkTriggered(); setTriggered(data); };

  useEffect(() => { load(); loadTriggered(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await alertService.add({ ...form, target_price: Number(form.target_price) });
      setForm({ symbol: '', asset_type: 'Stock', exchange: 'US', direction: 'above', target_price: '' });
      load();
    } catch (error) {
      alert(error?.response?.data?.detail || error?.message || 'Failed to create alert.');
    }
  };

  const handleDelete = async (id) => {
    try { await alertService.remove(id); load(); }
    catch (error) { alert(error?.response?.data?.detail || error?.message || 'Failed to delete alert.'); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-white">Price Alerts</h1>
        <p className="text-gray-400 text-sm mt-1">Get notified when prices hit your targets</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-gray-800 border border-gray-700 rounded-2xl p-6 space-y-4">
        <h3 className="text-white font-bold flex items-center gap-2">
          <svg className="w-4 h-4 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Alert
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <input required placeholder="Symbol" className={inputCls}
            value={form.symbol} onChange={(e) => setForm({ ...form, symbol: e.target.value })} />
          <select className={selectCls} value={form.asset_type}
            onChange={(e) => setForm({ ...form, asset_type: e.target.value })}>
            {['Stock', 'Fund', 'Crypto', 'Gold', 'Bond', 'Forex', 'Custom'].map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          {form.asset_type === 'Stock' && (
            <select className={selectCls} value={form.exchange}
              onChange={(e) => setForm({ ...form, exchange: e.target.value })}>
              <option value="US">US</option>
              <option value="HK">HK</option>
              <option value="AShare">A-Share</option>
            </select>
          )}
          <select className={selectCls} value={form.direction}
            onChange={(e) => setForm({ ...form, direction: e.target.value })}>
            <option value="above">Above</option>
            <option value="below">Below</option>
          </select>
          <input required type="number" step="0.01" min="0.01" placeholder="Target Price" className={inputCls}
            value={form.target_price} onChange={(e) => setForm({ ...form, target_price: e.target.value })} />
        </div>
        <div className="flex justify-end">
          <button type="submit"
            className="bg-rose-600 text-white px-6 py-2 rounded-lg hover:bg-rose-700 text-sm font-semibold transition-colors">
            Add Alert
          </button>
        </div>
      </form>

      {triggered.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4">
          <h4 className="text-amber-400 font-bold text-sm mb-3 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Triggered Alerts
          </h4>
          <ul className="space-y-1">
            {triggered.map((t) => (
              <li key={t.id} className="text-amber-300 text-sm">
                <span className="font-bold">{t.symbol}</span> ({t.asset_type}) — price{' '}
                <span className="font-bold">{t.direction}</span> {t.target_price} | now {t.current_price}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="bg-gray-800 border border-gray-700 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-gray-700 flex items-center justify-between">
          <h4 className="text-white font-semibold text-sm">Active Alerts</h4>
          <button type="button" onClick={loadTriggered}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors font-medium">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Check Triggered
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-700 bg-gray-800/50">
                {['Symbol', 'Type', 'Exchange', 'Direction', 'Target', 'Actions'].map((h, i) => (
                  <th key={h} className={`px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider${i === 5 ? ' text-right' : ''}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {alerts.map((a) => (
                <tr key={a.id} className="border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors">
                  <td className="px-4 py-3 font-bold text-white text-sm">{a.symbol}</td>
                  <td className="px-4 py-3 text-gray-300 text-sm">{a.asset_type}</td>
                  <td className="px-4 py-3 text-gray-300 text-sm">{a.exchange || '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${a.direction === 'above' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>
                      {a.direction}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-semibold text-white text-sm">{a.target_price}</td>
                  <td className="px-4 py-3 text-right">
                    <button type="button" onClick={() => handleDelete(a.id)}
                      className="text-rose-400 hover:text-rose-300 text-xs font-semibold transition-colors">Delete</button>
                  </td>
                </tr>
              ))}
              {alerts.length === 0 && (
                <tr><td colSpan="6" className="px-4 py-10 text-center text-gray-500 text-sm">No alerts yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
