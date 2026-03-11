import React, { useEffect, useState } from 'react';

export default function PortfolioConcentrationPanel() {
  const [concentration, setConcentration] = useState({ top1_weight_pct: 0, top3_weight_pct: 0, hhi: 0 });

  useEffect(() => {
    const loadAnalysis = async () => {
      try {
        const { default: api } = await import('../services/api');
        const res = await api.get('/portfolio/analysis');
        setConcentration(res.data.concentration || concentration);
      } catch {}
    };
    loadAnalysis();
  }, []);

  const hhiRisk = concentration.hhi > 0.25 ? 'text-rose-400' : concentration.hhi > 0.15 ? 'text-amber-400' : 'text-emerald-400';

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6">
      <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
        <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
        </svg>
        Concentration Analysis
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
        <div className="bg-gray-700/50 rounded-xl p-4">
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">Top 1 Holding</p>
          <p className="text-2xl font-black text-white">{concentration.top1_weight_pct.toFixed(2)}%</p>
          <div className="mt-2 w-full h-1 bg-gray-600 rounded-full overflow-hidden">
            <div className="h-full bg-cyan-400 rounded-full transition-all duration-1000"
              style={{ width: `${Math.min(concentration.top1_weight_pct, 100)}%` }} />
          </div>
        </div>
        <div className="bg-gray-700/50 rounded-xl p-4">
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">Top 3 Holdings</p>
          <p className="text-2xl font-black text-white">{concentration.top3_weight_pct.toFixed(2)}%</p>
          <div className="mt-2 w-full h-1 bg-gray-600 rounded-full overflow-hidden">
            <div className="h-full bg-violet-400 rounded-full transition-all duration-1000"
              style={{ width: `${Math.min(concentration.top3_weight_pct, 100)}%` }} />
          </div>
        </div>
        <div className="bg-gray-700/50 rounded-xl p-4">
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">HHI Score</p>
          <p className={`text-2xl font-black ${hhiRisk}`}>{concentration.hhi.toFixed(4)}</p>
          <p className="text-[10px] text-gray-500 mt-1">
            {concentration.hhi > 0.25 ? 'High concentration' : concentration.hhi > 0.15 ? 'Moderate' : 'Well diversified'}
          </p>
        </div>
      </div>
    </div>
  );
}
