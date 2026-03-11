import React, { useEffect, useState } from 'react';
import { notificationService } from '../services/notificationService';

const LEVEL_CONFIG = {
  success: { cls: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300', dot: 'bg-emerald-400' },
  info:    { cls: 'bg-sky-500/10 border-sky-500/30 text-sky-300', dot: 'bg-sky-400' },
  warning: { cls: 'bg-amber-500/10 border-amber-500/30 text-amber-300', dot: 'bg-amber-400' },
  danger:  { cls: 'bg-rose-500/10 border-rose-500/30 text-rose-300', dot: 'bg-rose-400' },
};

export default function NotificationPanel() {
  const [items, setItems] = useState([]);

  const load = async () => {
    const data = await notificationService.list();
    setItems(data);
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          Notifications
          {items.length > 0 && (
            <span className="bg-indigo-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
              {items.length}
            </span>
          )}
        </h3>
        <button type="button" onClick={load}
          className="px-3 py-1.5 text-xs rounded-lg bg-gray-700 text-gray-400 hover:bg-gray-600 hover:text-white transition-colors font-medium">
          Refresh
        </button>
      </div>
      {items.length === 0 && (
        <p className="text-xs text-gray-500 py-4 text-center">No notifications at the moment.</p>
      )}
      <div className="space-y-2">
        {items.map((n, idx) => {
          const cfg = LEVEL_CONFIG[n.level] || LEVEL_CONFIG.info;
          return (
            <div key={idx} className={`text-sm border rounded-xl px-3 py-2.5 flex items-start gap-2.5 ${cfg.cls}`}>
              <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${cfg.dot}`} />
              <div>
                <span className="text-[10px] uppercase tracking-wide font-bold opacity-70 mr-1">{n.type}</span>
                <span className="text-xs">{n.message}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
