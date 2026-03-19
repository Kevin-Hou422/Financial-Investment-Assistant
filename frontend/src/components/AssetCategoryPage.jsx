import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getAssets, deleteAsset, createAsset, updateAsset } from '../services/api';
import { formatCurrency, formatCurrencyForExchange, convertToUSD, getCurrencyForExchange } from '../utils/helpers';
import { ASSET_TYPE_CATEGORIES, SECTOR_CONFIG } from '../utils/assetCategories';
import { invalidateDashboardCache } from '../utils/dashboardCache';

const CURRENCY_DISPLAY_KEY = 'asset_currency_display_v1';

const inputCls = 'bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2.5 outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-400/40 placeholder:text-gray-500 w-full text-sm';
const selectCls = 'bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2.5 outline-none focus:border-violet-400 w-full text-sm';

export default function AssetCategoryPage() {
  const { type } = useParams();
  const navigate = useNavigate();
  const cfg = SECTOR_CONFIG[type] || SECTOR_CONFIG['Custom'];
  const categories = ASSET_TYPE_CATEGORIES[type] || [];

  const [assets, setAssets] = useState([]);
  const [activeExchange, setActiveExchange] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingAsset, setEditingAsset] = useState(null);
  const [search, setSearch] = useState('');
  const [showUSD, setShowUSD] = useState(() => {
    try { return localStorage.getItem(CURRENCY_DISPLAY_KEY) === 'usd'; } catch { return false; }
  });
  const [form, setForm] = useState({
    name: '',
    type,
    exchange: categories[0]?.value || '',
    quantity: '',
    price: '',
    buy_date: '',
  });

  const toggleCurrency = () => {
    setShowUSD((prev) => {
      const next = !prev;
      try { localStorage.setItem(CURRENCY_DISPLAY_KEY, next ? 'usd' : 'native'); } catch {}
      return next;
    });
  };

  const loadAssets = () => {
    const params = { type };
    if (activeExchange) params.exchange = activeExchange;
    getAssets(params).then((res) => setAssets(res.data));
  };

  useEffect(() => { loadAssets(); }, [type, activeExchange]);

  useEffect(() => {
    if (editingAsset) {
      setForm({ ...editingAsset });
      setShowForm(true);
    }
  }, [editingAsset]);

  const resetForm = () => {
    setForm({ name: '', type, exchange: categories[0]?.value || '', quantity: '', price: '', buy_date: '' });
    setEditingAsset(null);
    setShowForm(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...form, quantity: Number(form.quantity), price: Number(form.price) };
      if (editingAsset) {
        await updateAsset(editingAsset.id, payload);
      } else {
        await createAsset(payload);
      }
      invalidateDashboardCache();
      resetForm();
      loadAssets();
    } catch (err) {
      alert(err?.response?.data?.detail || err?.message || 'Save failed');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this asset?')) return;
    try {
      await deleteAsset(id);
      invalidateDashboardCache();
      loadAssets();
    } catch (err) {
      alert(err?.response?.data?.detail || err?.message || 'Delete failed');
    }
  };

  const formatValue = (value, exchange) => {
    if (showUSD) {
      return <span className="text-emerald-400">{formatCurrency(convertToUSD(value, exchange), 'USD')}</span>;
    }
    return formatCurrencyForExchange(value, exchange);
  };

  const nativeCurrencyLabel = (exchange) => {
    const { code } = getCurrencyForExchange(exchange || activeExchange || '');
    return code;
  };

  const today = new Date().toISOString().split('T')[0];
  const filtered = assets.filter((a) =>
    a.name.toLowerCase().includes(search.toLowerCase())
  );

  const currentNativeCurrency = activeExchange
    ? nativeCurrencyLabel(activeExchange)
    : categories.length === 1
    ? nativeCurrencyLabel(categories[0].value)
    : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/assets')}
          className="flex items-center gap-1.5 text-gray-400 hover:text-white text-sm font-medium transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Assets
        </button>
        <span className="text-gray-600">/</span>
        <span className={`text-sm font-semibold ${cfg.accent}`}>{type}</span>
      </div>

      <div className={`rounded-2xl p-6 bg-gradient-to-br ${cfg.gradient} border border-white/10 shadow-lg ${cfg.glow}`}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-white">{type}</h1>
            <p className="text-white/70 text-sm mt-1">{cfg.desc}</p>
          </div>
          <button
            onClick={() => { setEditingAsset(null); setShowForm(!showForm); }}
            className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white font-semibold px-4 py-2 rounded-xl transition-all text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Asset
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleSave} className="bg-gray-800 border border-gray-700 rounded-2xl p-6 space-y-4">
          <h3 className="text-white font-bold text-lg">{editingAsset ? 'Edit Asset' : 'New Asset'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-1">
              <label className="text-xs text-gray-400 mb-1 block">Symbol / Name</label>
              <input
                required
                placeholder="e.g. AAPL, 0700, BTC-USD"
                className={inputCls}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            {categories.length > 0 && (
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Category</label>
                <select
                  className={selectCls}
                  value={form.exchange}
                  onChange={(e) => setForm({ ...form, exchange: e.target.value })}
                >
                  {categories.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Quantity</label>
              <input required type="number" step="0.0001" min="0.0001" placeholder="0.00" className={inputCls}
                value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">
                Buy Price
                {form.exchange && (
                  <span className={`ml-1.5 text-xs font-semibold ${cfg.accent}`}>
                    ({getCurrencyForExchange(form.exchange).code})
                  </span>
                )}
              </label>
              <input required type="number" step="0.0001" min="0.0001" placeholder="0.00" className={inputCls}
                value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Buy Date</label>
              <input required type="date" max={today} className={inputCls}
                value={form.buy_date} onChange={(e) => setForm({ ...form, buy_date: e.target.value })} />
            </div>
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={resetForm}
              className="px-4 py-2 rounded-lg bg-gray-700 text-gray-300 hover:bg-gray-600 text-sm font-medium transition-colors">
              Cancel
            </button>
            <button type="submit"
              className={`px-6 py-2 rounded-lg ${cfg.btn} text-white text-sm font-semibold transition-colors`}>
              {editingAsset ? 'Update' : 'Save'}
            </button>
          </div>
        </form>
      )}

      <div className="bg-gray-800 border border-gray-700 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-gray-700 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setActiveExchange('')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeExchange === ''
                  ? `${cfg.tab} text-white shadow-md`
                  : 'bg-gray-700 text-gray-400 hover:bg-gray-600 hover:text-white'
              }`}
            >
              All
            </button>
            {categories.map((c) => (
              <button
                key={c.value}
                onClick={() => setActiveExchange(c.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeExchange === c.value
                    ? `${cfg.tab} text-white shadow-md`
                    : 'bg-gray-700 text-gray-400 hover:bg-gray-600 hover:text-white'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
          <div className="sm:ml-auto flex items-center gap-3">
            <button
              onClick={toggleCurrency}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all"
              style={showUSD
                ? { background: 'rgba(16,185,129,0.15)', color: '#34D399', borderColor: 'rgba(52,211,153,0.4)' }
                : { background: 'rgba(107,114,128,0.15)', color: '#9CA3AF', borderColor: 'rgba(107,114,128,0.3)' }}
              title="Toggle between native currency and USD"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
              {showUSD
                ? '$ USD'
                : currentNativeCurrency
                  ? `${currentNativeCurrency} Native`
                  : 'Native'}
            </button>
            <input
              placeholder="Search..."
              className="bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-1.5 outline-none text-xs w-48 placeholder:text-gray-500 focus:border-gray-400"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-700 bg-gray-800/50">
                <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Name</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Category</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Qty</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Buy Price
                  {!showUSD && <span className="ml-1 text-gray-600 normal-case font-normal">(native)</span>}
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Value
                  {showUSD
                    ? <span className="ml-1 text-emerald-500/70 normal-case font-normal">(USD)</span>
                    : <span className="ml-1 text-gray-600 normal-case font-normal">(native)</span>}
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Buy Date</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length > 0 ? filtered.map((a) => (
                <tr key={a.id} className="border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors">
                  <td className="px-4 py-3 font-semibold text-white text-sm">{a.name}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.badge}`}>
                      {a.exchange || '-'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-300 text-sm">{a.quantity}</td>
                  <td className="px-4 py-3 text-gray-300 text-sm">
                    {showUSD
                      ? <span className="text-emerald-400">{formatCurrency(convertToUSD(a.price, a.exchange), 'USD')}</span>
                      : formatCurrencyForExchange(a.price, a.exchange)}
                  </td>
                  <td className="px-4 py-3 font-bold text-white text-sm">
                    {formatValue(a.total_value, a.exchange)}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-sm">{a.buy_date}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => setEditingAsset(a)}
                      className="text-sky-400 hover:text-sky-300 text-xs font-semibold mr-4 transition-colors">Edit</button>
                    <button onClick={() => handleDelete(a.id)}
                      className="text-rose-400 hover:text-rose-300 text-xs font-semibold transition-colors">Delete</button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="7" className="px-4 py-10 text-center text-gray-500 text-sm">
                    No assets found. Click "Add Asset" to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
