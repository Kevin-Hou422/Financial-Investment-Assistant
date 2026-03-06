import React, { useEffect, useState } from 'react';
import { cashflowService } from '../services/cashflowService';
import { formatCurrency } from '../utils/helpers';

const TYPES = ['Deposit', 'Withdraw', 'Dividend', 'Fee'];

export default function CashflowTable() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({
    type: 'Deposit',
    amount: '',
    date: '',
    note: '',
  });

  const load = async () => {
    const data = await cashflowService.list();
    setItems(data);
  };

  useEffect(() => {
    load();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    await cashflowService.create({
      ...form,
      amount: Number(form.amount),
    });
    setForm({
      type: 'Deposit',
      amount: '',
      date: '',
      note: '',
    });
    load();
  };

  const handleDelete = async (id) => {
    await cashflowService.remove(id);
    load();
  };

  const today = new Date().toISOString().split('T')[0];

  const totalIn = items
    .filter((i) => i.type === 'Deposit' || i.type === 'Dividend')
    .reduce((s, i) => s + i.amount, 0);
  const totalOut = items
    .filter((i) => i.type === 'Withdraw' || i.type === 'Fee')
    .reduce((s, i) => s + i.amount, 0);

  return (
    <div className="space-y-4">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-4 rounded-lg shadow-sm border flex flex-col gap-3"
      >
        <h3 className="text-lg font-bold">Cashflow</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <select
            className="border p-2 rounded outline-none"
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
          >
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <input
            required
            type="number"
            step="0.01"
            min="0.01"
            placeholder="Amount"
            className="border p-2 rounded outline-none"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
          />
          <input
            required
            type="date"
            max={today}
            className="border p-2 rounded outline-none"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
          />
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
        <div className="flex justify-between mb-3 text-sm">
          <span className="text-green-600 font-semibold">
            Inflow: {formatCurrency(totalIn)}
          </span>
          <span className="text-red-600 font-semibold">
            Outflow: {formatCurrency(totalOut)}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="p-2 text-xs font-semibold text-gray-600">
                  Date
                </th>
                <th className="p-2 text-xs font-semibold text-gray-600">
                  Type
                </th>
                <th className="p-2 text-xs font-semibold text-gray-600">
                  Amount
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
                  <td className="p-2 text-sm text-gray-600">{i.date}</td>
                  <td className="p-2 text-sm">
                    <span className="px-2 py-1 text-xs rounded bg-slate-100">
                      {i.type}
                    </span>
                  </td>
                  <td className="p-2 text-sm font-semibold">
                    {formatCurrency(i.amount)}
                  </td>
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
                    colSpan="5"
                    className="p-4 text-center text-sm text-gray-500"
                  >
                    No cashflows yet.
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

