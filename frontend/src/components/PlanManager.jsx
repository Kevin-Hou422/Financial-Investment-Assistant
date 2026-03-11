import React, { useEffect, useState } from 'react';
import { planService } from '../services/planService';
import GoalProgressBar from './GoalProgressBar';
import { formatCurrency } from '../utils/helpers';

const inputCls = 'bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2.5 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/40 placeholder:text-gray-500 text-sm w-full';

export default function PlanManager() {
  const [plans, setPlans] = useState([]);
  const [form, setForm] = useState({ name: '', target_amount: '', current_amount: '', deadline: '' });

  const load = async () => {
    const data = await planService.list();
    setPlans(data);
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await planService.create({ ...form, target_amount: Number(form.target_amount), current_amount: Number(form.current_amount) });
      setForm({ name: '', target_amount: '', current_amount: '', deadline: '' });
      load();
    } catch (error) {
      alert(error?.response?.data?.detail || error?.message || 'Failed to create goal.');
    }
  };

  const handleDelete = async (id) => {
    try { await planService.remove(id); load(); }
    catch (error) { alert(error?.response?.data?.detail || error?.message || 'Failed to delete goal.'); }
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-white">Investment Goals</h1>
        <p className="text-gray-400 text-sm mt-1">Set targets and track your progress</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-gray-800 border border-gray-700 rounded-2xl p-6 space-y-4">
        <h3 className="text-white font-bold flex items-center gap-2">
          <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Goal
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <input required placeholder="Goal Name" className={inputCls}
            value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input required type="number" step="0.01" min="0.01" placeholder="Target Amount" className={inputCls}
            value={form.target_amount} onChange={(e) => setForm({ ...form, target_amount: e.target.value })} />
          <input required type="number" step="0.01" min="0" placeholder="Current Amount" className={inputCls}
            value={form.current_amount} onChange={(e) => setForm({ ...form, current_amount: e.target.value })} />
          <input required type="date" min={today} className={inputCls}
            value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
        </div>
        <div className="flex justify-end">
          <button type="submit"
            className="bg-amber-500 text-white px-6 py-2 rounded-lg hover:bg-amber-600 text-sm font-semibold transition-colors">
            Add Goal
          </button>
        </div>
      </form>

      <div className="space-y-4">
        {plans.map((p) => (
          <div key={p.id} className="bg-gray-800 border border-gray-700 rounded-2xl p-6 space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-white font-bold text-lg">{p.name}</p>
                <div className="flex gap-4 mt-1 text-sm">
                  <span className="text-gray-400">Target: <span className="text-amber-400 font-semibold">{formatCurrency(p.target_amount)}</span></span>
                  <span className="text-gray-400">Current: <span className="text-white font-semibold">{formatCurrency(p.current_amount)}</span></span>
                </div>
              </div>
              <button type="button" onClick={() => handleDelete(p.id)}
                className="text-rose-400 hover:text-rose-300 text-sm font-semibold transition-colors flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete
              </button>
            </div>
            <GoalProgressBar current={p.current_amount} target={p.target_amount} deadline={p.deadline} />
          </div>
        ))}
        {plans.length === 0 && (
          <div className="text-center text-gray-500 text-sm bg-gray-800 border border-gray-700 rounded-2xl p-10">
            No goals yet. Add your first investment goal above.
          </div>
        )}
      </div>
    </div>
  );
}
