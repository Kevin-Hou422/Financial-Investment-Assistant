import { useState, useEffect } from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ReferenceLine,
} from 'recharts';
import api, { getStrategy } from '../services/api';

const STORAGE_KEY = 'ai_strategy_v1';

const cardCls = 'bg-gray-800 border border-gray-700 rounded-2xl p-6';

const RISK_LEVEL_COLOR = {
  low: 'text-emerald-400', medium: 'text-amber-400',
  high: 'text-rose-400', critical: 'text-red-500',
};
const STRATEGY_COLOR = {
  conservative: 'bg-sky-500/20 border-sky-500/40 text-sky-300',
  balanced:     'bg-amber-500/20 border-amber-500/40 text-amber-300',
  aggressive:   'bg-rose-500/20 border-rose-500/40 text-rose-300',
};
const ACTION_ICON = { buy: '📈', sell: '📉', hold: '⏸' };
const ACTION_COLOR = {
  buy:  'bg-emerald-500/20 border-emerald-500/30 text-emerald-300',
  sell: 'bg-rose-500/20 border-rose-500/30 text-rose-300',
  hold: 'bg-gray-700/50 border-gray-600 text-gray-300',
};

/* ── AI-driven projection with volatility ─────────────────────────────────── */
function buildAdjustedProjection(baseData, stratOutput, riskOutput) {
  if (!baseData?.length) return baseData;

  const stratType  = (stratOutput?.strategy_type || 'balanced').toLowerCase();
  const riskLevel  = (riskOutput?.risk_level     || 'medium').toLowerCase();
  const riskScore  = riskOutput?.risk_score ?? 50;

  // Monthly growth rate by strategy type
  const rates = { conservative: 0.0042, balanced: 0.0072, aggressive: 0.011 };
  const rate  = rates[stratType] || 0.0072;

  // Monthly volatility by risk
  const vols  = { low: 0.010, medium: 0.022, high: 0.038, critical: 0.055 };
  const vol   = vols[riskLevel] || 0.022;

  // Deterministic "random" variance — seeded by base start value for stability
  const seed  = baseData[0]?.value || 10000;
  const pseudo = (i) => {
    const x = Math.sin(seed * 9301 + i * 49297 + 233720) * 10000;
    return x - Math.floor(x); // 0–1
  };

  const start  = baseData[0].value;
  return baseData.map((pt, i) => {
    if (i === 0) return { ...pt, projected: pt.value };
    const noise  = (pseudo(i) - 0.5) * 2 * vol;   // centred noise
    const growth = Math.pow(1 + rate + noise, i);
    return { ...pt, projected: Math.round(start * growth) };
  });
}

const ProjectionTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm shadow-xl">
      <p className="text-gray-400 text-xs mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} style={{ color: p.color }} className="font-bold">
          {p.name}: ${p.value?.toLocaleString()}
        </p>
      ))}
    </div>
  );
};

function LoadingSpinner({ size = 5 }) {
  return (
    <svg className={`w-${size} h-${size} animate-spin text-violet-400`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
    </svg>
  );
}

function RiskCard({ riskData }) {
  if (!riskData) return null;
  const lvl   = (riskData.risk_level || 'medium').toLowerCase();
  const score = riskData.risk_score ?? 0;
  const color = RISK_LEVEL_COLOR[lvl] || 'text-gray-300';
  const radarData = [
    { subject: 'Volatility',     value: Math.min(100, (riskData.volatility     || 0) * 1.5) },
    { subject: 'Drawdown',       value: Math.min(100, (riskData.max_drawdown   || 0) * 1.2) },
    { subject: 'Concentration',  value: Math.min(100, (riskData.top1_weight_pct || 0)) },
    { subject: 'Score',          value: Math.min(100, score * 20) },
  ];

  return (
    <div className={cardCls}>
      <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
        <svg className="w-4 h-4 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        Risk Assessment
      </h3>
      <div className="flex items-center gap-4 mb-4">
        <div className="text-center flex-shrink-0">
          <div className={`text-3xl font-black ${color}`}>{lvl.toUpperCase()}</div>
          <div className="text-xs text-gray-500 mt-1">Risk Level</div>
          {score > 0 && <div className="text-xs text-gray-400 mt-0.5">Score {score}/5</div>}
        </div>
        <div className="flex-1 min-w-0" style={{ height: 180, minHeight: 180 }}>
          <ResponsiveContainer width="100%" height="100%" minHeight={180}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#374151" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: '#6B7280', fontSize: 10 }} />
              <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
              <Radar dataKey="value" stroke="#f43f5e" fill="#f43f5e" fillOpacity={0.25} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>
      {riskData.top_risks?.length > 0 && (
        <div className="space-y-2 mb-3">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Top Risks</div>
          {riskData.top_risks.slice(0, 3).map((r, i) => (
            <div key={i} className="flex items-start gap-2 text-sm">
              <span className="text-rose-400 mt-0.5 flex-shrink-0">•</span>
              <span className="text-gray-300">
                <span className="font-medium text-white">{r.factor || r}</span>
                {r.detail && <span className="text-gray-400"> — {r.detail}</span>}
              </span>
            </div>
          ))}
        </div>
      )}
      {riskData.recommendation && (
        <div className="p-3 bg-rose-900/20 border border-rose-700/30 rounded-xl text-sm text-rose-200">
          💡 {riskData.recommendation}
        </div>
      )}
    </div>
  );
}

function StrategyCard({ stratData }) {
  if (!stratData) return null;
  const type     = (stratData.strategy_type || 'balanced').toLowerCase();
  const colorCls = STRATEGY_COLOR[type] || STRATEGY_COLOR.balanced;

  return (
    <div className={cardCls}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          Strategy Recommendation
        </h3>
        <span className={`px-2.5 py-1 rounded-full text-xs font-bold border capitalize ${colorCls}`}>
          {type}
        </span>
      </div>
      {stratData.rationale && (
        <p className="text-sm text-gray-300 mb-4 leading-relaxed">{stratData.rationale}</p>
      )}
      {stratData.rebalance_actions?.length > 0 && (
        <div className="mb-4">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Rebalance Actions</div>
          <div className="space-y-2">
            {stratData.rebalance_actions.map((a, i) => {
              const act = (a.action || '').toLowerCase();
              const cls = ACTION_COLOR[act] || ACTION_COLOR.hold;
              return (
                <div key={i} className={`flex items-start gap-3 p-2.5 rounded-xl border ${cls}`}>
                  <span className="text-base leading-none mt-0.5 flex-shrink-0">{ACTION_ICON[act] || '•'}</span>
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wide">{act}</span>
                    <span className="text-xs text-gray-300 mx-1">·</span>
                    <span className="text-xs font-medium">{a.asset_type}</span>
                    {a.reason && <p className="text-xs text-gray-400 mt-0.5">{a.reason}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {stratData.target_allocation && Object.keys(stratData.target_allocation).length > 0 && (
        <div className="mb-4">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Target Allocation</div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(stratData.target_allocation).map(([t, pct]) => (
              <span key={t} className="px-2.5 py-1 bg-amber-500/15 border border-amber-500/30 rounded-full text-xs text-amber-300 font-medium">
                {t}: {pct}%
              </span>
            ))}
          </div>
        </div>
      )}
      {stratData.next_steps?.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Next Steps</div>
          <ol className="space-y-1.5">
            {stratData.next_steps.map((step, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-violet-600/30 border border-violet-500/40 text-violet-300 text-xs font-bold flex items-center justify-center mt-0.5">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

export default function AIStrategyPage() {
  const [baseProjection, setBaseProjection] = useState(null);
  const [projMsg, setProjMsg]               = useState('');
  const [aiData, setAiData]                 = useState(null);
  const [analyzing, setAnalyzing]           = useState(false);
  const [error, setError]                   = useState('');

  /* ── Load persisted strategy on mount ── */
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try { setAiData(JSON.parse(saved)); } catch {}
    }
  }, []);

  /* ── Load base projection on mount ── */
  useEffect(() => {
    getStrategy()
      .then((res) => {
        const formatted = res.data.dates.map((d, i) => ({
          date: d, value: res.data.portfolio_values[i],
        }));
        setBaseProjection(formatted);
        setProjMsg(res.data.message);
      })
      .catch(() => {});
  }, []);

  /* ── Build chart data: base + AI-adjusted ── */
  const chartData = aiData
    ? buildAdjustedProjection(baseProjection, aiData.stratOutput, aiData.riskOutput)
    : baseProjection;

  const hasAdjusted  = aiData && chartData?.some((d) => d.projected !== d.value);
  const projStart    = chartData?.[0];
  const projEnd      = chartData?.at(-1);
  const displayVal   = projEnd?.projected ?? projEnd?.value ?? 0;
  const startVal     = projStart?.value ?? 0;
  const projGrowth   = startVal
    ? (((displayVal - startVal) / startVal) * 100).toFixed(1)
    : null;

  const runAnalysis = async () => {
    setAnalyzing(true);
    setError('');
    try {
      const res = await api.post('/agent/chat', {
        message: 'Please conduct a comprehensive portfolio strategy analysis: assess risk, suggest rebalancing, provide a specific rebalancing plan and next action steps.',
        token_budget: 800,
      });
      const { results, intent, pipeline, agents_called, total_tokens, total_latency_ms } = res.data;
      const riskResult = results.find((r) => r.agent_name === 'risk_analyst'     && r.status === 'done');
      const stratResult= results.find((r) => r.agent_name === 'strategy_analyst' && r.status === 'done');
      const portResult = results.find((r) => r.agent_name === 'portfolio_analyst' && r.status === 'done');

      const newData = {
        riskOutput:  riskResult?.output  || null,
        stratOutput: stratResult?.output || null,
        portOutput:  portResult?.output  || null,
        meta: { intent, pipeline, agents_called, total_tokens, total_latency_ms },
        generatedAt: new Date().toLocaleString(),
      };
      setAiData(newData);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newData));
    } catch (err) {
      setError(err.response?.data?.detail || 'Analysis failed. Check backend configuration.');
    } finally {
      setAnalyzing(false);
    }
  };

  const clearStrategy = () => {
    setAiData(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/30">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            AI Strategy
          </h1>
          <p className="text-sm text-gray-500 mt-1">Multi-agent powered investment strategy analysis</p>
        </div>
        <div className="flex items-center gap-2">
          {aiData && (
            <button onClick={clearStrategy}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl text-gray-400 hover:text-rose-400 hover:bg-rose-500/10 border border-gray-700 hover:border-rose-500/30 transition-all">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Regenerate
            </button>
          )}
          <button onClick={runAnalysis} disabled={analyzing}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:from-gray-700 disabled:to-gray-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-violet-500/25 transition-all disabled:cursor-not-allowed">
            {analyzing ? (
              <><LoadingSpinner size={4} /> Analyzing…</>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                {aiData ? 'Update Strategy' : 'Generate AI Strategy'}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Cached badge */}
      {aiData?.generatedAt && !analyzing && (
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <svg className="w-3.5 h-3.5 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          Strategy saved · Last generated {aiData.generatedAt}
        </div>
      )}

      {error && (
        <div className="bg-rose-900/30 border border-rose-700/50 rounded-2xl p-4 text-rose-300 text-sm flex items-start gap-2">
          <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </div>
      )}

      {analyzing && (
        <div className="bg-violet-900/20 border border-violet-700/40 rounded-2xl p-5 flex items-center gap-4">
          <div className="flex gap-1.5">
            {['Risk', 'Strategy'].map((a, i) => (
              <span key={a} style={{ animationDelay: `${i * 0.2}s` }}
                className="px-2.5 py-1 rounded-full text-xs font-semibold bg-violet-500/20 border border-violet-500/40 text-violet-300 animate-pulse">
                {a}
              </span>
            ))}
          </div>
          <span className="text-sm text-gray-400">Running multi-agent pipeline…</span>
        </div>
      )}

      {/* Projection chart */}
      <div className={cardCls}>
        <div className="flex items-start justify-between mb-4 flex-wrap gap-3">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            12-Month Portfolio Projection
            {hasAdjusted && (
              <span className="text-xs font-normal text-violet-400 bg-violet-500/15 border border-violet-500/30 px-2 py-0.5 rounded-full ml-1">
                AI-adjusted
              </span>
            )}
          </h3>
          <div className="flex items-center gap-4 text-sm flex-wrap">
            {startVal > 0 && (
              <span className="text-gray-400">Start: <span className="text-white font-bold">${startVal.toLocaleString()}</span></span>
            )}
            {displayVal > 0 && (
              <span className="text-gray-400">Projected: <span className="text-emerald-400 font-bold">${displayVal.toLocaleString()}</span></span>
            )}
            {projGrowth && (
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                parseFloat(projGrowth) >= 0
                  ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/20 border-rose-500/30 text-rose-300'
              }`}>
                {parseFloat(projGrowth) >= 0 ? '+' : ''}{projGrowth}%
              </span>
            )}
          </div>
        </div>
        {projMsg && <p className="text-xs text-gray-500 mb-4">{projMsg}</p>}
        {hasAdjusted && (
          <div className="flex items-center gap-4 text-xs text-gray-500 mb-3 flex-wrap">
            <span className="flex items-center gap-1.5"><span className="w-6 h-0.5 bg-gray-600 inline-block rounded" />Base</span>
            <span className="flex items-center gap-1.5"><span className="w-6 h-0.5 bg-violet-500 inline-block rounded" />AI Projected</span>
          </div>
        )}
        <div style={{ height: 280, minHeight: 280 }}>
          <ResponsiveContainer width="100%" height="100%" minHeight={280}>
            <LineChart data={chartData || []} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
              <XAxis dataKey="date" stroke="#4B5563" tick={{ fill: '#6B7280', fontSize: 11 }}
                tickFormatter={(v) => v?.slice(0, 7)} />
              <YAxis domain={['auto', 'auto']} stroke="#4B5563" tick={{ fill: '#6B7280', fontSize: 11 }}
                tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} width={50} />
              <Tooltip content={<ProjectionTooltip />} />
              {/* Base line always shown */}
              <Line type="monotone" dataKey="value" name="Base" stroke="#4B5563" strokeWidth={1.5}
                strokeDasharray="5 3" dot={false} />
              {/* AI-adjusted projected line */}
              {hasAdjusted && (
                <Line type="monotone" dataKey="projected" name="AI Projected" stroke="#8B5CF6"
                  strokeWidth={2.5} dot={{ r: 2.5, fill: '#8B5CF6', strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: '#8B5CF6', stroke: '#1E1B4B', strokeWidth: 2 }} />
              )}
              {!hasAdjusted && (
                <Line type="monotone" dataKey="value" name="Projected" stroke="#10B981"
                  strokeWidth={2.5} dot={{ r: 2.5, fill: '#10B981', strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: '#10B981', stroke: '#064E3B', strokeWidth: 2 }} />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* AI results */}
      {aiData && (
        <>
          {aiData.meta && (
            <div className="flex items-center gap-2 text-xs text-gray-500 flex-wrap">
              <span className="bg-gray-800 border border-gray-700 px-2.5 py-1 rounded-full">
                Intent: <span className="text-gray-300">{aiData.meta.intent}</span>
              </span>
              {aiData.meta.agents_called?.map((a) => (
                <span key={a} className="bg-gray-800 border border-gray-700 px-2.5 py-1 rounded-full text-gray-300">{a}</span>
              ))}
              <span>{aiData.meta.total_tokens} tokens · {aiData.meta.total_latency_ms}ms</span>
            </div>
          )}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RiskCard riskData={aiData.riskOutput} />
            <StrategyCard stratData={aiData.stratOutput} />
          </div>
          {aiData.portOutput?.summary && (
            <div className={cardCls}>
              <h3 className="text-base font-bold text-white mb-3 flex items-center gap-2">
                <svg className="w-4 h-4 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Portfolio Summary
              </h3>
              <p className="text-sm text-gray-300 leading-relaxed">{aiData.portOutput.summary}</p>
              {aiData.portOutput.highlights?.length > 0 && (
                <ul className="mt-3 space-y-1.5">
                  {aiData.portOutput.highlights.map((h, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                      <span className="text-violet-400 mt-0.5">•</span>{h}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </>
      )}

      {!aiData && !analyzing && !error && (
        <div className="bg-gray-800/40 border border-gray-700/50 border-dashed rounded-2xl p-10 text-center">
          <div className="text-4xl mb-3">🤖</div>
          <p className="text-gray-400 text-sm">
            Click <span className="text-violet-400 font-semibold">Generate AI Strategy</span> to run a multi-agent analysis.
          </p>
          <p className="text-gray-600 text-xs mt-2">Results are saved locally and persist between sessions.</p>
        </div>
      )}
    </div>
  );
}
