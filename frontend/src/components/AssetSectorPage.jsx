import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { getAssets } from '../services/api';
import { ASSET_TYPES, SECTOR_CONFIG } from '../utils/assetCategories';

const SECTOR_ICONS = {
  stock: (
    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
  ),
  fund: (
    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
    </svg>
  ),
  crypto: (
    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  ),
  gold: (
    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  ),
  bond: (
    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  forex: (
    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
    </svg>
  ),
  custom: (
    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
  ),
};

export default function AssetSectorPage() {
  const navigate = useNavigate();
  const [counts, setCounts] = useState({});
  const [values, setValues] = useState({});

  useEffect(() => {
    getAssets().then((res) => {
      const c = {};
      const v = {};
      res.data.forEach((a) => {
        c[a.type] = (c[a.type] || 0) + 1;
        v[a.type] = (v[a.type] || 0) + (a.total_value || 0);
      });
      setCounts(c);
      setValues(v);
    });
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-white tracking-tight">Portfolio Assets</h1>
        <p className="text-gray-400 mt-1">Select a sector to view and manage your holdings</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {ASSET_TYPES.map((type) => {
          const cfg = SECTOR_CONFIG[type];
          const count = counts[type] || 0;
          const val = values[type] || 0;
          return (
            <button
              key={type}
              onClick={() => navigate(`/assets/${type}`)}
              className={`group relative overflow-hidden rounded-2xl p-6 text-left transition-all duration-300
                bg-gradient-to-br ${cfg.gradient}
                shadow-lg ${cfg.glow} hover:shadow-xl hover:scale-[1.03] active:scale-[0.98]
                border border-white/10`}
            >
              <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors duration-300" />
              <div className="relative z-10 flex flex-col gap-4">
                <div className="flex items-start justify-between">
                  <div className="text-white/90">{SECTOR_ICONS[cfg.icon]}</div>
                  <div className="flex flex-col items-end gap-1">
                    {count > 0 && (
                      <span className="bg-white/20 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                        {count} asset{count !== 1 ? 's' : ''}
                      </span>
                    )}
                    <svg className="w-5 h-5 text-white/60 group-hover:text-white group-hover:translate-x-1 transition-all duration-200"
                      fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-black text-white">{type}</h3>
                  <p className="text-white/70 text-sm mt-0.5">{cfg.desc}</p>
                </div>
                {val > 0 && (
                  <div className="pt-2 border-t border-white/20">
                    <p className="text-white/60 text-xs uppercase tracking-wider">Total Value</p>
                    <p className="text-white font-bold text-lg">
                      ${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                )}
                {count === 0 && (
                  <div className="pt-2 border-t border-white/20">
                    <p className="text-white/50 text-xs">No holdings yet — click to add</p>
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
