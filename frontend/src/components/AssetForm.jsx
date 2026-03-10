import { useState, useEffect } from 'react';
import { ASSET_TYPES, ASSET_TYPE_CATEGORIES } from '../utils/assetCategories';

export default function AssetForm({ onSave, initialData, onCancel }) {
  const [formData, setFormData] = useState({
    name: '',
    type: 'Stock',
    exchange: 'US',
    quantity: '',
    price: '',
    buy_date: '',
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        ...initialData,
        exchange: initialData.exchange || (ASSET_TYPE_CATEGORIES[initialData.type]?.[0]?.value ?? ''),
      });
    }
  }, [initialData]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      ...formData,
      quantity: Number(formData.quantity),
      price: Number(formData.price),
    };
    if (!payload.exchange && ASSET_TYPE_CATEGORIES[formData.type]?.length) {
      payload.exchange = ASSET_TYPE_CATEGORIES[formData.type][0].value;
    }
    onSave(payload);
    if (!initialData) {
      const cats = ASSET_TYPE_CATEGORIES[formData.type];
      setFormData({
        name: '',
        type: 'Stock',
        exchange: cats?.[0]?.value ?? 'US',
        quantity: '',
        price: '',
        buy_date: '',
      });
    }
  };

  const today = new Date().toISOString().split('T')[0];
  const categories = ASSET_TYPE_CATEGORIES[formData.type] || [];

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white p-6 rounded-lg shadow-sm border mb-6 flex flex-col gap-4"
    >
      <h3 className="text-lg font-bold">
        {initialData ? 'Edit Asset' : 'Add New Asset'}
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <input
          required
          placeholder="Symbol / Name (e.g. AAPL, 0700, BTC-USD)"
          className="border p-2 rounded focus:ring focus:ring-indigo-200 outline-none"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        />
        <select
          className="border p-2 rounded outline-none"
          value={formData.type}
          onChange={(e) => {
            const t = e.target.value;
            const cats = ASSET_TYPE_CATEGORIES[t];
            setFormData({
              ...formData,
              type: t,
              exchange: cats?.[0]?.value ?? '',
            });
          }}
        >
          {ASSET_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        {categories.length > 0 && (
          <select
            className="border p-2 rounded outline-none"
            value={formData.exchange}
            onChange={(e) =>
              setFormData({ ...formData, exchange: e.target.value })
            }
          >
            {categories.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        )}
        <input
          required
          type="number"
          step="0.0001"
          min="0.0001"
          placeholder="Quantity"
          className="border p-2 rounded outline-none"
          value={formData.quantity}
          onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
        />
        <input
          required
          type="number"
          step="0.01"
          min="0.01"
          placeholder="Buy Price"
          className="border p-2 rounded outline-none"
          value={formData.price}
          onChange={(e) => setFormData({ ...formData, price: e.target.value })}
        />
        <input
          required
          type="date"
          max={today}
          className="border p-2 rounded outline-none"
          value={formData.buy_date}
          onChange={(e) =>
            setFormData({ ...formData, buy_date: e.target.value })
          }
        />
      </div>
      <div className="flex justify-end gap-2">
        {initialData && (
          <button
            type="button"
            onClick={onCancel}
            className="bg-slate-200 text-slate-700 px-4 py-2 rounded hover:bg-slate-300"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          className="bg-indigo-600 text-white px-6 py-2 rounded hover:bg-indigo-700"
        >
          {initialData ? 'Update Asset' : 'Save Asset'}
        </button>
      </div>
    </form>
  );
}
