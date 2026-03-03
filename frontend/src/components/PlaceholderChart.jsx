import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts';
import { getStrategy } from '../services/api';

export default function PlaceholderChart() {
    const [strategyData, setStrategyData] = useState([]);
    const [message, setMessage] = useState('');

    useEffect(() => {
        getStrategy().then(res => {
            const formatted = res.data.dates.map((date, index) => ({
                date,
                value: res.data.portfolio_values[index]
            }));
            setStrategyData(formatted);
            setMessage(res.data.message);
        });
    }, []);

    return (
        <div className="w-full">
            <h3 className="text-lg font-bold mb-2">AI Strategy Projection (Placeholder)</h3>
            <p className="text-sm text-gray-500 mb-6">{message}</p>
            <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={strategyData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="date" />
                        <YAxis domain={['auto', 'auto']} />
                        <Tooltip />
                        <Line type="monotone" dataKey="value" stroke="#10B981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 8 }} />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}