import { useEffect, useState } from 'react';
import { analyticsService } from '../services/analyticsService';
import { formatCurrency } from '../utils/helpers';

export default function AnalyticsPanel() {
  const [summary, setSummary] = useState({
    total_value: 0,
    portfolio_return_pct: 0,
    assets: [],
  });

  useEffect(() => {
    const load = async () => {
      try {
        const data = await analyticsService.getSummary();
        setSummary(data);
      } catch (e) {
        // Fail silently; analytics are optional
      }
    };
    load();
  }, []);

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border space-y-4">
      <h3 className="text-lg font-bold">Analytics</h3>
      <div className="flex flex-wrap gap-6 text-sm">
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wider">
            Total Value
          </p>
          <p className="text-base font-semibold text-slate-800">
            {formatCurrency(summary.total_value)}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wider">
            Portfolio Return
          </p>
          <p
            className={`text-base font-semibold ${
              summary.portfolio_return_pct > 0
                ? 'text-green-600'
                : summary.portfolio_return_pct < 0
                ? 'text-red-600'
                : 'text-slate-700'
            }`}
          >
            {summary.portfolio_return_pct.toFixed(2)}%
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="p-2 text-xs font-semibold text-gray-600">
                Asset
              </th>
              <th className="p-2 text-xs font-semibold text-gray-600">
                Type
              </th>
              <th className="p-2 text-xs font-semibold text-gray-600">
                Value
              </th>
              <th className="p-2 text-xs font-semibold text-gray-600">
                Return
              </th>
            </tr>
          </thead>
          <tbody>
            {summary.assets.map((a) => (
              <tr key={a.id} className="border-b">
                <td className="p-2">{a.name}</td>
                <td className="p-2 text-xs text-slate-500">{a.type}</td>
                <td className="p-2 font-semibold">
                  {formatCurrency(a.value)}
                </td>
                <td
                  className={`p-2 font-semibold ${
                    a.return_pct > 0
                      ? 'text-green-600'
                      : a.return_pct < 0
                      ? 'text-red-600'
                      : 'text-slate-700'
                  }`}
                >
                  {a.return_pct.toFixed(2)}%
                </td>
              </tr>
            ))}
            {summary.assets.length === 0 && (
              <tr>
                <td
                  colSpan="4"
                  className="p-4 text-center text-xs text-gray-500"
                >
                  No analytics yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

