import { useState, useRef, useEffect, useCallback } from 'react';
import api from '../services/api';

const QUICK_ACTIONS = [
  { label: '📊 Portfolio Overview', message: '给我一个完整的投资组合概览' },
  { label: '⚠️ Risk Analysis', message: '分析我的投资组合风险' },
  { label: '📈 Performance', message: '我的投资表现如何？哪些资产收益最好？' },
  { label: '⚖️ Rebalance', message: '我应该如何调整我的投资组合配置？' },
  { label: '🎯 Goals', message: '我的财务目标进展如何？' },
  { label: '🌍 Market', message: '目前市场状况对我的持仓有何影响？' },
  { label: '📋 Full Report', message: '生成一份完整的投资分析报告' },
];

const AGENT_COLORS = {
  portfolio_analyst: { bg: 'bg-violet-500/20', border: 'border-violet-500/40', text: 'text-violet-300', label: 'Portfolio' },
  risk_analyst:      { bg: 'bg-rose-500/20',   border: 'border-rose-500/40',   text: 'text-rose-300',   label: 'Risk' },
  market_analyst:    { bg: 'bg-sky-500/20',     border: 'border-sky-500/40',    text: 'text-sky-300',    label: 'Market' },
  strategy_analyst:  { bg: 'bg-amber-500/20',   border: 'border-amber-500/40',  text: 'text-amber-300',  label: 'Strategy' },
  research_analyst:  { bg: 'bg-emerald-500/20', border: 'border-emerald-500/40',text: 'text-emerald-300',label: 'Research' },
};

const INTENT_LABELS = {
  portfolio_overview: 'Portfolio Overview',
  risk_analysis: 'Risk Analysis',
  performance_review: 'Performance Review',
  rebalance_advice: 'Rebalance Advice',
  goal_tracking: 'Goal Tracking',
  market_analysis: 'Market Analysis',
  research: 'Research',
  full_report: 'Full Report',
  unknown: 'General Query',
};

function AgentBadge({ name }) {
  const c = AGENT_COLORS[name] || { bg: 'bg-gray-700', border: 'border-gray-600', text: 'text-gray-300', label: name };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${c.bg} ${c.border} ${c.text}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {c.label}
    </span>
  );
}

function renderValue(val) {
  if (val === null || val === undefined) return null;
  if (typeof val === 'boolean') return <span className={val ? 'text-emerald-400' : 'text-rose-400'}>{val ? 'Yes' : 'No'}</span>;
  if (typeof val === 'number') return <span className="text-cyan-300 font-mono">{val}</span>;
  if (typeof val === 'string') return <span className="text-gray-200">{val}</span>;
  if (Array.isArray(val)) {
    if (val.length === 0) return <span className="text-gray-500 italic">none</span>;
    return (
      <ul className="mt-1 space-y-1">
        {val.map((item, i) => (
          <li key={i} className="flex items-start gap-2">
            <span className="text-violet-400 mt-0.5 flex-shrink-0">•</span>
            <span className="text-gray-200 text-sm">
              {typeof item === 'object' ? (
                <span className="flex flex-wrap gap-2">
                  {Object.entries(item).map(([k, v]) => (
                    <span key={k} className="text-gray-400">
                      <span className="text-gray-500">{k}:</span>{' '}
                      <span className="text-gray-200">{String(v)}</span>
                    </span>
                  ))}
                </span>
              ) : String(item)}
            </span>
          </li>
        ))}
      </ul>
    );
  }
  if (typeof val === 'object') {
    return (
      <div className="mt-1 space-y-1 pl-3 border-l border-gray-700">
        {Object.entries(val).map(([k, v]) => (
          <div key={k} className="flex flex-wrap items-start gap-1 text-sm">
            <span className="text-gray-500 capitalize">{k.replace(/_/g, ' ')}:</span>
            <span>{renderValue(v)}</span>
          </div>
        ))}
      </div>
    );
  }
  return <span className="text-gray-200">{String(val)}</span>;
}

const SKIP_KEYS = new Set(['intent', 'data_snapshot']);

function AgentOutputCard({ result }) {
  const { output, agent_name, tokens_used, latency_ms } = result;
  const displayEntries = Object.entries(output || {}).filter(([k]) => !SKIP_KEYS.has(k));
  const c = AGENT_COLORS[agent_name] || { bg: 'bg-gray-800', border: 'border-gray-700', text: 'text-gray-300' };

  return (
    <div className={`rounded-xl border ${c.border} ${c.bg} p-4 space-y-3`}>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <AgentBadge name={agent_name} />
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span>{tokens_used} tokens</span>
          <span>{latency_ms}ms</span>
        </div>
      </div>
      <div className="space-y-2">
        {displayEntries.map(([key, val]) => (
          <div key={key}>
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
              {key.replace(/_/g, ' ')}
            </div>
            {renderValue(val)}
          </div>
        ))}
      </div>
    </div>
  );
}

function AssistantMessage({ msg }) {
  const { intent, pipeline, agents_called, results, total_tokens, total_latency_ms, error } = msg.data;

  if (error) {
    return (
      <div className="bg-rose-900/30 border border-rose-700/50 rounded-2xl p-4 text-rose-300 text-sm">
        <div className="font-semibold mb-1">Error</div>
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs bg-gray-700 border border-gray-600 text-gray-300 px-2 py-0.5 rounded-full font-medium">
          {INTENT_LABELS[intent] || intent}
        </span>
        {pipeline && (
          <span className="text-xs bg-indigo-900/40 border border-indigo-700/40 text-indigo-300 px-2 py-0.5 rounded-full">
            Pipeline · {agents_called?.length} agents
          </span>
        )}
        {agents_called?.map((a) => <AgentBadge key={a} name={a} />)}
      </div>
      <div className="space-y-3">
        {results?.filter((r) => r.status === 'done').map((r, i) => (
          <AgentOutputCard key={i} result={r} />
        ))}
        {results?.some((r) => r.status === 'failed') && (
          <div className="bg-rose-900/20 border border-rose-700/40 rounded-xl p-3 text-rose-300 text-sm">
            {results.filter((r) => r.status === 'failed').map((r, i) => (
              <div key={i}><span className="font-semibold">{r.agent_name}:</span> {r.error}</div>
            ))}
          </div>
        )}
      </div>
      <div className="text-xs text-gray-600 flex gap-3 pt-1">
        <span>{total_tokens} tokens total</span>
        <span>{total_latency_ms}ms</span>
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1.5 px-4 py-3 bg-gray-800/60 border border-gray-700/50 rounded-2xl w-fit">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-2 h-2 rounded-full bg-violet-400 animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
      <span className="text-xs text-gray-500 ml-1">AI agents working…</span>
    </div>
  );
}

export default function AIChatPage() {
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      type: 'welcome',
      text: '你好！我是 AI Investment Assistant。我可以分析你的投资组合、评估风险、提供调仓建议，以及追踪你的财务目标。请输入任何问题或点击下方快捷操作开始。',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const sendMessage = useCallback(async (text) => {
    const trimmed = (text || input).trim();
    if (!trimmed || loading) return;

    setInput('');
    setMessages((prev) => [
      ...prev,
      { id: Date.now(), role: 'user', text: trimmed },
    ]);
    setLoading(true);

    try {
      const res = await api.post('/agent/chat', { message: trimmed, token_budget: 600 });
      setMessages((prev) => [
        ...prev,
        { id: Date.now() + 1, role: 'assistant', type: 'agent', data: res.data },
      ]);
    } catch (err) {
      const errMsg = err.response?.data?.detail || err.message || 'Request failed';
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: 'assistant',
          type: 'agent',
          data: { error: errMsg, intent: 'unknown', results: [], total_tokens: 0, total_latency_ms: 0 },
        },
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }, [input, loading]);

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearMemory = async () => {
    try {
      await api.delete('/agent/memory');
      setMessages([{
        id: Date.now(),
        role: 'assistant',
        type: 'welcome',
        text: '对话记忆已清除。我们可以重新开始！',
      }]);
    } catch {}
  };

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] max-h-[900px]">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-black text-white leading-tight">AI Investment Assistant</h1>
            <p className="text-xs text-gray-500">Multi-agent powered analysis</p>
          </div>
        </div>
        <button
          onClick={clearMemory}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all border border-gray-700 hover:border-rose-500/30"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          Clear Memory
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {QUICK_ACTIONS.map((a) => (
          <button
            key={a.label}
            onClick={() => sendMessage(a.message)}
            disabled={loading}
            className="px-3 py-1.5 text-xs font-medium rounded-full bg-gray-800 border border-gray-700 text-gray-300 hover:bg-violet-600/20 hover:border-violet-500/50 hover:text-violet-300 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {a.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pr-2 pb-4 scrollbar-thin scrollbar-thumb-gray-700">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'user' ? (
              <div className="max-w-[75%] bg-violet-600/30 border border-violet-500/40 rounded-2xl rounded-tr-sm px-4 py-3 text-sm text-gray-100">
                {msg.text}
              </div>
            ) : msg.type === 'welcome' ? (
              <div className="max-w-[85%] bg-gray-800/60 border border-gray-700/50 rounded-2xl px-5 py-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">🤖</span>
                  <span className="text-sm font-bold text-violet-300">AI Investment Assistant</span>
                </div>
                <p className="text-sm text-gray-300">{msg.text}</p>
              </div>
            ) : (
              <div className="max-w-[90%] bg-gray-800/60 border border-gray-700/50 rounded-2xl rounded-tl-sm px-5 py-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-sm">🤖</span>
                  <span className="text-xs font-bold text-violet-300">AI Analysis</span>
                </div>
                <AssistantMessage msg={msg} />
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-800/60 border border-gray-700/50 rounded-2xl rounded-tl-sm px-5 py-4">
              <TypingIndicator />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="mt-4 bg-gray-800/80 border border-gray-700 rounded-2xl p-3 flex gap-3 items-end">
        <textarea
          ref={inputRef}
          rows={1}
          className="flex-1 bg-transparent text-sm text-gray-100 placeholder-gray-600 resize-none outline-none max-h-32 leading-relaxed"
          placeholder="Ask anything about your portfolio… (Enter to send)"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          disabled={loading}
        />
        <button
          onClick={() => sendMessage()}
          disabled={!input.trim() || loading}
          className="flex-shrink-0 w-9 h-9 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:bg-gray-700 disabled:cursor-not-allowed flex items-center justify-center transition-all"
        >
          {loading ? (
            <svg className="w-4 h-4 text-gray-400 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
            </svg>
          ) : (
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
