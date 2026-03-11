import React, { useEffect, useState } from 'react';
import { cashflowService } from '../services/cashflowService';
import { formatCurrency } from '../utils/helpers';

const TYPES = ['Deposit', 'Withdraw', 'Dividend', 'Fee'];
const TYPE_COLORS = {
  Deposit: 'bg-emerald-500/20 text-emerald-300',
  Dividend: 'bg-emerald-500/20 text-emerald-300',
  Withdraw: 'bg-rose-500/20 text-rose-300',
  Fee: 'bg-rose-500/20 text-rose-300',
};

const inputCls = 'bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2.5 outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400/40 placeholder:text-gray-500 text-sm w-full';
const selectCls = 'bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2.5 outline-none focus:border-emerald-400 text-sm w-full';

export default function CashflowTable() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ type: 'Deposit', amount: '', date: '', note: '' });

  const load = async () => {
    const data = await cashflowService.list();
    setItems(data);
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await cashflowService.create({ ...form, amount: Number(form.amount) });
      setForm({ type: 'Deposit', amount: '', date: '', note: '' });
      load();
    } catch (error) {
      alert(error?.response?.data?.detail || error?.message || 'Failed to create cashflow.');
    }
  };

  const handleDelete = async (id) => {
    try {
      await cashflowService.remove(id);
      load();
    } catch (error) {
      alert(error?.response?.data?.detail || error?.message || 'Failed to delete cashflow.');
    }
  };

  const today = new Date().toISOString().split('T')[0];
  const totalIn = items.filter((i) => i.type === 'Deposit' || i.type === 'Dividend').reduce((s, i) => s + i.amount, 0);
  const totalOut = items.filter((i) => i.type === 'Withdraw' || i.type === 'Fee').reduce((s, i) => s + i.amount, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-white">Cashflow</h1>
        <p className="text-gray-400 text-sm mt-1">Track your capital inflows and outflows</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-gray-800 border border-gray-700 rounded-2xl p-6 space-y-4">
        <h3 className="text-white font-bold flex items-center gap-2">
          <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Record
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <select className={selectCls} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <input required type="number" step="0.01" min="0.01" placeholder="Amount"
            className={inputCls} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          <input required type="date" max={today} className={inputCls}
            value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          <input placeholder="Note (optional)" className={inputCls}
            value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
        </div>
        <div className="flex justify-end">
          <button type="submit"
            className="bg-emerald-600 text-white px-6 py-2 rounded-lg hover:bg-emerald-700 text-sm font-semibold transition-colors">
            Add
          </button>
        </div>
      </form>

      <div className="bg-gray-800 border border-gray-700 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-gray-700 flex items-center justify-between">
          <div className="flex gap-6">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-emerald-400 font-semibold text-sm">Inflow: {formatCurrency(totalIn)}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-rose-400" />
              <span className="text-rose-400 font-semibold text-sm">Outflow: {formatCurrency(totalOut)}</span>
            </div>
          </div>
          <span className={`text-sm font-bold ${totalIn - totalOut >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            Net: {formatCurrency(totalIn - totalOut)}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-700 bg-gray-800/50">
                <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Date</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Type</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Amount</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Note</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((i) => (
                <tr key={i.id} className="border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors">
                  <td className="px-4 py-3 text-gray-400 text-sm">{i.date}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${TYPE_COLORS[i.type] || 'bg-gray-700 text-gray-300'}`}>
                      {i.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-bold text-white text-sm">{formatCurrency(i.amount)}</td>
                  <td className="px-4 py-3 text-gray-400 text-sm">{i.note}</td>
                  <td className="px-4 py-3 text-right">
                    <button type="button" onClick={() => handleDelete(i.id)}
                      className="text-rose-400 hover:text-rose-300 text-xs font-semibold transition-colors">Delete</button>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan="5" className="px-4 py-10 text-center text-gray-500 text-sm">No cashflows yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
