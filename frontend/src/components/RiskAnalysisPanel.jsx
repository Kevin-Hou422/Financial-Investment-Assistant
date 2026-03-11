import React from 'react';

const getRiskLevel = (v) => {
  if (v < 10) return { label: 'Low', color: 'text-emerald-400', bg: 'bg-emerald-400', bar: 'bg-emerald-400', pct: (v / 10) * 33 };
  if (v < 20) return { label: 'Medium', color: 'text-amber-400', bg: 'bg-amber-400', bar: 'bg-amber-400', pct: 33 + ((v - 10) / 10) * 34 };
  return { label: 'High', color: 'text-rose-400', bg: 'bg-rose-400', bar: 'bg-rose-400', pct: Math.min(67 + ((v - 20) / 20) * 33, 100) };
};

const RiskAnalysisPanel = ({ volatility, maxDrawdown }) => {
  const risk = getRiskLevel(volatility);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-700/50 rounded-xl p-4 text-center">
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">Volatility (Ann.)</p>
          <p className={`text-2xl font-black ${risk.color}`}>{volatility}%</p>
          <span className={`mt-1 inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${
            risk.label === 'Low' ? 'bg-emerald-500/20 text-emerald-400' :
            risk.label === 'Medium' ? 'bg-amber-500/20 text-amber-400' :
            'bg-rose-500/20 text-rose-400'
          }`}>{risk.label} Risk</span>
        </div>
        <div className="bg-gray-700/50 rounded-xl p-4 text-center">
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">Max Drawdown</p>
          <p className="text-2xl font-black text-white">-{maxDrawdown}%</p>
          <span className="mt-1 inline-block text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-600 text-gray-300">Historical</span>
        </div>
      </div>
      <div>
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>Risk Level</span>
          <span className={risk.color}>{risk.label}</span>
        </div>
        <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-1000 ${risk.bar}`}
            style={{ width: `${risk.pct}%` }} />
        </div>
        <div className="flex justify-between text-[10px] text-gray-600 mt-1">
          <span>Low</span><span>Medium</span><span>High</span>
        </div>
      </div>
    </div>
  );
};

export default RiskAnalysisPanel;
