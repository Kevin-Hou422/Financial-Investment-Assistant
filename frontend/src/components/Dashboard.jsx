import { useEffect, useState } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { getAssets } from '../services/api';
import { formatCurrency } from '../utils/helpers';
import PlaceholderChart from './PlaceholderChart';
import MarketTickerPanel from './MarketTickerPanel';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#6366F1'];

export default function Dashboard() {
  const [assets, setAssets] = useState([]);
  const [overview, setOverview] = useState({
    total_cost: 0,
    total_current_value: 0,
    pnl_amount: 0,
    pnl_pct: 0,
  });

  useEffect(() => {
    getAssets().then((res) => setAssets(res.data));
  }, []);

  useEffect(() => {
    // 懒加载 portfolio 概览，避免修改现有 api.js 导出结构
    const loadOverview = async () => {
      try {
        const { default: api } = await import('../services/api');
        const res = await api.get('/portfolio/summary');
        setOverview(res.data);
      } catch (e) {
        // 在 Dashboard 上静默失败，避免打断主流程
      }
    };
    loadOverview();
  }, []);

  const typeData = assets.reduce((acc, curr) => {
    const found = acc.find((i) => i.name === curr.type);
    if (found) found.value += curr.total_value;
    else acc.push({ name: curr.type, value: curr.total_value });
    return acc;
  }, []);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-lg shadow-sm border flex flex-col items-center justify-center">
          <h2 className="text-sm font-semibold text-gray-500">
            Total Cost
          </h2>
          <p className="text-2xl md:text-3xl font-bold text-gray-800 mt-1">
            {formatCurrency(overview.total_cost)}
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border flex flex-col items-center justify-center">
          <h2 className="text-sm font-semibold text-gray-500">
            Current Value
          </h2>
          <p className="text-2xl md:text-3xl font-bold text-blue-600 mt-1">
            {formatCurrency(overview.total_current_value)}
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border flex flex-col items-center justify-center">
          <h2 className="text-sm font-semibold text-gray-500">
            P&amp;L / Return
          </h2>
          <p
            className={`text-2xl md:text-3xl font-bold mt-1 ${
              overview.pnl_amount > 0
                ? 'text-green-600'
                : overview.pnl_amount < 0
                ? 'text-red-600'
                : 'text-gray-700'
            }`}
          >
            {formatCurrency(overview.pnl_amount)} (
            {overview.pnl_pct.toFixed(2)}
            %)
          </p>
        </div>
      </div>

      <MarketTickerPanel />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-bold mb-6 text-center">Asset Allocation</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={typeData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label
                >
                  {typeData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-bold mb-6 text-center">Value by Type</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={typeData}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Bar dataKey="value" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <PlaceholderChart />
      </div>
    </div>
  );
}