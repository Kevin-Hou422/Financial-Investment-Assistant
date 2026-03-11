import React, { useEffect, useState } from 'react';
import { reportService } from '../services/reportService';
import { formatCurrency } from '../utils/helpers';

export default function ReportExportPanel() {
  const [overview, setOverview] = useState({ total_cost: 0, total_current_value: 0, pnl_amount: 0, pnl_pct: 0 });
  const [cashflowsCount, setCashflowsCount] = useState(0);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await reportService.getPerformanceReport();
        setOverview(data.overview || overview);
        setCashflowsCount((data.cashflows || []).length);
      } catch {}
    };
    load();
  }, []);

  const csvUrl = reportService.exportCsvUrl();

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Reports &amp; Export
        </h3>
        <a href={csvUrl}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 font-semibold transition-colors">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Export CSV
        </a>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gray-700/50 rounded-xl p-3">
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Total Cost</p>
          <p className="text-base font-bold text-white">{formatCurrency(overview.total_cost)}</p>
        </div>
        <div className="bg-gray-700/50 rounded-xl p-3">
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Current Value</p>
          <p className="text-base font-bold text-indigo-400">{formatCurrency(overview.total_current_value)}</p>
        </div>
        <div className="bg-gray-700/50 rounded-xl p-3">
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Cashflow Records</p>
          <p className="text-base font-bold text-white">{cashflowsCount}</p>
        </div>
      </div>
      <p className="text-xs text-gray-500">CSV includes all asset details for use in Excel or other reporting tools.</p>
    </div>
  );
}
