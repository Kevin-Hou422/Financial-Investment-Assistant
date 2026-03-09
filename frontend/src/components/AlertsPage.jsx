import { useEffect, useState } from 'react';
import { alertService } from '../services/alertService';

export default function AlertsPage() {
  const [alerts, setAlerts] = useState([]);
  const [triggered, setTriggered] = useState([]);
  const [form, setForm] = useState({
    symbol: '',
    asset_type: 'Stock',
    direction: 'above',
    target_price: '',
  });

  const load = async () => {
    const data = await alertService.list();
    setAlerts(data);
  };

  const loadTriggered = async () => {
    const data = await alertService.checkTriggered();
    setTriggered(data);
  };

  useEffect(() => {
    load();
    loadTriggered();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await alertService.add({
        ...form,
        target_price: Number(form.target_price),
      });
      setForm({
        symbol: '',
        asset_type: 'Stock',
        direction: 'above',
        target_price: '',
      });
      load();
    } catch (error) {
      const message =
        error?.response?.data?.detail ||
        error?.message ||
        'Failed to create alert.';
      alert(message);
    }
  };

  const handleDelete = async (id) => {
    try {
      await alertService.remove(id);
      load();
    } catch (error) {
      const message =
        error?.response?.data?.detail ||
        error?.message ||
        'Failed to delete alert.';
      alert(message);
    }
  };

  return (
    <div className="space-y-4">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-4 rounded-lg shadow-sm border flex flex-col gap-3"
      >
        <h3 className="text-lg font-bold">Price Alerts</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input
            required
            placeholder="Symbol"
            className="border p-2 rounded outline-none"
            value={form.symbol}
            onChange={(e) => setForm({ ...form, symbol: e.target.value })}
          />
          <select
            className="border p-2 rounded outline-none"
            value={form.asset_type}
            onChange={(e) => setForm({ ...form, asset_type: e.target.value })}
          >
            {['Stock', 'Fund', 'Crypto', 'Gold', 'Bond', 'Forex', 'Custom'].map(
              (t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ),
            )}
          </select>
          <select
            className="border p-2 rounded outline-none"
            value={form.direction}
            onChange={(e) => setForm({ ...form, direction: e.target.value })}
          >
            <option value="above">Above</option>
            <option value="below">Below</option>
          </select>
          <input
            required
            type="number"
            step="0.01"
            min="0.01"
            placeholder="Target Price"
            className="border p-2 rounded outline-none"
            value={form.target_price}
            onChange={(e) =>
              setForm({ ...form, target_price: e.target.value })
            }
          />
        </div>
        <div className="flex justify-end">
          <button
            type="submit"
            className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
          >
            Add Alert
          </button>
        </div>
      </form>

      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <div className="flex justify-between mb-3 items-center">
          <h4 className="font-semibold text-sm text-gray-700">
            Active Alerts
          </h4>
          <button
            type="button"
            onClick={loadTriggered}
            className="text-xs px-3 py-1 rounded bg-slate-100 text-slate-700 hover:bg-slate-200"
          >
            Check Triggered
          </button>
        </div>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="p-2 text-xs font-semibold text-gray-600">
                Symbol
              </th>
              <th className="p-2 text-xs font-semibold text-gray-600">
                Type
              </th>
              <th className="p-2 text-xs font-semibold text-gray-600">
                Direction
              </th>
              <th className="p-2 text-xs font-semibold text-gray-600">
                Target
              </th>
              <th className="p-2 text-xs font-semibold text-gray-600 text-right">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {alerts.map((a) => (
              <tr key={a.id} className="border-b">
                <td className="p-2 text-sm font-semibold">{a.symbol}</td>
                <td className="p-2 text-sm">{a.asset_type}</td>
                <td className="p-2 text-sm capitalize">{a.direction}</td>
                <td className="p-2 text-sm">{a.target_price}</td>
                <td className="p-2 text-right">
                  <button
                    type="button"
                    onClick={() => handleDelete(a.id)}
                    className="text-red-500 hover:text-red-700 text-sm"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {alerts.length === 0 && (
              <tr>
                <td
                  colSpan="5"
                  className="p-4 text-center text-sm text-gray-500"
                >
                  No alerts yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {triggered.length > 0 && (
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <h4 className="font-semibold text-sm text-gray-700 mb-2">
            Triggered Alerts
          </h4>
          <ul className="space-y-1 text-sm">
            {triggered.map((t) => (
              <li key={t.id} className="text-amber-700">
                {t.symbol} ({t.asset_type}) {t.direction} {t.target_price} — now{' '}
                {t.current_price}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

