import React, { useEffect, useState } from 'react';
import { notificationService } from '../services/notificationService';

const LEVEL_COLORS = {
  success: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  info: 'bg-sky-50 text-sky-800 border-sky-200',
  warning: 'bg-amber-50 text-amber-800 border-amber-200',
  danger: 'bg-rose-50 text-rose-800 border-rose-200',
};

export default function NotificationPanel() {
  const [items, setItems] = useState([]);

  const load = async () => {
    const data = await notificationService.list();
    setItems(data);
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold">Notifications</h3>
        <button
          type="button"
          onClick={load}
          className="px-3 py-1 text-xs rounded bg-slate-100 text-slate-700 hover:bg-slate-200"
        >
          Refresh
        </button>
      </div>
      {items.length === 0 && (
        <p className="text-xs text-slate-400">No notifications at the moment.</p>
      )}
      <div className="space-y-2">
        {items.map((n, idx) => {
          const levelClass = LEVEL_COLORS[n.level] || LEVEL_COLORS.info;
          return (
            <div
              key={idx}
              className={`text-sm border rounded-md px-3 py-2 flex items-start gap-2 ${levelClass}`}
            >
              <span className="text-[10px] uppercase tracking-wide font-semibold">
                {n.type}
              </span>
              <span>{n.message}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

