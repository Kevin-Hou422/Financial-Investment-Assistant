import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { getAssets } from '../services/api';
import { formatCurrency } from '../utils/helpers';
import { getDashboardCache, setDashboardCache } from '../utils/dashboardCache';
import PlaceholderChart from './PlaceholderChart';
import MarketTickerPanel from './MarketTickerPanel';
import RiskAnalysisPanel from './RiskAnalysisPanel';
import { riskService } from '../services/riskService';
import PortfolioConcentrationPanel from './PortfolioConcentrationPanel';
import NotificationPanel from './NotificationPanel';
import ReportExportPanel from './ReportExportPanel';
import AnalyticsPanel from './AnalyticsPanel';

const COLORS = ['#8B5CF6', '#06B6D4', '#F97316', '#F59E0B', '#3B82F6', '#10B981', '#EC4899'];

const cardCls = 'bg-gray-800 border border-gray-700 rounded-2xl p-6';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm shadow-xl">
        <p className="text-gray-400 text-xs mb-1">{label || payload[0].name}</p>
        <p className="text-white font-bold">{formatCurrency(payload[0].value)}</p>
      </div>
    );
  }
  return null;
};

export default function Dashboard() {
  const [assets, setAssets] = useState([]);
  const [overview, setOverview] = useState({ total_cost: 0, total_current_value: 0, pnl_amount: 0, pnl_pct: 0 });
  const [risk, setRisk] = useState({ volatility: 0, max_drawdown: 0 });

  useEffect(() => {
    const cached = getDashboardCache();
    if (cached) {
      if (cached.assets)   setAssets(cached.assets);
      if (cached.overview) setOverview(cached.overview);
      if (cached.risk)     setRisk(cached.risk);
      return;
    }

    const fetchAll = async () => {
      const results = await Promise.allSettled([
        getAssets(),
        (async () => { const { default: api } = await import('../services/api'); return api.get('/portfolio/summary'); })(),
        (async () => riskService.getMetrics())(),
      ]);

      const newAssets   = results[0].status === 'fulfilled' ? results[0].value.data : [];
      const newOverview = results[1].status === 'fulfilled' ? results[1].value.data : { total_cost: 0, total_current_value: 0, pnl_amount: 0, pnl_pct: 0 };
      const newRisk     = results[2].status === 'fulfilled'
        ? { volatility: results[2].value.volatility || 0, max_drawdown: results[2].value.max_drawdown || 0 }
        : { volatility: 0, max_drawdown: 0 };

      setAssets(newAssets);
      setOverview(newOverview);
      setRisk(newRisk);
      setDashboardCache({ assets: newAssets, overview: newOverview, risk: newRisk });
    };

    fetchAll();
  }, []);

  const typeData = assets.reduce((acc, curr) => {
    const found = acc.find((i) => i.name === curr.type);
    if (found) found.value += curr.total_value;
    else acc.push({ name: curr.type, value: curr.total_value });
    return acc;
  }, []);

  const pnlColor = overview.pnl_amount > 0 ? 'text-emerald-400' : overview.pnl_amount < 0 ? 'text-rose-400' : 'text-gray-300';

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className={`${cardCls} flex flex-col items-center justify-center`}>
          <div className="flex items-center gap-2 mb-1">
            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Cost</h2>
          </div>
          <p className="text-2xl md:text-3xl font-black text-white">{formatCurrency(overview.total_cost)}</p>
        </div>
        <div className={`${cardCls} flex flex-col items-center justify-center border-indigo-500/30`}>
          <div className="flex items-center gap-2 mb-1">
            <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <h2 className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">Current Value</h2>
          </div>
          <p className="text-2xl md:text-3xl font-black text-indigo-400">{formatCurrency(overview.total_current_value)}</p>
        </div>
        <div className={`${cardCls} flex flex-col items-center justify-center`}>
          <div className="flex items-center gap-2 mb-1">
            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">P&L / Return</h2>
          </div>
          <p className={`text-2xl md:text-3xl font-black ${pnlColor}`}>
            {formatCurrency(overview.pnl_amount)}{' '}
            <span className="text-lg">({overview.pnl_pct.toFixed(2)}%)</span>
          </p>
        </div>
      </div>

      <MarketTickerPanel />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className={cardCls}>
          <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
            <svg className="w-4 h-4 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            Risk Overview
          </h3>
          <RiskAnalysisPanel volatility={risk.volatility} maxDrawdown={risk.max_drawdown} />
        </div>
        <NotificationPanel />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className={cardCls}>
          <h3 className="text-base font-bold text-white mb-4 text-center">Asset Allocation</h3>
          <div className="h-64 min-h-0">
            <ResponsiveContainer width="100%" height="100%" minHeight={200}>
              <PieChart>
                <Pie data={typeData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                  {typeData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ color: '#9CA3AF', fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className={cardCls}>
          <h3 className="text-base font-bold text-white mb-4 text-center">Value by Type</h3>
          <div className="h-64 min-h-0">
            <ResponsiveContainer width="100%" height="100%" minHeight={200}>
              <BarChart data={typeData}>
                <XAxis dataKey="name" stroke="#6B7280" tick={{ fill: '#9CA3AF', fontSize: 11 }} />
                <YAxis stroke="#6B7280" tick={{ fill: '#9CA3AF', fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {typeData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className={cardCls}>
          <div className="flex items-center justify-between mb-1">
            <PlaceholderChart />
          </div>
          <Link
            to="/ai-strategy"
            className="mt-3 flex items-center justify-center gap-1.5 w-full py-2 text-xs font-semibold text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 rounded-xl transition-all"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            Open Full AI Strategy
          </Link>
        </div>
        <PortfolioConcentrationPanel />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ReportExportPanel />
        <AnalyticsPanel />
      </div>

      <Link
        to="/ai-chat"
        className="block w-full bg-gradient-to-r from-violet-900/40 to-indigo-900/40 hover:from-violet-900/60 hover:to-indigo-900/60 border border-violet-700/40 hover:border-violet-600/60 rounded-2xl p-5 transition-all group"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/30 group-hover:scale-105 transition-transform">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div>
              <div className="text-base font-bold text-white">AI Investment Assistant</div>
              <div className="text-xs text-gray-400 mt-0.5">
                Ask anything · Risk · Strategy · Performance · Goals · Market
              </div>
            </div>
          </div>
          <svg className="w-5 h-5 text-gray-500 group-hover:text-violet-400 group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </Link>
    </div>
  );
}
