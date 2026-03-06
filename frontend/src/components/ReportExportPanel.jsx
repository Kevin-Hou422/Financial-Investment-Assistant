import React, { useEffect, useState } from 'react';
import { reportService } from '../services/reportService';
import { formatCurrency } from '../utils/helpers';

export default function ReportExportPanel() {
  const [overview, setOverview] = useState({
    total_cost: 0,
    total_current_value: 0,
    pnl_amount: 0,
    pnl_pct: 0,
  });
  const [cashflowsCount, setCashflowsCount] = useState(0);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await reportService.getPerformanceReport();
        setOverview(data.overview || overview);
        setCashflowsCount((data.cashflows || []).length);
      } catch (e) {
        // 静默失败，避免影响其它功能
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const csvUrl = reportService.exportCsvUrl();

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold">Reports &amp; Export</h3>
        <a
          href={csvUrl}
          className="inline-flex items-center px-3 py-2 text-sm rounded bg-emerald-600 text-white hover:bg-emerald-700"
        >
          Download Asset CSV
        </a>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wider">
            Total Cost
          </p>
          <p className="text-base font-semibold text-slate-800">
            {formatCurrency(overview.total_cost)}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wider">
            Current Value
          </p>
          <p className="text-base font-semibold text-slate-800">
            {formatCurrency(overview.total_current_value)}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wider">
            Cashflow Records
          </p>
          <p className="text-base font-semibold text-slate-800">
            {cashflowsCount}
          </p>
        </div>
      </div>
      <p className="text-xs text-slate-400">
        CSV 文件包含当前全部资产明细，可用于 Excel 或其他报表工具做进一步分析。
      </p>
    </div>
  );
}

