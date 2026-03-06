import React, { useEffect, useState } from 'react';
import { planService } from '../services/planService';
import GoalProgressBar from './GoalProgressBar';
import { formatCurrency } from '../utils/helpers';

export default function PlanManager() {
  const [plans, setPlans] = useState([]);
  const [form, setForm] = useState({
    name: '',
    target_amount: '',
    current_amount: '',
    deadline: '',
  });

  const load = async () => {
    const data = await planService.list();
    setPlans(data);
  };

  useEffect(() => {
    load();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    await planService.create({
      ...form,
      target_amount: Number(form.target_amount),
      current_amount: Number(form.current_amount),
    });
    setForm({
      name: '',
      target_amount: '',
      current_amount: '',
      deadline: '',
    });
    load();
  };

  const handleDelete = async (id) => {
    await planService.remove(id);
    load();
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-4">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-4 rounded-lg shadow-sm border flex flex-col gap-3"
      >
        <h3 className="text-lg font-bold">Investment Goals</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input
            required
            placeholder="Goal Name"
            className="border p-2 rounded outline-none"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <input
            required
            type="number"
            step="0.01"
            min="0.01"
            placeholder="Target Amount"
            className="border p-2 rounded outline-none"
            value={form.target_amount}
            onChange={(e) =>
              setForm({ ...form, target_amount: e.target.value })
            }
          />
          <input
            required
            type="number"
            step="0.01"
            min="0"
            placeholder="Current Amount"
            className="border p-2 rounded outline-none"
            value={form.current_amount}
            onChange={(e) =>
              setForm({ ...form, current_amount: e.target.value })
            }
          />
          <input
            required
            type="date"
            min={today}
            className="border p-2 rounded outline-none"
            value={form.deadline}
            onChange={(e) => setForm({ ...form, deadline: e.target.value })}
          />
        </div>
        <div className="flex justify-end">
          <button
            type="submit"
            className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
          >
            Add Goal
          </button>
        </div>
      </form>

      <div className="space-y-4">
        {plans.map((p) => (
          <div
            key={p.id}
            className="bg-white p-4 rounded-lg shadow-sm border space-y-3"
          >
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-semibold text-slate-700">
                  {p.name}
                </p>
                <p className="text-xs text-slate-500">
                  Target:{' '}
                  <span className="font-semibold">
                    {formatCurrency(p.target_amount)}
                  </span>{' '}
                  · Current:{' '}
                  <span className="font-semibold">
                    {formatCurrency(p.current_amount)}
                  </span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleDelete(p.id)}
                className="text-red-500 hover:text-red-700 text-sm"
              >
                Delete
              </button>
            </div>
            <GoalProgressBar
              current={p.current_amount}
              target={p.target_amount}
              deadline={p.deadline}
            />
          </div>
        ))}
        {plans.length === 0 && (
          <div className="text-center text-sm text-gray-500 bg-white p-4 rounded-lg border">
            No goals yet.
          </div>
        )}
      </div>
    </div>
  );
}

