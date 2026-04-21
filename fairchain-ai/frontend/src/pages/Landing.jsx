import React from 'react';
import { Link } from 'react-router-dom';

const domains = [
  { id:'lending',   label:'Lending',     icon:'🏦', color:'#0d6f73', desc:'Detect unfairness in loan approval decisions.' },
  { id:'hiring',    label:'Hiring',      icon:'💼', color:'#6f52c8', desc:'Audit bias in candidate shortlisting.' },
  { id:'healthcare',label:'Healthcare',  icon:'🏥', color:'#a85f16', desc:'Inspect triage prioritization systems.' },
  { id:'insurance', label:'Insurance',   icon:'🛡️', color:'#3d7a2a', desc:'Check risk scoring for discriminatory patterns.' },
];

export default function Landing() {
  return (
    <main style={{ maxWidth:1240, margin:'0 auto', padding:'3rem 1.5rem' }}>
      {/* Hero */}
      <div style={{ textAlign:'center', marginBottom:'4rem' }}>
        <span style={{ display:'inline-block', background:'rgba(13,111,115,0.1)', color:'#0d6f73',
          border:'1px solid rgba(13,111,115,0.2)', borderRadius:999, padding:'0.4rem 1rem',
          fontSize:'0.85rem', fontWeight:700, marginBottom:'1.5rem' }}>
          Google Cloud + Blockchain Fairness Auditing
        </span>
        <h1 style={{ fontSize:'clamp(2.5rem,6vw,4.5rem)', lineHeight:0.95,
          letterSpacing:'-0.045em', fontFamily:"'Georgia',serif", marginBottom:'1.2rem' }}>
          AI should decide fairly.<br/>
          <span style={{ color:'#0d6f73' }}>FairChain ensures it does.</span>
        </h1>
        <p style={{ color:'#68655e', maxWidth:600, margin:'0 auto 2rem', fontSize:'1.1rem', lineHeight:1.7 }}>
          Detect bias in automated decisions across lending, hiring, healthcare, and insurance.
          Explain the harm, apply mitigation, and anchor the proof on-chain.
        </p>
        <div style={{ display:'flex', gap:12, justifyContent:'center', flexWrap:'wrap' }}>
          <Link to="/audit/new" style={{ background:'#0d6f73', color:'#fff', padding:'1rem 1.5rem',
            borderRadius:999, fontWeight:700, textDecoration:'none', fontSize:'0.95rem',
            boxShadow:'0 8px 24px rgba(13,111,115,0.3)' }}>
            Start your first audit →
          </Link>
          <Link to="/dashboard" style={{ background:'#fbfaf7', color:'#25221b', padding:'1rem 1.5rem',
            borderRadius:999, fontWeight:700, textDecoration:'none', fontSize:'0.95rem',
            border:'1px solid rgba(37,34,27,0.12)' }}>
            View dashboard
          </Link>
        </div>
      </div>
      {/* Domain cards */}
      <h2 style={{ fontSize:'1.6rem', fontWeight:800, letterSpacing:'-0.03em', marginBottom:'1.5rem', textAlign:'center' }}>
        4 high-impact domains
      </h2>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))', gap:16, marginBottom:'4rem' }}>
        {domains.map(d => (
          <div key={d.id} style={{ background:'#fbfaf7', border:'1px solid rgba(37,34,27,0.1)',
            borderRadius:18, padding:'1.5rem', boxShadow:'0 2px 8px rgba(37,34,27,0.05)' }}>
            <div style={{ fontSize:'2rem', marginBottom:'0.75rem' }}>{d.icon}</div>
            <h3 style={{ fontWeight:700, marginBottom:'0.4rem', color:d.color }}>{d.label}</h3>
            <p style={{ color:'#68655e', fontSize:'0.9rem', lineHeight:1.6 }}>{d.desc}</p>
          </div>
        ))}
      </div>
      {/* How it works */}
      <h2 style={{ fontSize:'1.6rem', fontWeight:800, letterSpacing:'-0.03em', marginBottom:'1.5rem', textAlign:'center' }}>
        How it works
      </h2>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:16 }}>
        {['Upload data or use sample dataset','AI detects bias in data and model','Gemini explains the harm in plain language','Apply mitigation to reduce unfairness','Generate report & anchor proof on blockchain'].map((s,i)=>(
          <div key={i} style={{ background:'#fbfaf7', border:'1px solid rgba(37,34,27,0.1)',
            borderRadius:14, padding:'1.2rem', display:'flex', gap:12, alignItems:'flex-start' }}>
            <span style={{ width:28, height:28, background:'#0d6f73', color:'#fff', borderRadius:'50%',
              display:'grid', placeItems:'center', fontSize:'0.8rem', fontWeight:800, flexShrink:0 }}>
              {i+1}
            </span>
            <span style={{ color:'#25221b', fontSize:'0.9rem', lineHeight:1.5 }}>{s}</span>
          </div>
        ))}
      </div>
    </main>
  );
}