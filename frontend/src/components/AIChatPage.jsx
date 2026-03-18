import { useState, useRef, useEffect, useCallback } from 'react';
import api from '../services/api';

const SESSIONS_KEY = 'ai_chat_sessions_v1';
const ACTIVE_KEY   = 'ai_chat_active_v1';

const QUICK_ACTIONS = [
  { label: '📊 Portfolio Overview', message: 'Give me a complete portfolio overview' },
  { label: '⚠️ Risk Analysis',      message: 'Analyze my portfolio risk' },
  { label: '📈 Performance',        message: 'How is my portfolio performing? Which assets are top earners?' },
  { label: '⚖️ Rebalance',         message: 'How should I rebalance my portfolio allocation?' },
  { label: '🎯 Goals',              message: 'How is my financial goal progress?' },
  { label: '🌍 Market',             message: 'How does current market condition affect my holdings?' },
  { label: '📋 Full Report',        message: 'Generate a full investment analysis report' },
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

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function makeWelcomeMsg() {
  return {
    id: 'welcome-' + genId(),
    role: 'assistant',
    type: 'welcome',
    text: "Hello! I'm your AI Investment Assistant, powered by a multi-agent system. I can analyze your portfolio, assess risk, suggest rebalancing strategies, track your financial goals, and give you market context. Ask me anything — in English or Chinese.",
  };
}

function loadSessions() {
  try { return JSON.parse(localStorage.getItem(SESSIONS_KEY)) || []; } catch { return []; }
}

function saveSessions(sessions) {
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
}

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
        <span key={i} className="w-2 h-2 rounded-full bg-violet-400 animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }} />
      ))}
      <span className="text-xs text-gray-500 ml-1">AI agents working…</span>
    </div>
  );
}

export default function AIChatPage() {
  const [sessions, setSessions]       = useState(() => loadSessions());
  const [activeId, setActiveId]       = useState(() => localStorage.getItem(ACTIVE_KEY) || null);
  const [input, setInput]             = useState('');
  const [loading, setLoading]         = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  const activeSession = sessions.find((s) => s.id === activeId) || null;
  const messages = activeSession?.messages || [];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const persistSessions = (updated) => {
    setSessions(updated);
    saveSessions(updated);
  };

  const createNewSession = () => {
    const id = genId();
    const newSession = {
      id,
      title: 'New Conversation',
      messages: [makeWelcomeMsg()],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    const updated = [newSession, ...sessions];
    persistSessions(updated);
    setActiveId(id);
    localStorage.setItem(ACTIVE_KEY, id);
  };

  const deleteSession = (id) => {
    const updated = sessions.filter((s) => s.id !== id);
    persistSessions(updated);
    if (activeId === id) {
      const next = updated[0]?.id || null;
      setActiveId(next);
      if (next) localStorage.setItem(ACTIVE_KEY, next);
      else localStorage.removeItem(ACTIVE_KEY);
    }
  };

  const switchSession = (id) => {
    setActiveId(id);
    localStorage.setItem(ACTIVE_KEY, id);
    inputRef.current?.focus();
  };

  const updateActiveMessages = (msgs, firstUserText) => {
    setSessions((prev) => {
      const updated = prev.map((s) => {
        if (s.id !== activeId) return s;
        const title = s.title === 'New Conversation' && firstUserText
          ? firstUserText.slice(0, 40) + (firstUserText.length > 40 ? '…' : '')
          : s.title;
        return { ...s, messages: msgs, title, updatedAt: Date.now() };
      });
      saveSessions(updated);
      return updated;
    });
  };

  const sendMessage = useCallback(async (text) => {
    const trimmed = (text || input).trim();
    if (!trimmed || loading) return;

    let currentId = activeId;
    if (!currentId) {
      const id = genId();
      const newSession = {
        id,
        title: trimmed.slice(0, 40) + (trimmed.length > 40 ? '…' : ''),
        messages: [makeWelcomeMsg()],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      persistSessions([newSession, ...sessions]);
      setActiveId(id);
      localStorage.setItem(ACTIVE_KEY, id);
      currentId = id;
    }

    setInput('');
    const userMsg = { id: genId(), role: 'user', text: trimmed };

    setSessions((prev) => {
      const updated = prev.map((s) => {
        if (s.id !== currentId) return s;
        const title = s.title === 'New Conversation'
          ? trimmed.slice(0, 40) + (trimmed.length > 40 ? '…' : '')
          : s.title;
        return { ...s, messages: [...s.messages, userMsg], title, updatedAt: Date.now() };
      });
      saveSessions(updated);
      return updated;
    });

    setLoading(true);

    try {
      const res = await api.post('/agent/chat', {
        message: trimmed,
        token_budget: 600,
        session_id: currentId,
      });
      const aiMsg = { id: genId(), role: 'assistant', type: 'agent', data: res.data };
      setSessions((prev) => {
        const updated = prev.map((s) => {
          if (s.id !== currentId) return s;
          return { ...s, messages: [...s.messages, aiMsg], updatedAt: Date.now() };
        });
        saveSessions(updated);
        return updated;
      });
    } catch (err) {
      const errMsg = err.response?.data?.detail || err.message || 'Request failed';
      const errAiMsg = {
        id: genId(), role: 'assistant', type: 'agent',
        data: { error: errMsg, intent: 'unknown', results: [], total_tokens: 0, total_latency_ms: 0 },
      };
      setSessions((prev) => {
        const updated = prev.map((s) => {
          if (s.id !== currentId) return s;
          return { ...s, messages: [...s.messages, errAiMsg], updatedAt: Date.now() };
        });
        saveSessions(updated);
        return updated;
      });
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }, [input, loading, activeId, sessions]);

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const clearMemory = async () => {
    if (!activeId) return;
    try {
      await api.delete(`/agent/memory?session_id=${encodeURIComponent(activeId)}`);
    } catch {}
    const welcomeMsg = makeWelcomeMsg();
    setSessions((prev) => {
      const updated = prev.map((s) =>
        s.id === activeId ? { ...s, messages: [welcomeMsg], updatedAt: Date.now() } : s
      );
      saveSessions(updated);
      return updated;
    });
  };

  const formatTime = (ts) => {
    const d = new Date(ts);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  return (
    <div className="flex h-[calc(100vh-80px)] max-h-[900px] gap-0 overflow-hidden rounded-2xl border border-gray-800">
      {/* Sidebar */}
      <div className={`flex flex-col bg-gray-900 border-r border-gray-800 transition-all duration-300 ${sidebarOpen ? 'w-60 min-w-[240px]' : 'w-0 min-w-0 overflow-hidden'}`}>
        <div className="flex items-center justify-between px-3 py-3 border-b border-gray-800 flex-shrink-0">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">Conversations</span>
          <button onClick={createNewSession}
            className="w-6 h-6 rounded-lg bg-violet-600 hover:bg-violet-500 flex items-center justify-center transition-all"
            title="New conversation">
            <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-2 space-y-0.5 px-2 scrollbar-thin scrollbar-thumb-gray-700">
          {sessions.length === 0 && (
            <div className="text-xs text-gray-600 text-center py-8 px-3">
              No conversations yet.<br />Start a new one!
            </div>
          )}
          {sessions.map((s) => (
            <div key={s.id}
              onClick={() => switchSession(s.id)}
              className={`group flex items-start gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-all ${
                s.id === activeId
                  ? 'bg-violet-600/20 border border-violet-500/40'
                  : 'hover:bg-gray-800 border border-transparent'
              }`}>
              <svg className="w-3.5 h-3.5 text-gray-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <div className="flex-1 min-w-0">
                <div className={`text-xs font-medium truncate leading-tight ${s.id === activeId ? 'text-violet-200' : 'text-gray-300'}`}>
                  {s.title}
                </div>
                <div className="text-[10px] text-gray-600 mt-0.5">{formatTime(s.updatedAt)}</div>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); deleteSession(s.id); }}
                className="opacity-0 group-hover:opacity-100 w-5 h-5 rounded-md hover:bg-rose-500/20 flex items-center justify-center transition-all flex-shrink-0"
                title="Delete">
                <svg className="w-3 h-3 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex flex-col flex-1 min-w-0 bg-gray-950">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 flex-shrink-0">
          <div className="flex items-center gap-2">
            <button onClick={() => setSidebarOpen((v) => !v)}
              className="w-7 h-7 rounded-lg hover:bg-gray-800 flex items-center justify-center transition-all text-gray-500 hover:text-gray-300">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div>
              <h1 className="text-sm font-black text-white leading-tight">AI Investment Assistant</h1>
              <p className="text-[10px] text-gray-500">Multi-agent powered analysis</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={createNewSession}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-400 hover:text-violet-400 hover:bg-violet-500/10 rounded-lg transition-all border border-gray-700 hover:border-violet-500/30">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Chat
            </button>
            <button onClick={clearMemory}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all border border-gray-700 hover:border-rose-500/30"
              title="Clear AI memory for this conversation only">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Clear Session Memory
            </button>
          </div>
        </div>

        {/* Quick actions */}
        <div className="flex flex-wrap gap-2 px-4 py-2.5 border-b border-gray-800 flex-shrink-0">
          {QUICK_ACTIONS.map((a) => (
            <button key={a.label} onClick={() => sendMessage(a.message)} disabled={loading}
              className="px-3 py-1.5 text-xs font-medium rounded-full bg-gray-800 border border-gray-700 text-gray-300 hover:bg-violet-600/20 hover:border-violet-500/50 hover:text-violet-300 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
              {a.label}
            </button>
          ))}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto space-y-4 px-4 py-4 pb-4 scrollbar-thin scrollbar-thumb-gray-700">
          {!activeSession && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center space-y-3">
                <div className="text-5xl">💬</div>
                <p className="text-gray-400 text-sm">Select a conversation or start a new one.</p>
                <button onClick={createNewSession}
                  className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold rounded-xl transition-all">
                  Start New Chat
                </button>
              </div>
            </div>
          )}
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

        {/* Input */}
        <div className="px-4 pb-4 flex-shrink-0">
          <div className="bg-gray-800/80 border border-gray-700 rounded-2xl p-3 flex gap-3 items-end">
            <textarea ref={inputRef} rows={1}
              className="flex-1 bg-transparent text-sm text-gray-100 placeholder-gray-600 resize-none outline-none max-h-32 leading-relaxed"
              placeholder="Ask anything about your portfolio… (Enter to send)"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              disabled={loading}
            />
            <button onClick={() => sendMessage()} disabled={!input.trim() || loading}
              className="flex-shrink-0 w-9 h-9 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:bg-gray-700 disabled:cursor-not-allowed flex items-center justify-center transition-all">
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
      </div>
    </div>
  );
}
