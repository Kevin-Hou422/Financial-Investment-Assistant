import { useState, useEffect } from 'react';
import { getAssets, deleteAsset, createAsset, updateAsset } from '../services/api';
import AssetForm from './AssetForm';
import { formatCurrency } from '../utils/helpers';

export default function AssetList() {
  const [assets, setAssets] = useState([]);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [editingAsset, setEditingAsset] = useState(null);

  const loadAssets = () => getAssets().then(res => setAssets(res.data));
  useEffect(() => { loadAssets(); }, []);

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this asset?")) {
      await deleteAsset(id);
      loadAssets();
    }
  };

  const handleSave = async (data) => {
      if (editingAsset) {
          await updateAsset(editingAsset.id, data);
          setEditingAsset(null);
      } else {
          await createAsset(data);
      }
      loadAssets();
  };

  const filteredAssets = assets
    .filter(a => a.name.toLowerCase().includes(search.toLowerCase()))
    .filter(a => filterType ? a.type === filterType : true)
    .sort((a, b) => new Date(b.buy_date) - new Date(a.buy_date)); // Sort by Date desc

  return (
    <div className="space-y-6">
      <AssetForm onSave={handleSave} initialData={editingAsset} onCancel={() => setEditingAsset(null)} />

      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <input placeholder="Search by name..." className="border p-2 rounded flex-1 outline-none focus:border-blue-500" value={search} onChange={e => setSearch(e.target.value)} />
          <select className="border p-2 rounded outline-none" value={filterType} onChange={e => setFilterType(e.target.value)}>
            <option value="">All Types</option>
            {['Stock', 'Fund', 'Crypto', 'Gold'].map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        
        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
            <thead>
                <tr className="bg-gray-50 border-b">
                <th className="p-3 text-sm font-semibold text-gray-600">Name</th>
                <th className="p-3 text-sm font-semibold text-gray-600">Type</th>
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
                    <td className="p-3"><span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">{a.type}</span></td>
                    <td className="p-3">{a.quantity}</td>
                    <td className="p-3">{formatCurrency(a.price)}</td>
                    <td className="p-3 font-semibold text-gray-700">{formatCurrency(a.total_value)}</td>
                    <td className="p-3 text-gray-500">{a.buy_date}</td>
                    <td className="p-3 text-right">
                    <button onClick={() => setEditingAsset(a)} className="text-blue-500 hover:text-blue-700 mr-4 font-medium">Edit</button>
                    <button onClick={() => handleDelete(a.id)} className="text-red-500 hover:text-red-700 font-medium">Delete</button>
                    </td>
                </tr>
                )) : (
                    <tr><td colSpan="7" className="p-6 text-center text-gray-500">No assets found.</td></tr>
                )}
            </tbody>
            </table>
        </div>
      </div>
    </div>
  );
}