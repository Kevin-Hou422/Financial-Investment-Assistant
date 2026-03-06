import React, { useEffect, useState } from 'react';

export default function PortfolioConcentrationPanel() {
  const [concentration, setConcentration] = useState({
    top1_weight_pct: 0,
    top3_weight_pct: 0,
    hhi: 0,
  });

  useEffect(() => {
    const loadAnalysis = async () => {
      try {
        const { default: api } = await import('../services/api');
        const res = await api.get('/portfolio/analysis');
        setConcentration(res.data.concentration || concentration);
      } catch (e) {
        // 静默失败即可
      }
    };
    loadAnalysis();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border">
      <h3 className="text-lg font-bold mb-4">Concentration Analysis</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wider">
            Top 1 Holding
          </p>
          <p className="text-2xl font-bold text-slate-800">
            {concentration.top1_weight_pct.toFixed(2)}%
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wider">
            Top 3 Holdings
          </p>
          <p className="text-2xl font-bold text-slate-800">
            {concentration.top3_weight_pct.toFixed(2)}%
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wider">
            HHI
          </p>
          <p className="text-2xl font-bold text-slate-800">
            {concentration.hhi.toFixed(4)}
          </p>
        </div>
      </div>
    </div>
  );
}

