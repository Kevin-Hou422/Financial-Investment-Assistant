import { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { getAssets } from '../services/api';
import { formatCurrency } from '../utils/helpers';
import PlaceholderChart from './PlaceholderChart';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#6366F1'];

export default function Dashboard() {
  const [assets, setAssets] = useState([]);
  
  useEffect(() => {
    getAssets().then(res => setAssets(res.data));
  }, []);

  const totalInvestment = assets.reduce((sum, a) => sum + a.total_value, 0);
  
  const typeData = assets.reduce((acc, curr) => {
    const found = acc.find(i => i.name === curr.type);
    if (found) found.value += curr.total_value;
    else acc.push({ name: curr.type, value: curr.total_value });
    return acc;
  }, []);

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-sm border flex flex-col items-center justify-center">
        <h2 className="text-lg font-semibold text-gray-500">Total Investment Value</h2>
        <p className="text-4xl font-bold text-blue-600 mt-2">{formatCurrency(totalInvestment)}</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-bold mb-6 text-center">Asset Allocation</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={typeData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                  {typeData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
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