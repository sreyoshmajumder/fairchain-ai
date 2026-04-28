import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, RadarChart, Radar, PolarGrid, PolarAngleAxis, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

/* ─── Particle Network Canvas ──────────────────────────── */
function ParticleCanvas() {
  const ref = useRef();
  useEffect(() => {
    const c = ref.current;
    const ctx = c.getContext('2d');
    let w = c.width = window.innerWidth;
    let h = c.height = window.innerHeight;
    let raf;
    const pts = Array.from({ length: 70 }, () => ({
      x: Math.random() * w, y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
      r: Math.random() * 1.2 + 0.4,
    }));
    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = w; if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h; if (p.y > h) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(20,184,166,0.55)';
        ctx.fill();
        for (let j = i + 1; j < pts.length; j++) {
          const q = pts[j];
          const d = Math.hypot(p.x - q.x, p.y - q.y);
          if (d < 120) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.strokeStyle = `rgba(20,184,166,${0.12 * (1 - d / 120)})`;
            ctx.lineWidth = 0.6;
            ctx.stroke();
          }
        }
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    const onResize = () => { w = c.width = window.innerWidth; h = c.height = window.innerHeight; };
    window.addEventListener('resize', onResize);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', onResize); };
  }, []);
  return (
    <canvas ref={ref} style={{
      position:'absolute', inset:0, width:'100%', height:'100%',
      pointerEvents:'none', zIndex:2,
    }} />
  );
}

/* ─── Animated Counter ──────────────────────────────────── */
function Counter({ to, suffix='', duration=1800 }) {
  const [val, setVal] = useState(0);
  const ref = useRef();
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      const start = performance.now();
      const run = (now) => {
        const p = Math.min((now - start) / duration, 1);
        const ease = 1 - Math.pow(1 - p, 3);
        setVal(Math.round(ease * to));
        if (p < 1) requestAnimationFrame(run);
      };
      requestAnimationFrame(run);
    }, { threshold: 0.5 });
    if (ref.current) io.observe(ref.current);
    return () => io.disconnect();
  }, [to, duration]);
  return <span ref={ref}>{val}{suffix}</span>;
}

/* ─── Slide-in on scroll ──────────────────────────────── */
function Reveal({ children, delay = 0, direction = 'up' }) {
  const [vis, setVis] = useState(false);
  const ref = useRef();
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVis(true); }, { threshold: 0.15 });
    if (ref.current) io.observe(ref.current);
    return () => io.disconnect();
  }, []);
  const from = direction === 'up' ? 'translateY(32px)' : direction === 'left' ? 'translateX(-32px)' : 'translateX(32px)';
  return (
    <div ref={ref} style={{
      opacity: vis ? 1 : 0,
      transform: vis ? 'none' : from,
      transition: `opacity 0.65s ease ${delay}s, transform 0.65s cubic-bezier(0.16,1,0.3,1) ${delay}s`,
    }}>
      {children}
    </div>
  );
}

/* ─── Demo chart data ──────────────────────────────────── */
const demoBarData = [
  { group: 'Urban', baseline: 72, mitigated: 68 },
  { group: 'Rural', baseline: 58, mitigated: 65 },
  { group: 'Suburban', baseline: 70, mitigated: 68 },
];
const demoRadarData = [
  { metric: 'Stat Parity', baseline: 60, mitigated: 85 },
  { metric: 'Equal Opp', baseline: 72, mitigated: 88 },
  { metric: 'FP Rate', baseline: 55, mitigated: 82 },
  { metric: 'Accuracy', baseline: 78, mitigated: 80 },
  { metric: 'Calibration', baseline: 65, mitigated: 83 },
];

export default function Landing() {
  /* Slideshow */
  const slides = [
    { bg:'linear-gradient(135deg, #0a0a0a 0%, #0d1f22 50%, #0a0a0a 100%)', label:'Lending Bias' },
    { bg:'linear-gradient(135deg, #0a0a0a 0%, #130d22 50%, #0a0a0a 100%)', label:'Hiring Discrimination' },
    { bg:'linear-gradient(135deg, #0a0a0a 0%, #1a1000 50%, #0a0a0a 100%)', label:'Healthcare Disparity' },
  ];
  const [slide, setSlide] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setSlide(s => (s + 1) % slides.length), 5000);
    return () => clearInterval(t);
  }, []);

  const domains = [
    { icon:'🏦', name:'Lending',    color:'#14b8a6', desc:'Detect bias in loan approvals, credit scoring, and risk assessment.' },
    { icon:'💼', name:'Hiring',     color:'#8b5cf6', desc:'Uncover discrimination in candidate shortlisting and ranking.' },
    { icon:'🏥', name:'Healthcare', color:'#f59e0b', desc:'Audit triage algorithms for unequal care across demographics.' },
    { icon:'🛡️', name:'Insurance',  color:'#22c55e', desc:'Examine claim approval models for unfair risk profiling.' },
  ];
  const features = [
    { n:'01', icon:'🔬', title:'Dataset Bias Scan',     tag:'Data Layer', desc:'Detect label imbalance, proxy variable risk, and group underrepresentation in seconds.' },
    { n:'02', icon:'📊', title:'Fairness Metrics',       tag:'ML Layer',   desc:'Statistical Parity, Equal Opportunity, FPR Difference — computed per demographic group.' },
    { n:'03', icon:'🛠️', title:'Automated Mitigation',  tag:'Fix',        desc:'Reweighing algorithm reduces bias with before/after accuracy tradeoff analysis.' },
    { n:'04', icon:'🧠', title:'Gemini AI Explanations', tag:'Google AI',  desc:'Plain-language findings, root cause, and prioritised action steps via Gemini 1.5 Flash.' },
    { n:'05', icon:'⛓️', title:'Blockchain Anchoring',   tag:'Web3',       desc:'SHA-256 report hash pinned to Polygon Amoy for tamper-proof compliance certificates.' },
    { n:'06', icon:'📋', title:'Compliance Reports',     tag:'Output',     desc:'GDPR Art. 22 and EU AI Act flags built into every exported report.' },
  ];
  const ticker = ['Statistical Parity','Equal Opportunity','Demographic Parity','Disparate Impact','Calibration','Individual Fairness','Counterfactual Fairness','Group Fairness','Predictive Equality'];

  return (
    <div style={{ background:'#0a0a0a', color:'#f0ede8', overflowX:'hidden' }}>

      {/* ══ HERO ══════════════════════════════════════════ */}
      <section style={{
        position:'relative', minHeight:'100vh',
        display:'flex', flexDirection:'column',
        alignItems:'center', justifyContent:'center',
        overflow:'hidden', padding:'8rem 1.5rem 5rem',
      }}>
        {/* Sliding gradient backgrounds */}
        {slides.map((s, i) => (
          <div key={i} style={{
            position:'absolute', inset:0, zIndex:0,
            background: s.bg,
            opacity: slide === i ? 1 : 0,
            transition:'opacity 1.5s ease',
          }} />
        ))}

        {/* Mesh overlay */}
        <div style={{
          position:'absolute', inset:0, zIndex:1,
          background:`
            radial-gradient(ellipse 80% 60% at 50% 0%, rgba(20,184,166,0.18) 0%, transparent 65%),
            radial-gradient(ellipse 40% 40% at 85% 65%, rgba(139,92,246,0.1) 0%, transparent 60%),
            radial-gradient(ellipse 40% 40% at 15% 80%, rgba(20,184,166,0.08) 0%, transparent 60%)
          `,
        }} />

        {/* Grid */}
        <div style={{
          position:'absolute', inset:0, zIndex:1,
          backgroundImage:'linear-gradient(rgba(20,184,166,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(20,184,166,0.03) 1px, transparent 1px)',
          backgroundSize:'60px 60px',
          maskImage:'radial-gradient(ellipse 80% 70% at 50% 0%, black 0%, transparent 75%)',
          WebkitMaskImage:'radial-gradient(ellipse 80% 70% at 50% 0%, black 0%, transparent 75%)',
        }} />

        <ParticleCanvas />

        {/* Hero content */}
        <div style={{ position:'relative', zIndex:3, textAlign:'center', maxWidth:900 }}>
          <div className="fade-up" style={{ marginBottom:'1.25rem' }}>
            <span className="badge badge-teal">
              <span style={{ width:6, height:6, borderRadius:'50%', background:'#14b8a6', display:'inline-block', animation:'glow-pulse 2s ease-in-out infinite' }} />
              Hack2Skill × Google for Developers 2026
            </span>
          </div>

          <h1 className="fade-up d1" style={{
            fontFamily:"'Space Grotesk', sans-serif",
            fontSize:'clamp(3rem, 8vw, 6.5rem)',
            fontWeight:700, lineHeight:1.05,
            letterSpacing:'-0.04em', color:'#fff',
            marginBottom:'1.25rem',
          }}>
            AI That's Fair<br/>
            <span className="gradient-text">By Design</span>
          </h1>

          <p className="fade-up d2" style={{
            fontSize:'clamp(1rem, 2vw, 1.2rem)',
            color:'rgba(255,255,255,0.5)',
            maxWidth:560, margin:'0 auto 2.5rem',
            lineHeight:1.75,
          }}>
            Detect hidden discrimination in datasets and ML models — measure, fix, and certify fairness on the blockchain.
          </p>

          <div className="fade-up d3" style={{ display:'flex', gap:'0.75rem', justifyContent:'center', flexWrap:'wrap' }}>
            <Link to="/audit/new" className="btn-primary" style={{ fontSize:'0.95rem', padding:'0.9rem 2rem' }}>
              Run Free Audit
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </Link>
            <Link to="/dashboard" className="btn-outline" style={{ fontSize:'0.95rem', padding:'0.9rem 2rem' }}>
              View Dashboard
            </Link>
          </div>

          {/* Slide indicators */}
          <div className="fade-up d4" style={{ display:'flex', justifyContent:'center', gap:8, marginTop:'3rem' }}>
            {slides.map((s, i) => (
              <button key={i} onClick={() => setSlide(i)} style={{
                padding:'0.35rem 0.9rem', borderRadius:'var(--r-full)',
                background: slide===i ? 'rgba(20,184,166,0.15)' : 'transparent',
                border: slide===i ? '1px solid rgba(20,184,166,0.4)' : '1px solid rgba(255,255,255,0.1)',
                color: slide===i ? '#14b8a6' : 'rgba(255,255,255,0.35)',
                fontSize:'0.72rem', fontWeight:600, letterSpacing:'0.06em',
                cursor:'pointer', transition:'all 0.3s ease',
              }}>{s.label}</button>
            ))}
          </div>
        </div>

        {/* Scroll cue */}
        <div style={{
          position:'absolute', bottom:'2.5rem', left:'50%', transform:'translateX(-50%)',
          zIndex:3, display:'flex', flexDirection:'column', alignItems:'center', gap:6,
          opacity:0.35,
        }}>
          <span style={{ fontSize:'0.65rem', letterSpacing:'0.2em', textTransform:'uppercase', color:'#a8a49e' }}>scroll</span>
          <div style={{ width:1, height:36, background:'linear-gradient(to bottom, #14b8a6, transparent)', animation:'float 2s ease-in-out infinite' }} />
        </div>
      </section>

      {/* ══ TICKER ════════════════════════════════════════ */}
      <div style={{
        borderTop:'1px solid rgba(255,255,255,0.06)',
        borderBottom:'1px solid rgba(255,255,255,0.06)',
        background:'rgba(20,184,166,0.04)',
        padding:'0.9rem 0', overflow:'hidden',
      }}>
        <div className="ticker-track">
          {[...ticker,...ticker].map((t, i) => (
            <span key={i} style={{
              display:'inline-flex', alignItems:'center', gap:14,
              padding:'0 2rem', fontSize:'0.75rem', fontWeight:600,
              letterSpacing:'0.1em', textTransform:'uppercase',
              color:'rgba(255,255,255,0.3)', whiteSpace:'nowrap',
            }}>
              <span style={{ color:'#14b8a6', fontSize:'0.5rem' }}>◆</span>
              {t}
            </span>
          ))}
        </div>
      </div>

      {/* ══ STATS ═════════════════════════════════════════ */}
      <section style={{ padding:'5rem 1.5rem', maxWidth:1100, margin:'0 auto' }}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px,1fr))', gap:'1rem' }}>
          {[
            { val:4,   suf:'',  label:'AI Domains',       icon:'🎯' },
            { val:6,   suf:'',  label:'Fairness Metrics',  icon:'📊' },
            { val:3,   suf:'s', label:'Avg Audit Time',    icon:'⚡' },
            { val:100, suf:'%', label:'Open Source',       icon:'🔓' },
          ].map((s, i) => (
            <Reveal key={i} delay={i * 0.08}>
              <div style={{
                background:'var(--bg-2)', border:'1px solid var(--border)',
                borderRadius:'var(--r-xl)', padding:'1.75rem',
                textAlign:'center', transition:'all 0.25s ease',
              }}>
                <div style={{ fontSize:'1.8rem', marginBottom:'0.5rem' }}>{s.icon}</div>
                <div style={{
                  fontFamily:"'Space Grotesk', sans-serif",
                  fontWeight:700, fontSize:'2.8rem',
                  letterSpacing:'-0.04em',
                  background:'linear-gradient(135deg, #14b8a6, #f59e0b)',
                  WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
                }}>
                  <Counter to={s.val} suffix={s.suf} />
                </div>
                <div style={{ fontSize:'0.82rem', color:'var(--text-3)', fontWeight:600, marginTop:4 }}>{s.label}</div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ══ LIVE DEMO CHARTS ══════════════════════════════ */}
      <section style={{
        padding:'5rem 1.5rem',
        background:'linear-gradient(180deg, transparent, rgba(20,184,166,0.03), transparent)',
      }}>
        <div style={{ maxWidth:1100, margin:'0 auto' }}>
          <Reveal>
            <div style={{ textAlign:'center', marginBottom:'3rem' }}>
              <span className="badge badge-teal" style={{ marginBottom:'0.75rem', display:'inline-flex' }}>Live Preview</span>
              <h2 style={{
                fontFamily:"'Space Grotesk', sans-serif", fontWeight:700,
                fontSize:'clamp(1.8rem, 4vw, 2.8rem)', letterSpacing:'-0.03em', color:'#fff',
              }}>
                See fairness analysis in action
              </h2>
              <p style={{ color:'var(--text-3)', marginTop:'0.75rem', fontSize:'0.95rem' }}>
                Real output from a healthcare domain audit
              </p>
            </div>
          </Reveal>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1.5rem' }}>
            {/* Bar chart */}
            <Reveal direction="left">
              <div style={{ background:'var(--bg-2)', border:'1px solid var(--border)', borderRadius:'var(--r-xl)', padding:'1.5rem' }}>
                <div style={{ marginBottom:'1rem' }}>
                  <span style={{ fontSize:'0.7rem', fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', color:'var(--text-3)' }}>Approval Rate by Group</span>
                  <h3 style={{ fontSize:'1rem', fontWeight:700, color:'#fff', marginTop:4 }}>Baseline vs Mitigated</h3>
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={demoBarData} barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="group" tick={{ fill:'rgba(255,255,255,0.45)', fontSize:11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill:'rgba(255,255,255,0.45)', fontSize:11 }} axisLine={false} tickLine={false} unit="%" domain={[0,100]} />
                    <Tooltip
                      contentStyle={{ background:'#1e1d1b', border:'1px solid rgba(255,255,255,0.1)', borderRadius:8, fontSize:12 }}
                      labelStyle={{ color:'#fff' }}
                      formatter={(v) => [`${v}%`]}
                    />
                    <Legend wrapperStyle={{ fontSize:11, color:'rgba(255,255,255,0.45)' }} />
                    <Bar dataKey="baseline"  name="Baseline"  fill="#ef4444" radius={[4,4,0,0]} />
                    <Bar dataKey="mitigated" name="Mitigated" fill="#14b8a6" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Reveal>

            {/* Radar chart */}
            <Reveal direction="right">
              <div style={{ background:'var(--bg-2)', border:'1px solid var(--border)', borderRadius:'var(--r-xl)', padding:'1.5rem' }}>
                <div style={{ marginBottom:'1rem' }}>
                  <span style={{ fontSize:'0.7rem', fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', color:'var(--text-3)' }}>Fairness Score Radar</span>
                  <h3 style={{ fontSize:'1rem', fontWeight:700, color:'#fff', marginTop:4 }}>Before vs After Mitigation</h3>
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <RadarChart data={demoRadarData}>
                    <PolarGrid stroke="rgba(255,255,255,0.08)" />
                    <PolarAngleAxis dataKey="metric" tick={{ fill:'rgba(255,255,255,0.45)', fontSize:10 }} />
                    <Radar name="Baseline"  dataKey="baseline"  stroke="#ef4444" fill="#ef4444" fillOpacity={0.12} strokeWidth={2} />
                    <Radar name="Mitigated" dataKey="mitigated" stroke="#14b8a6" fill="#14b8a6" fillOpacity={0.15} strokeWidth={2} />
                    <Legend wrapperStyle={{ fontSize:11, color:'rgba(255,255,255,0.45)' }} />
                    <Tooltip contentStyle={{ background:'#1e1d1b', border:'1px solid rgba(255,255,255,0.1)', borderRadius:8, fontSize:12 }} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </Reveal>
          </div>

          {/* Metric pills */}
          <Reveal delay={0.1}>
            <div style={{
              display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'1rem', marginTop:'1.5rem',
            }}>
              {[
                { label:'SPD Reduction', val:'-2.7%', color:'#4ade80', icon:'📉' },
                { label:'EOD Change',    val:'+4.8%', color:'#f87171', icon:'⚠️' },
                { label:'Acc. Change',   val:'+1.7%', color:'#4ade80', icon:'✅' },
              ].map((m, i) => (
                <div key={i} style={{
                  background:'var(--bg-2)', border:'1px solid var(--border)',
                  borderRadius:'var(--r-lg)', padding:'1.1rem 1.25rem',
                  display:'flex', flexDirection:'column', gap:4,
                }}>
                  <span style={{ fontSize:'0.7rem', fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', color:'var(--text-3)' }}>
                    {m.icon} {m.label}
                  </span>
                  <span style={{
                    fontFamily:"'Space Grotesk',sans-serif",
                    fontSize:'1.8rem', fontWeight:700, letterSpacing:'-0.03em',
                    color: m.color,
                  }}>{m.val}</span>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ══ DOMAINS ═══════════════════════════════════════ */}
      <section style={{ padding:'5rem 1.5rem', maxWidth:1100, margin:'0 auto' }}>
        <Reveal>
          <div style={{ textAlign:'center', marginBottom:'3rem' }}>
            <span className="badge badge-teal" style={{ marginBottom:'0.75rem', display:'inline-flex' }}>Supported Domains</span>
            <h2 style={{
              fontFamily:"'Space Grotesk',sans-serif", fontWeight:700,
              fontSize:'clamp(1.8rem, 4vw, 2.8rem)', letterSpacing:'-0.03em', color:'#fff',
            }}>
              Every domain where bias harms
            </h2>
          </div>
        </Reveal>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(240px,1fr))', gap:'1rem' }}>
          {domains.map((d, i) => (
            <Reveal key={i} delay={i * 0.07}>
              <DomainCard {...d} />
            </Reveal>
          ))}
        </div>
      </section>

      {/* ══ HOW IT WORKS ══════════════════════════════════ */}
      <section style={{
        padding:'5rem 1.5rem',
        background:'rgba(20,184,166,0.02)',
        borderTop:'1px solid rgba(255,255,255,0.05)',
        borderBottom:'1px solid rgba(255,255,255,0.05)',
      }}>
        <div style={{ maxWidth:880, margin:'0 auto' }}>
          <Reveal>
            <div style={{ textAlign:'center', marginBottom:'3rem' }}>
              <span className="badge badge-gold" style={{ marginBottom:'0.75rem', display:'inline-flex' }}>Pipeline</span>
              <h2 style={{
                fontFamily:"'Space Grotesk',sans-serif", fontWeight:700,
                fontSize:'clamp(1.8rem, 4vw, 2.8rem)', letterSpacing:'-0.03em', color:'#fff',
              }}>
                Full-stack fairness pipeline
              </h2>
            </div>
          </Reveal>
          <div style={{ display:'grid', gap:'0.75rem' }}>
            {features.map((f, i) => (
              <Reveal key={i} delay={i * 0.06} direction={i % 2 === 0 ? 'left' : 'right'}>
                <div style={{
                  display:'flex', alignItems:'flex-start', gap:'1.25rem',
                  padding:'1.25rem 1.5rem',
                  background:'var(--bg-2)', border:'1px solid var(--border)',
                  borderRadius:'var(--r-xl)',
                  transition:'all 0.25s ease',
                }}>
                  <span style={{
                    fontFamily:"'Space Grotesk',sans-serif",
                    fontSize:'0.72rem', fontWeight:700, color:'var(--text-3)',
                    letterSpacing:'0.08em', minWidth:28, paddingTop:3,
                  }}>{f.n}</span>
                  <div style={{
                    width:40, height:40, borderRadius:10, flexShrink:0,
                    background:'rgba(20,184,166,0.1)', border:'1px solid rgba(20,184,166,0.2)',
                    display:'grid', placeItems:'center', fontSize:'1.1rem',
                  }}>{f.icon}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:5 }}>
                      <span style={{ fontWeight:700, color:'#fff', fontSize:'0.95rem' }}>{f.title}</span>
                      <span className="badge badge-teal">{f.tag}</span>
                    </div>
                    <p style={{ fontSize:'0.875rem', color:'var(--text-2)', lineHeight:1.6 }}>{f.desc}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══ CTA ═══════════════════════════════════════════ */}
      <section style={{ padding:'7rem 1.5rem', textAlign:'center' }}>
        <Reveal>
          <div style={{
            maxWidth:680, margin:'0 auto',
            padding:'3.5rem 2.5rem',
            background:'linear-gradient(135deg, rgba(20,184,166,0.1) 0%, rgba(139,92,246,0.05) 100%)',
            border:'1px solid rgba(20,184,166,0.2)',
            borderRadius:'var(--r-2xl)',
            position:'relative', overflow:'hidden',
          }}>
            <div style={{
              position:'absolute', top:-100, left:'50%', transform:'translateX(-50%)',
              width:400, height:400, borderRadius:'50%',
              background:'radial-gradient(circle, rgba(20,184,166,0.12), transparent)',
              pointerEvents:'none',
            }} />
            <h2 style={{
              fontFamily:"'Space Grotesk',sans-serif", fontWeight:700,
              fontSize:'clamp(1.6rem, 4vw, 2.5rem)', letterSpacing:'-0.03em',
              color:'#fff', marginBottom:'0.75rem',
            }}>
              Make your AI fair,<br/>before it's too late.
            </h2>
            <p style={{ color:'rgba(255,255,255,0.4)', marginBottom:'2rem', fontSize:'0.95rem' }}>
              Run a complete bias audit in under 10 seconds.
            </p>
            <Link to="/audit/new" className="btn-primary" style={{ fontSize:'0.95rem', padding:'0.9rem 2.2rem' }}>
              Start Free Audit
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </Link>
          </div>
        </Reveal>
      </section>

      {/* Footer */}
      <footer style={{
        borderTop:'1px solid rgba(255,255,255,0.06)',
        padding:'1.75rem 2rem',
        display:'flex', justifyContent:'space-between', alignItems:'center',
        flexWrap:'wrap', gap:'1rem',
        color:'var(--text-3)', fontSize:'0.82rem',
      }}>
        <span>⚖ FairChain AI — Hack2Skill × Google for Developers 2026</span>
        <span>Built by <strong style={{ color:'#14b8a6' }}>Team Bugs</strong></span>
      </footer>
    </div>
  );
}

function DomainCard({ icon, name, color, desc }) {
  const [h, setH] = useState(false);
  return (
    <div onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)} style={{
      padding:'1.5rem', borderRadius:'var(--r-xl)',
      background: h ? `${color}0e` : 'var(--bg-2)',
      border: `1px solid ${h ? color+'40' : 'var(--border)'}`,
      transition:'all 0.3s cubic-bezier(0.16,1,0.3,1)',
      transform: h ? 'translateY(-5px)' : 'none',
      boxShadow: h ? `0 20px 50px ${color}15` : 'none',
    }}>
      <div style={{
        width:46, height:46, borderRadius:12, marginBottom:'0.9rem',
        background:`${color}18`, border:`1px solid ${color}30`,
        display:'grid', placeItems:'center', fontSize:'1.3rem',
        transition:'transform 0.3s ease',
        transform: h ? 'rotate(-6deg) scale(1.08)' : 'none',
      }}>{icon}</div>
      <h3 style={{ fontWeight:700, color: h ? '#fff' : 'var(--text)', fontSize:'1rem', marginBottom:'0.4rem' }}>{name}</h3>
      <p style={{ fontSize:'0.85rem', color:'var(--text-3)', lineHeight:1.6 }}>{desc}</p>
    </div>
  );
}