import { useEffect, useState } from 'react';
import { analyticsService } from '../services/analyticsService';
import { formatCurrency } from '../utils/helpers';

export default function AnalyticsPanel() {
  const [summary, setSummary] = useState({ total_value: 0, portfolio_return_pct: 0, assets: [] });

  useEffect(() => {
    const load = async () => {
      try {
        const data = await analyticsService.getSummary();
        setSummary(data);
      } catch {}
    };
    load();
  }, []);

  const retColor = summary.portfolio_return_pct > 0 ? 'text-emerald-400' :
    summary.portfolio_return_pct < 0 ? 'text-rose-400' : 'text-gray-300';

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 space-y-4">
      <h3 className="text-base font-bold text-white flex items-center gap-2">
        <svg className="w-4 h-4 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        Analytics
      </h3>
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-700/50 rounded-xl p-3">
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Total Value</p>
          <p className="text-base font-bold text-white">{formatCurrency(summary.total_value)}</p>
        </div>
        <div className="bg-gray-700/50 rounded-xl p-3">
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Portfolio Return</p>
          <p className={`text-base font-bold ${retColor}`}>{summary.portfolio_return_pct.toFixed(2)}%</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-gray-700">
              {['Asset', 'Type', 'Value', 'Return'].map((h) => (
                <th key={h} className="pb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {summary.assets.map((a) => (
              <tr key={a.id} className="border-b border-gray-700/50 hover:bg-gray-700/20 transition-colors">
                <td className="py-2.5 text-white text-sm font-medium">{a.name}</td>
                <td className="py-2.5 text-gray-500 text-xs">{a.type}</td>
                <td className="py-2.5 text-white text-sm font-semibold">{formatCurrency(a.value)}</td>
                <td className={`py-2.5 text-sm font-bold ${a.return_pct > 0 ? 'text-emerald-400' : a.return_pct < 0 ? 'text-rose-400' : 'text-gray-400'}`}>
                  {a.return_pct.toFixed(2)}%
                </td>
              </tr>
            ))}
            {summary.assets.length === 0 && (
              <tr><td colSpan="4" className="py-6 text-center text-xs text-gray-500">No analytics yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
