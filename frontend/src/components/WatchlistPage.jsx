import { useEffect, useState } from 'react';
import { watchlistService } from '../services/watchlistService';

export default function WatchlistPage() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({
    symbol: '',
    asset_type: 'Stock',
    note: '',
  });

  const load = async () => {
    const data = await watchlistService.list();
    setItems(data);
  };

  useEffect(() => {
    load();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await watchlistService.add(form);
      setForm({ symbol: '', asset_type: 'Stock', note: '' });
      load();
    } catch (error) {
      const message =
        error?.response?.data?.detail ||
        error?.message ||
        'Failed to add watchlist item.';
      alert(message);
    }
  };

  const handleDelete = async (id) => {
    try {
      await watchlistService.remove(id);
      load();
    } catch (error) {
      const message =
        error?.response?.data?.detail ||
        error?.message ||
        'Failed to delete watchlist item.';
      alert(message);
    }
  };

  return (
    <div className="space-y-4">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-4 rounded-lg shadow-sm border flex flex-col gap-3"
      >
        <h3 className="text-lg font-bold">Watchlist</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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
          <input
            placeholder="Note"
            className="border p-2 rounded outline-none"
            value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
          />
        </div>
        <div className="flex justify-end">
          <button
            type="submit"
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Add
          </button>
        </div>
      </form>

      <div className="bg-white p-4 rounded-lg shadow-sm border">
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
                Note
              </th>
              <th className="p-2 text-xs font-semibold text-gray-600 text-right">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((i) => (
              <tr key={i.id} className="border-b">
                <td className="p-2 text-sm font-semibold">{i.symbol}</td>
                <td className="p-2 text-sm">{i.asset_type}</td>
                <td className="p-2 text-sm text-gray-500">{i.note}</td>
                <td className="p-2 text-right">
                  <button
                    type="button"
                    onClick={() => handleDelete(i.id)}
                    className="text-red-500 hover:text-red-700 text-sm"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td
                  colSpan="4"
                  className="p-4 text-center text-sm text-gray-500"
                >
                  No watchlist items yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

