import { useState, useEffect } from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts';
import api, { getStrategy } from '../services/api';

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
  buy: 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300',
  sell: 'bg-rose-500/20 border-rose-500/30 text-rose-300',
  hold: 'bg-gray-700/50 border-gray-600 text-gray-300',
};

const ProjectionTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm shadow-xl">
        <p className="text-gray-400 text-xs mb-1">{label}</p>
        <p className="text-emerald-400 font-bold">${payload[0].value?.toLocaleString()}</p>
      </div>
    );
  }
  return null;
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
  const lvl = (riskData.risk_level || 'medium').toLowerCase();
  const score = riskData.risk_score ?? 0;
  const color = RISK_LEVEL_COLOR[lvl] || 'text-gray-300';
  const radarData = [
    { subject: 'Volatility', value: Math.min(100, (riskData.volatility || 0) * 1.5) },
    { subject: 'Drawdown', value: Math.min(100, (riskData.max_drawdown || 0) * 1.2) },
    { subject: 'Concentration', value: Math.min(100, (riskData.top1_weight_pct || 0)) },
    { subject: 'Score', value: (score / 5) * 100 },
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
        <div className="text-center">
          <div className={`text-3xl font-black ${color}`}>{lvl.toUpperCase()}</div>
          <div className="text-xs text-gray-500 mt-1">Risk Level</div>
        </div>
        <div className="flex-1 h-48 min-h-0" style={{minHeight: '192px'}}>
          <ResponsiveContainer width="100%" height="100%" minHeight={192}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#374151" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: '#6B7280', fontSize: 10 }} />
              <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
              <Radar dataKey="value" stroke="#f43f5e" fill="#f43f5e" fillOpacity={0.2} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>
      {riskData.top_risks?.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Top Risks</div>
          {riskData.top_risks.slice(0, 3).map((r, i) => (
            <div key={i} className="flex items-start gap-2 text-sm">
              <span className="text-rose-400 mt-0.5">•</span>
              <span className="text-gray-300">
                <span className="font-medium text-white">{r.factor || r}</span>
                {r.detail && <span className="text-gray-400"> — {r.detail}</span>}
              </span>
            </div>
          ))}
        </div>
      )}
      {riskData.recommendation && (
        <div className="mt-3 p-3 bg-rose-900/20 border border-rose-700/30 rounded-xl text-sm text-rose-200">
          💡 {riskData.recommendation}
        </div>
      )}
    </div>
  );
}

function StrategyCard({ stratData }) {
  if (!stratData) return null;
  const type = (stratData.strategy_type || 'balanced').toLowerCase();
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
                  <span className="text-base leading-none mt-0.5">{ACTION_ICON[act] || '•'}</span>
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
            {Object.entries(stratData.target_allocation).map(([type, pct]) => (
              <span key={type} className="px-2.5 py-1 bg-amber-500/15 border border-amber-500/30 rounded-full text-xs text-amber-300 font-medium">
                {type}: {pct}%
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
  const [projection, setProjection] = useState(null);
  const [projMsg, setProjMsg] = useState('');
  const [aiData, setAiData] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getStrategy().then((res) => {
      const formatted = res.data.dates.map((d, i) => ({
        date: d,
        value: res.data.portfolio_values[i],
      }));
      setProjection(formatted);
      setProjMsg(res.data.message);
    }).catch(() => {});
  }, []);

  const runAnalysis = async () => {
    setAnalyzing(true);
    setError('');
    setAiData(null);
    try {
      const res = await api.post('/agent/chat', {
        message: '请对我的投资组合进行全面的策略分析：评估风险，提出调仓建议，生成具体的再平衡方案和下一步行动计划。',
        token_budget: 800,
      });
      const { results, intent, pipeline, agents_called, total_tokens, total_latency_ms } = res.data;

      const riskResult = results.find((r) => r.agent_name === 'risk_analyst' && r.status === 'done');
      const stratResult = results.find((r) => r.agent_name === 'strategy_analyst' && r.status === 'done');
      const portResult  = results.find((r) => r.agent_name === 'portfolio_analyst' && r.status === 'done');

      setAiData({
        riskOutput:  riskResult?.output || null,
        stratOutput: stratResult?.output || null,
        portOutput:  portResult?.output || null,
        meta: { intent, pipeline, agents_called, total_tokens, total_latency_ms },
      });
    } catch (err) {
      setError(err.response?.data?.detail || 'Analysis failed. Please check backend configuration.');
    } finally {
      setAnalyzing(false);
    }
  };

  const projCurrent = projection?.at(-1)?.value;
  const projStart   = projection?.[0]?.value;
  const projGrowth  = projStart ? (((projCurrent - projStart) / projStart) * 100).toFixed(1) : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
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
        <button
          onClick={runAnalysis}
          disabled={analyzing}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:from-gray-700 disabled:to-gray-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-violet-500/25 transition-all disabled:cursor-not-allowed"
        >
          {analyzing ? (
            <><LoadingSpinner size={4} /> Analyzing…</>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              Generate AI Strategy
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="bg-rose-900/30 border border-rose-700/50 rounded-2xl p-4 text-rose-300 text-sm flex items-start gap-2">
          <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </div>
      )}

      {analyzing && (
        <div className="bg-violet-900/20 border border-violet-700/40 rounded-2xl p-5 flex items-center gap-4">
          <div className="flex gap-1.5">
            {['Portfolio', 'Risk', 'Strategy'].map((a, i) => (
              <span key={a} className="px-2.5 py-1 rounded-full text-xs font-semibold bg-violet-500/20 border border-violet-500/40 text-violet-300 animate-pulse"
                style={{ animationDelay: `${i * 0.2}s` }}>
                {a}
              </span>
            ))}
          </div>
          <span className="text-sm text-gray-400">Running multi-agent pipeline…</span>
        </div>
      )}

      <div className={cardCls}>
        <div className="flex items-start justify-between mb-4 flex-wrap gap-3">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            12-Month Portfolio Projection
          </h3>
          <div className="flex items-center gap-4 text-sm">
            {projStart && (
              <span className="text-gray-400">
                Start: <span className="text-white font-bold">${projStart.toLocaleString()}</span>
              </span>
            )}
            {projCurrent && (
              <span className="text-gray-400">
                Projected: <span className="text-emerald-400 font-bold">${projCurrent.toLocaleString()}</span>
              </span>
            )}
            {projGrowth && (
              <span className="bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 px-2.5 py-0.5 rounded-full text-xs font-bold">
                +{projGrowth}%
              </span>
            )}
          </div>
        </div>
        {projMsg && <p className="text-xs text-gray-500 mb-4">{projMsg}</p>}
        <div className="h-64 min-h-0" style={{minHeight: '256px'}}>
          <ResponsiveContainer width="100%" height="100%" minHeight={256}>
            <LineChart data={projection || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
              <XAxis dataKey="date" stroke="#4B5563" tick={{ fill: '#6B7280', fontSize: 11 }} />
              <YAxis domain={['auto', 'auto']} stroke="#4B5563" tick={{ fill: '#6B7280', fontSize: 11 }}
                tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<ProjectionTooltip />} />
              <Line type="monotone" dataKey="value" stroke="#10B981" strokeWidth={2.5}
                dot={{ r: 3, fill: '#10B981', strokeWidth: 0 }}
                activeDot={{ r: 6, fill: '#10B981', stroke: '#064E3B', strokeWidth: 2 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {aiData && (
        <>
          {aiData.meta && (
            <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
              <span className="bg-gray-800 border border-gray-700 px-2.5 py-1 rounded-full">
                Intent: <span className="text-gray-300">{aiData.meta.intent}</span>
              </span>
              {aiData.meta.agents_called?.map((a) => (
                <span key={a} className="bg-gray-800 border border-gray-700 px-2.5 py-1 rounded-full text-gray-300">
                  {a}
                </span>
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
          <p className="text-gray-400 text-sm">Click <span className="text-violet-400 font-semibold">Generate AI Strategy</span> to run a multi-agent analysis of your portfolio.</p>
          <p className="text-gray-600 text-xs mt-2">Powered by Risk Analyst + Strategy Analyst agents</p>
        </div>
      )}
    </div>
  );
}
