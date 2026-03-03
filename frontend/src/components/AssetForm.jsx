import { useState, useEffect } from 'react';

export default function AssetForm({ onSave, initialData, onCancel }) {
  const [formData, setFormData] = useState({ 
      name: '', type: 'Stock', quantity: '', price: '', buy_date: '' 
  });

  useEffect(() => {
      if (initialData) setFormData(initialData);
  }, [initialData]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
        ...formData, 
        quantity: Number(formData.quantity), 
        price: Number(formData.price)
    });
    if (!initialData) {
        setFormData({ name: '', type: 'Stock', quantity: '', price: '', buy_date: '' });
    }
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-sm border mb-6 flex flex-col gap-4">
      <h3 className="text-lg font-bold">{initialData ? 'Edit Asset' : 'Add New Asset'}</h3>
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <input required placeholder="Asset Name" className="border p-2 rounded focus:ring focus:ring-blue-200 outline-none" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
        <select className="border p-2 rounded outline-none" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
          {['Stock', 'Fund', 'Crypto', 'Gold'].map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <input required type="number" step="0.0001" min="0.0001" placeholder="Quantity" className="border p-2 rounded outline-none" value={formData.quantity} onChange={e => setFormData({...formData, quantity: e.target.value})} />
        <input required type="number" step="0.01" min="0.01" placeholder="Buy Price" className="border p-2 rounded outline-none" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} />
        <input required type="date" max={today} className="border p-2 rounded outline-none" value={formData.buy_date} onChange={e => setFormData({...formData, buy_date: e.target.value})} />
      </div>
      <div className="flex justify-end gap-2">
        {initialData && <button type="button" onClick={onCancel} className="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300">Cancel</button>}
        <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700">{initialData ? 'Update Asset' : 'Save Asset'}</button>
      </div>
    </form>
  );
}