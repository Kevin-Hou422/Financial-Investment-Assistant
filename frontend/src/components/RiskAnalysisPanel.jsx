import React from 'react';

const RiskAnalysisPanel = ({ volatility, maxDrawdown }) => {
  const getRiskLevel = (v) => {
    if (v < 10) return { label: 'Low', color: 'text-green-500' };
    if (v < 20) return { label: 'Medium', color: 'text-yellow-500' };
    return { label: 'High', color: 'text-red-500' };
  };

  const risk = getRiskLevel(volatility);

  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="p-4 bg-slate-50 rounded-lg text-center">
        <p className="text-xs text-slate-500 uppercase tracking-wider">Volatility (Ann.)</p>
        <p className={`text-xl font-bold ${risk.color}`}>{volatility}%</p>
      </div>
      <div className="p-4 bg-slate-50 rounded-lg text-center">
        <p className="text-xs text-slate-500 uppercase tracking-wider">Max Drawdown</p>
        <p className="text-xl font-bold text-slate-800">-{maxDrawdown}%</p>
      </div>
    </div>
  );
};

export default RiskAnalysisPanel;