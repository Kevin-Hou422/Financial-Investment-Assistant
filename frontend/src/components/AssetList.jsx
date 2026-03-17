import { useState, useEffect } from 'react';
import { getAssets, deleteAsset, createAsset, updateAsset } from '../services/api';
import AssetForm from './AssetForm';
import { formatCurrencyForExchange } from '../utils/helpers';
import { ASSET_TYPES, ASSET_TYPE_CATEGORIES } from '../utils/assetCategories';
import { invalidateDashboardCache } from '../utils/dashboardCache';

export default function AssetList() {
  const [assets, setAssets] = useState([]);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterExchange, setFilterExchange] = useState('');
  const [editingAsset, setEditingAsset] = useState(null);

  const loadAssets = () => {
    const params = {};
    if (filterType) params.type = filterType;
    if (filterExchange) params.exchange = filterExchange;
    return getAssets(params).then((res) => setAssets(res.data));
  };
  useEffect(() => {
    loadAssets();
  }, [filterType, filterExchange]);

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this asset?')) return;
    try {
      await deleteAsset(id);
      invalidateDashboardCache();
      loadAssets();
    } catch (e) {
      // Surface backend error to the user
      const message =
        e?.response?.data?.detail ||
        e?.message ||
        'Failed to delete asset. Please check backend logs.';
      alert(message);
    }
  };

  const handleSave = async (data) => {
    try {
      if (editingAsset) {
        await updateAsset(editingAsset.id, data);
        setEditingAsset(null);
      } else {
        await createAsset(data);
      }
      invalidateDashboardCache();
      loadAssets();
    } catch (e) {
      const message =
        e?.response?.data?.detail ||
        e?.message ||
        'Failed to save asset. Please check backend logs.';
      alert(message);
    }
  };

  const filteredAssets = assets
    .filter((a) => a.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => new Date(b.buy_date) - new Date(a.buy_date));

  return (
    <div className="space-y-6">
      <AssetForm onSave={handleSave} initialData={editingAsset} onCancel={() => setEditingAsset(null)} />

      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-bold mb-4">Assets by Type & Category</h3>
        <div className="flex flex-col md:flex-row gap-4 mb-6 flex-wrap">
          <input
            placeholder="Search by name..."
            className="border p-2 rounded flex-1 min-w-[180px] outline-none focus:border-indigo-500"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="border p-2 rounded outline-none min-w-[140px]"
            value={filterType}
            onChange={(e) => {
              setFilterType(e.target.value);
              setFilterExchange('');
            }}
          >
            <option value="">All Types</option>
            {ASSET_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <select
            className="border p-2 rounded outline-none min-w-[160px]"
            value={filterExchange}
            onChange={(e) => setFilterExchange(e.target.value)}
          >
            <option value="">All Categories</option>
            {(ASSET_TYPE_CATEGORIES[filterType] || []).map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        
        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
            <thead>
                <tr className="bg-gray-50 border-b">
                <th className="p-3 text-sm font-semibold text-gray-600">Name</th>
                <th className="p-3 text-sm font-semibold text-gray-600">Type</th>
                <th className="p-3 text-sm font-semibold text-gray-600">Category</th>
                <th className="p-3 text-sm font-semibold text-gray-600">Quantity</th>
                <th className="p-3 text-sm font-semibold text-gray-600">Buy Price</th>
                <th className="p-3 text-sm font-semibold text-gray-600">Total Value</th>
                <th className="p-3 text-sm font-semibold text-gray-600">Buy Date</th>
                <th className="p-3 text-sm font-semibold text-gray-600 text-right">Actions</th>
                </tr>
            </thead>
            <tbody>
                {filteredAssets.length > 0 ? filteredAssets.map(a => (
                <tr key={a.id} className="border-b hover:bg-gray-50 transition-colors">
                    <td className="p-3 font-medium">{a.name}</td>
                    <td className="p-3"><span className="bg-indigo-100 text-indigo-800 text-xs px-2 py-1 rounded">{a.type}</span></td>
                    <td className="p-3 text-sm text-slate-600">{a.exchange || '-'}</td>
                    <td className="p-3">{a.quantity}</td>
                    <td className="p-3">{formatCurrencyForExchange(a.price, a.exchange)}</td>
                    <td className="p-3 font-semibold text-gray-700">{formatCurrencyForExchange(a.total_value, a.exchange)}</td>
                    <td className="p-3 text-gray-500">{a.buy_date}</td>
                    <td className="p-3 text-right">
                    <button onClick={() => setEditingAsset(a)} className="text-blue-500 hover:text-blue-700 mr-4 font-medium">Edit</button>
                    <button onClick={() => handleDelete(a.id)} className="text-red-500 hover:text-red-700 font-medium">Delete</button>
                    </td>
                </tr>
                )) : (
                    <tr><td colSpan="8" className="p-6 text-center text-gray-500">No assets found.</td></tr>
                )}
            </tbody>
            </table>
        </div>
      </div>
    </div>
  );
}