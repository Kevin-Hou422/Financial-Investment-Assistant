import { useState, useEffect } from 'react';
import { ASSET_TYPES, ASSET_TYPE_CATEGORIES, EXCHANGE_CURRENCY } from '../utils/assetCategories';

const inputCls = 'bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2.5 outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-400/40 placeholder:text-gray-500 text-sm w-full';
const selectCls = 'bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2.5 outline-none focus:border-violet-400 text-sm w-full';

export default function AssetForm({ onSave, initialData, onCancel }) {
  const [formData, setFormData] = useState({
    name: '', type: 'Stock', exchange: 'US', quantity: '', price: '', buy_date: '',
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
    const payload = { ...formData, quantity: Number(formData.quantity), price: Number(formData.price) };
    if (!payload.exchange && ASSET_TYPE_CATEGORIES[formData.type]?.length) {
      payload.exchange = ASSET_TYPE_CATEGORIES[formData.type][0].value;
    }
    onSave(payload);
    if (!initialData) {
      const cats = ASSET_TYPE_CATEGORIES[formData.type];
      setFormData({ name: '', type: 'Stock', exchange: cats?.[0]?.value ?? 'US', quantity: '', price: '', buy_date: '' });
    }
  };

  const today = new Date().toISOString().split('T')[0];
  const categories = ASSET_TYPE_CATEGORIES[formData.type] || [];
  const currencyInfo = EXCHANGE_CURRENCY[formData.exchange] || { code: 'USD', symbol: '$', label: 'USD' };

  return (
    <form onSubmit={handleSubmit} className="bg-gray-800 border border-gray-700 rounded-2xl p-6 space-y-4">
      <h3 className="text-white font-bold text-lg">{initialData ? 'Edit Asset' : 'Add New Asset'}</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <input required placeholder="Symbol / Name (e.g. AAPL)" className={inputCls}
          value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
        <select className={selectCls} value={formData.type}
          onChange={(e) => {
            const t = e.target.value;
            const cats = ASSET_TYPE_CATEGORIES[t];
            setFormData({ ...formData, type: t, exchange: cats?.[0]?.value ?? '' });
          }}>
          {ASSET_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        {categories.length > 0 && (
          <select className={selectCls} value={formData.exchange}
            onChange={(e) => setFormData({ ...formData, exchange: e.target.value })}>
            {categories.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        )}
        <input required type="number" step="any" min="0" placeholder="Quantity"
          className={inputCls} value={formData.quantity}
          onChange={(e) => setFormData({ ...formData, quantity: e.target.value })} />
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400 pointer-events-none select-none">
            {currencyInfo.label}
          </span>
          <input required type="number" step="any" min="0"
            placeholder={`Buy Price (${currencyInfo.code})`}
            className={`${inputCls} pl-12`}
            value={formData.price}
            onChange={(e) => setFormData({ ...formData, price: e.target.value })} />
        </div>
        <input required type="date" max={today} className={inputCls}
          value={formData.buy_date} onChange={(e) => setFormData({ ...formData, buy_date: e.target.value })} />
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500 flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Price in <span className="text-gray-400 font-semibold">{currencyInfo.code}</span>
          {currencyInfo.code !== 'USD' && (
            <span className="text-gray-600">· Dashboard totals converted to USD</span>
          )}
        </span>
        <div className="flex justify-end gap-3">
          {initialData && (
            <button type="button" onClick={onCancel}
              className="px-4 py-2 rounded-lg bg-gray-700 text-gray-300 hover:bg-gray-600 text-sm font-medium transition-colors">
              Cancel
            </button>
          )}
          <button type="submit"
            className="bg-violet-600 text-white px-6 py-2 rounded-lg hover:bg-violet-700 text-sm font-semibold transition-colors">
            {initialData ? 'Update Asset' : 'Save Asset'}
          </button>
        </div>
      </div>
    </form>
  );
}
