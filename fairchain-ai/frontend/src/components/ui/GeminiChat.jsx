import { useState, useRef, useEffect, useCallback } from 'react';

const API = 'http://localhost:8000';

const SUGGESTIONS = [
  "What is Statistical Parity Difference?",
  "How does reweighing mitigation work?",
  "What does a high SPD value mean?",
  "Which domain should I audit first?",
  "How do I interpret the group breakdown?",
];

// ── Classify error message into user-friendly categories ─────────────────────
function classifyError(msg) {
  const s = (msg || '').toLowerCase();
  if (s.includes('429') || s.includes('quota') || s.includes('resource_exhausted') || s.includes('rate')) {
    return {
      icon: '🔄',
      title: 'Daily quota reached',
      body: 'All Gemini models have hit their free-tier limit for today. Quota resets at midnight Pacific Time.',
      hint: 'Fix: Go to console.cloud.google.com → create a NEW Google Cloud project → generate a new API key from that project → paste it in backend/.env as GEMINI_API_KEY',
      color: '#fb923c',
      bg:    'rgba(251,146,60,0.08)',
      border:'rgba(251,146,60,0.25)',
    };
  }
  if (s.includes('api key') || s.includes('api_key') || s.includes('403') || s.includes('invalid')) {
    return {
      icon: '🔑',
      title: 'Invalid API key',
      body: 'The Gemini API key is missing or invalid.',
      hint: 'Fix: Add GEMINI_API_KEY=your_key to backend/.env and restart uvicorn.',
      color: '#f87171',
      bg:    'rgba(248,113,113,0.08)',
      border:'rgba(248,113,113,0.25)',
    };
  }
  if (s.includes('not reachable') || s.includes('failed to fetch') || s.includes('networkerror')) {
    return {
      icon: '🔌',
      title: 'Backend offline',
      body: 'Cannot reach the FairChain AI backend.',
      hint: 'Fix: cd backend && python -m uvicorn main:app --reload --port 8000',
      color: '#f87171',
      bg:    'rgba(248,113,113,0.08)',
      border:'rgba(248,113,113,0.25)',
    };
  }
  if (s.includes('503') || s.includes('service unavailable')) {
    return {
      icon: '⚙️',
      title: 'Service unavailable',
      body: msg,
      hint: 'Check your backend/.env for GEMINI_API_KEY.',
      color: '#f87171',
      bg:    'rgba(248,113,113,0.08)',
      border:'rgba(248,113,113,0.25)',
    };
  }
  return {
    icon: '⚠️',
    title: 'Something went wrong',
    body: msg || 'Unknown error',
    hint: null,
    color: '#f87171',
    bg:    'rgba(248,113,113,0.08)',
    border:'rgba(248,113,113,0.25)',
  };
}

// ── Render markdown-lite text ─────────────────────────────────────────────────
const renderText = (text) => {
  if (!text) return null;
  return text.split('\n').map((line, i) => {
    const parts    = line.split(/\*\*(.*?)\*\*/g);
    const rendered = parts.map((part, j) =>
      j % 2 === 1
        ? <strong key={j} style={{ color: '#e2e8f0' }}>{part}</strong>
        : part
    );
    const isBullet = line.trim().startsWith('- ') || line.trim().startsWith('• ');
    if (isBullet) {
      return (
        <div key={i} style={{ display:'flex', gap:'0.5rem', margin:'0.2rem 0' }}>
          <span style={{ color:'#0d9a8c', flexShrink:0 }}>•</span>
          <span>{rendered}</span>
        </div>
      );
    }
    return line.trim()
      ? <p key={i} style={{ margin:'0.2rem 0', lineHeight:1.6 }}>{rendered}</p>
      : <div key={i} style={{ height:'0.35rem' }} />;
  });
};

// ── Typing indicator ──────────────────────────────────────────────────────────
const TypingDots = () => (
  <div style={{ display:'flex', gap:4, alignItems:'center', padding:'2px 0' }}>
    {[0,1,2].map(i => (
      <div key={i} style={{
        width:7, height:7, borderRadius:'50%', background:'#0d9a8c',
        animation:`fcBounce 1.2s ${i * 0.2}s infinite`,
      }} />
    ))}
  </div>
);

// ── Error card component ──────────────────────────────────────────────────────
const ErrorCard = ({ error, onDismiss }) => {
  const info = classifyError(error);
  const [showHint, setShowHint] = useState(false);
  return (
    <div style={{
      background:   info.bg,
      border:       `1px solid ${info.border}`,
      borderRadius: '0.75rem',
      padding:      '0.75rem 0.9rem',
      fontSize:     '0.8rem',
      lineHeight:    1.5,
    }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
        <div style={{ color: info.color, fontWeight:700, marginBottom:'0.25rem' }}>
          {info.icon} {info.title}
        </div>
        <button onClick={onDismiss} style={{
          background:'none', border:'none', color:'#64748b',
          cursor:'pointer', fontSize:'0.9rem', padding:0, lineHeight:1,
          fontFamily:'inherit',
        }}>✕</button>
      </div>
      <div style={{ color:'#94a3b8', marginBottom: info.hint ? '0.4rem' : 0 }}>
        {info.body}
      </div>
      {info.hint && (
        <>
          <button
            onClick={() => setShowHint(h => !h)}
            style={{
              background:'none', border:'none', padding:0, cursor:'pointer',
              color:'#5ecfca', fontSize:'0.75rem', fontFamily:'inherit',
              textDecoration:'underline',
            }}
          >
            {showHint ? '▲ Hide fix' : '▼ How to fix'}
          </button>
          {showHint && (
            <div style={{
              marginTop:'0.4rem', padding:'0.5rem 0.65rem',
              background:'rgba(255,255,255,0.04)', borderRadius:'0.5rem',
              color:'#94a3b8', fontFamily:'monospace', fontSize:'0.75rem',
              whiteSpace:'pre-wrap', wordBreak:'break-all',
            }}>
              {info.hint}
            </div>
          )}
        </>
      )}
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════════════
export default function GeminiChat() {
  const [open, setOpen]               = useState(false);
  const [messages, setMessages]       = useState([]);
  const [input, setInput]             = useState('');
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');
  const [unread, setUnread]           = useState(0);
  const [showSuggest, setShowSuggest] = useState(true);
  const [modelUsed, setModelUsed]     = useState('');

  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior:'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 150);
      setUnread(0);
    }
  }, [open]);

  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{
        role:    'model',
        content: "👋 Hi! I'm **FairBot**, your AI fairness expert.\n\nAsk me anything about bias metrics, audit results, or how FairChain AI works!",
        ts: Date.now(),
      }]);
    }
  }, [open]);

  const sendMessage = useCallback(async (text) => {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;

    setInput('');
    setError('');
    setShowSuggest(false);

    const userMsg      = { role:'user', content:msg, ts:Date.now() };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setLoading(true);

    try {
      // Send last 10 messages as history for multi-turn context
      const history = nextMessages
        .slice(-11, -1)
        .map(m => ({ role: m.role, content: m.content }));

      const res = await fetch(`${API}/chat/message`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ message: msg, history }),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.detail || `HTTP ${res.status}`);
      }

      const data = await res.json();

      setMessages(prev => [
        ...prev,
        { role:'model', content:data.reply, ts:Date.now() },
      ]);
      if (data.model) setModelUsed(data.model);
      if (!open) setUnread(u => u + 1);

    } catch (e) {
      const raw = e.message || String(e);
      // Detect network failure (server down)
      if (e instanceof TypeError && raw.toLowerCase().includes('fetch')) {
        setError('Backend not reachable. Is uvicorn running on port 8000?');
      } else {
        setError(raw);
      }
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, open]);

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([]);
    setShowSuggest(true);
    setError('');
    setModelUsed('');
    setTimeout(() => setMessages([{
      role:    'model',
      content: "Chat cleared! 🧹 What would you like to know?",
      ts: Date.now(),
    }]), 80);
  };

  return (
    <>
      {/* ── Global animations ── */}
      <style>{`
        @keyframes fcBounce {
          0%,80%,100% { transform:scale(.7);   opacity:.5; }
          40%          { transform:scale(1.15); opacity:1;  }
        }
        @keyframes fcSlideIn {
          from { opacity:0; transform:translateY(20px) scale(.95); }
          to   { opacity:1; transform:translateY(0)    scale(1);   }
        }
        @keyframes fcPulse {
          0%   { transform:scale(1);    opacity:.7; }
          70%  { transform:scale(1.65); opacity:0;  }
          100% { transform:scale(1.65); opacity:0;  }
        }
        @keyframes fcSpin { to { transform:rotate(360deg); } }
        .fc-scroll::-webkit-scrollbar { width:4px; }
        .fc-scroll::-webkit-scrollbar-thumb {
          background:rgba(255,255,255,0.12); border-radius:99px;
        }
        .fc-suggest-btn:hover {
          background:rgba(13,154,140,0.25) !important;
          border-color:rgba(13,154,140,0.6) !important;
        }
      `}</style>

      {/* ══════════════════════════════════════════
          CHAT WINDOW
      ══════════════════════════════════════════ */}
      {open && (
        <div style={{
          position:      'fixed',
          bottom:        '5.5rem',
          right:         '1.5rem',
          width:         'min(390px, calc(100vw - 2rem))',
          height:        'min(580px, calc(100vh - 8rem))',
          background:    '#0f172a',
          border:        '1px solid rgba(13,154,140,0.4)',
          borderRadius:  '1.25rem',
          boxShadow:     '0 24px 64px rgba(0,0,0,.7), 0 0 0 1px rgba(13,154,140,0.15)',
          display:       'flex',
          flexDirection: 'column',
          overflow:      'hidden',
          animation:     'fcSlideIn 0.25s cubic-bezier(0.16,1,0.3,1)',
          pointerEvents: 'all',
          zIndex:        2147483647,
        }}>

          {/* ── Header ── */}
          <div style={{
            padding:    '0.9rem 1rem',
            background: 'linear-gradient(135deg, #0d9a8c, #0a7a70)',
            display:    'flex',
            alignItems: 'center',
            gap:        '0.65rem',
            flexShrink: 0,
          }}>
            <div style={{
              width:36, height:36, borderRadius:'50%',
              background:'rgba(255,255,255,.18)',
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:'1.1rem', flexShrink:0,
            }}>🤖</div>

            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontWeight:700, fontSize:'0.95rem', color:'#fff' }}>
                FairBot
              </div>
              <div style={{
                fontSize:'0.7rem', color:'rgba(255,255,255,.8)',
                display:'flex', alignItems:'center', gap:'0.35rem',
                overflow:'hidden',
              }}>
                <span style={{
                  width:6, height:6, borderRadius:'50%',
                  background:'#4ade80', display:'inline-block', flexShrink:0,
                }} />
                {modelUsed
                  ? `${modelUsed} · Fairness Expert`
                  : 'Powered by Gemini · Fairness Expert'}
              </div>
            </div>

            <button onClick={clearChat} title="Clear chat" style={{
              background:'rgba(255,255,255,.15)', border:'none',
              borderRadius:'0.4rem', padding:'0.3rem 0.55rem',
              color:'#fff', cursor:'pointer', fontSize:'0.8rem', fontFamily:'inherit',
            }}>🗑️</button>

            <button onClick={() => setOpen(false)} style={{
              background:'rgba(255,255,255,.15)', border:'none',
              borderRadius:'0.4rem', padding:'0.3rem 0.7rem',
              color:'#fff', cursor:'pointer', fontSize:'1rem',
              lineHeight:1, fontFamily:'inherit',
            }}>✕</button>
          </div>

          {/* ── Messages ── */}
          <div className="fc-scroll" style={{
            flex:1, overflowY:'auto', padding:'1rem',
            display:'flex', flexDirection:'column', gap:'0.8rem',
          }}>
            {messages.map((m, i) => (
              <div key={i} style={{
                display:        'flex',
                justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
                alignItems:     'flex-end',
                gap:            '0.5rem',
              }}>
                {m.role === 'model' && (
                  <div style={{
                    width:28, height:28, borderRadius:'50%', flexShrink:0,
                    background:'linear-gradient(135deg,#0d9a8c,#0a7a70)',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:'0.72rem', marginBottom:2,
                  }}>🤖</div>
                )}
                <div style={{
                  maxWidth:              '84%',
                  padding:               '0.65rem 0.9rem',
                  borderRadius:          '1rem',
                  borderBottomRightRadius: m.role === 'user'  ? '0.25rem' : '1rem',
                  borderBottomLeftRadius:  m.role === 'model' ? '0.25rem' : '1rem',
                  background: m.role === 'user'
                    ? 'linear-gradient(135deg,#0d9a8c,#0a7a70)'
                    : 'rgba(255,255,255,0.07)',
                  border: m.role === 'model'
                    ? '1px solid rgba(255,255,255,0.08)' : 'none',
                  color:      m.role === 'user' ? '#fff' : '#cbd5e1',
                  fontSize:   '0.875rem',
                  lineHeight: 1.6,
                  wordBreak:  'break-word',
                }}>
                  {m.role === 'model' ? renderText(m.content) : m.content}
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {loading && (
              <div style={{ display:'flex', alignItems:'flex-end', gap:'0.5rem' }}>
                <div style={{
                  width:28, height:28, borderRadius:'50%',
                  background:'linear-gradient(135deg,#0d9a8c,#0a7a70)',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:'0.72rem',
                }}>🤖</div>
                <div style={{
                  background:'rgba(255,255,255,.07)',
                  border:'1px solid rgba(255,255,255,.08)',
                  borderRadius:'1rem', borderBottomLeftRadius:'0.25rem',
                  padding:'0.65rem 0.9rem',
                }}>
                  <TypingDots />
                </div>
              </div>
            )}

            {/* Error card — shown inline in the message area */}
            {error && (
              <ErrorCard error={error} onDismiss={() => setError('')} />
            )}

            <div ref={bottomRef} />
          </div>

          {/* ── Suggestions ── */}
          {showSuggest && messages.length <= 1 && (
            <div style={{
              padding:'0 1rem 0.75rem',
              display:'flex', flexWrap:'wrap', gap:'0.4rem',
            }}>
              {SUGGESTIONS.map((s, i) => (
                <button
                  key={i}
                  className="fc-suggest-btn"
                  onClick={() => sendMessage(s)}
                  style={{
                    padding:'0.28rem 0.65rem', borderRadius:'9999px', cursor:'pointer',
                    background:'rgba(13,154,140,0.12)',
                    border:'1px solid rgba(13,154,140,0.3)',
                    color:'#5ecfca', fontSize:'0.73rem', fontWeight:500,
                    whiteSpace:'nowrap', fontFamily:'inherit', transition:'all .15s',
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* ── Input bar ── */}
          <div style={{
            padding:   '0.75rem 1rem',
            borderTop: '1px solid rgba(255,255,255,0.07)',
            background:'#0c1526',
            display:   'flex',
            gap:       '0.5rem',
            alignItems:'flex-end',
            flexShrink:0,
          }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              onInput={e => {
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 110) + 'px';
              }}
              onFocus={e  => e.target.style.borderColor = 'rgba(13,154,140,0.6)'}
              onBlur={e   => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
              placeholder="Ask about fairness, bias, or audits… (Enter to send)"
              rows={1}
              disabled={loading}
              style={{
                flex:        1,
                background:  'rgba(255,255,255,0.07)',
                border:      '1px solid rgba(255,255,255,0.1)',
                borderRadius:'0.75rem',
                padding:     '0.6rem 0.85rem',
                color:       '#e2e8f0',
                fontSize:    '0.875rem',
                resize:      'none',
                outline:     'none',
                lineHeight:  1.5,
                fontFamily:  'inherit',
                maxHeight:   110,
                overflowY:   'auto',
                transition:  'border-color .15s',
              }}
            />
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || loading}
              style={{
                width:38, height:38, borderRadius:'0.6rem', border:'none',
                background: (!input.trim() || loading)
                  ? 'rgba(255,255,255,.07)' : '#0d9a8c',
                color: (!input.trim() || loading) ? '#475569' : '#fff',
                cursor: (!input.trim() || loading) ? 'not-allowed' : 'pointer',
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:'1rem', flexShrink:0, fontFamily:'inherit',
                transition:'all .15s',
              }}
              onMouseOver={e => {
                if (input.trim() && !loading)
                  e.currentTarget.style.background = '#0b857a';
              }}
              onMouseOut={e => {
                if (input.trim() && !loading)
                  e.currentTarget.style.background = '#0d9a8c';
              }}
            >
              {loading
                ? <div style={{
                    width:16, height:16, borderRadius:'50%',
                    border:'2px solid rgba(255,255,255,.25)',
                    borderTopColor:'#fff',
                    animation:'fcSpin .7s linear infinite',
                  }} />
                : '➤'}
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          FAB TRIGGER BUTTON
      ══════════════════════════════════════════ */}
      <button
        onClick={() => setOpen(o => !o)}
        title={open ? 'Close FairBot' : 'Ask FairBot'}
        style={{
          position:       'fixed',
          bottom:         '1.5rem',
          right:          '1.5rem',
          width:          56, height:56,
          borderRadius:   '50%', border:'none',
          background:     open
            ? 'rgba(30,41,59,0.95)'
            : 'linear-gradient(135deg, #0d9a8c 0%, #0a7a70 100%)',
          color:          '#fff', cursor:'pointer',
          pointerEvents:  'all',
          zIndex:         2147483647,
          display:        'flex', alignItems:'center', justifyContent:'center',
          fontSize:       '1.5rem',
          boxShadow:      open
            ? '0 4px 16px rgba(0,0,0,.5)'
            : '0 4px 24px rgba(13,154,140,.6), 0 2px 8px rgba(0,0,0,.4)',
          transition:     'all .25s cubic-bezier(0.16,1,0.3,1)',
          transform:      open ? 'rotate(90deg) scale(0.9)' : 'scale(1)',
          fontFamily:     'inherit',
        }}
        onMouseOver={e => { if (!open) e.currentTarget.style.transform = 'scale(1.12)'; }}
        onMouseOut={e  => { if (!open) e.currentTarget.style.transform = open ? 'rotate(90deg) scale(0.9)' : 'scale(1)'; }}
      >
        {open ? '✕' : '🤖'}

        {/* Unread badge */}
        {!open && unread > 0 && (
          <div style={{
            position:'absolute', top:-3, right:-3,
            width:20, height:20, borderRadius:'50%',
            background:'#f87171', fontSize:'0.68rem', fontWeight:700,
            display:'flex', alignItems:'center', justifyContent:'center',
            border:'2px solid #0a0f1e', color:'#fff',
          }}>{unread}</div>
        )}
      </button>

      {/* Pulse ring */}
      {!open && (
        <div style={{
          position:     'fixed',
          bottom:       '1.5rem', right:'1.5rem',
          width:56, height:56, borderRadius:'50%',
          border:       '2px solid rgba(13,154,140,0.5)',
          animation:    'fcPulse 2.5s ease-out infinite',
          pointerEvents:'none',
          zIndex:       2147483646,
        }} />
      )}
    </>
  );
}