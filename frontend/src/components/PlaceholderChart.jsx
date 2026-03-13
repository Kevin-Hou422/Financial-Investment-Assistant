import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts';
import { getStrategy } from '../services/api';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm shadow-xl">
        <p className="text-gray-400 text-xs mb-1">{label}</p>
        <p className="text-emerald-400 font-bold">${payload[0].value?.toLocaleString()}</p>
      </div>
    );
  }
  return null;
};

export default function PlaceholderChart() {
  const [strategyData, setStrategyData] = useState([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    getStrategy().then((res) => {
      const formatted = res.data.dates.map((date, index) => ({
        date,
        value: res.data.portfolio_values[index],
      }));
      setStrategyData(formatted);
      setMessage(res.data.message);
    });
  }, []);

  return (
    <div className="w-full">
      <h3 className="text-base font-bold text-white mb-1 flex items-center gap-2">
        <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
        AI Strategy Projection
      </h3>
      {message && <p className="text-xs text-gray-400 mb-4">{message}</p>}
      <div className="h-64 w-full min-h-0">
        <ResponsiveContainer width="100%" height="100%" minHeight={200}>
          <LineChart data={strategyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
            <XAxis dataKey="date" stroke="#4B5563" tick={{ fill: '#6B7280', fontSize: 11 }} />
            <YAxis domain={['auto', 'auto']} stroke="#4B5563" tick={{ fill: '#6B7280', fontSize: 11 }} />
            <Tooltip content={<CustomTooltip />} />
            <Line type="monotone" dataKey="value" stroke="#10B981" strokeWidth={2.5}
              dot={{ r: 3, fill: '#10B981', strokeWidth: 0 }}
              activeDot={{ r: 6, fill: '#10B981', stroke: '#064E3B', strokeWidth: 2 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
