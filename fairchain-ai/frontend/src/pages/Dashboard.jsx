import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getHistory } from '../config/api';

const SEV_C = { low:'#3d7a2a', medium:'#a85f16', high:'#c0392b' };
const DOM_C  = { lending:'#0d6f73', hiring:'#6f52c8', healthcare:'#a85f16', insurance:'#3d7a2a' };

export default function Dashboard() {
  const [history, setHistory] = useState([]);
  useEffect(() => { getHistory().then(r => setHistory(r.data)); }, []);

  return (
    <main style={{ maxWidth:1100, margin:'0 auto', padding:'2.5rem 1.5rem' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'2rem' }}>
        <div>
          <h1 style={{ fontFamily:"'Georgia',serif", fontSize:'2rem', letterSpacing:'-0.04em', marginBottom:'0.3rem' }}>
            Audit Dashboard
          </h1>
          <p style={{ color:'#68655e' }}>{history.length} audits run in this session</p>
        </div>
        <Link to="/audit/new" style={{ background:'#0d6f73', color:'#fff', padding:'0.8rem 1.4rem',
          borderRadius:999, fontWeight:700, textDecoration:'none', fontSize:'0.9rem' }}>
          + New Audit
        </Link>
      </div>

      {history.length === 0 ? (
        <div style={{ textAlign:'center', padding:'4rem 2rem', background:'#fbfaf7',
          borderRadius:16, border:'1px solid rgba(37,34,27,0.1)' }}>
          <div style={{ fontSize:'2.5rem', marginBottom:'1rem' }}>⚖️</div>
          <h2 style={{ fontWeight:700, marginBottom:'0.5rem' }}>No audits yet</h2>
          <p style={{ color:'#68655e', marginBottom:'1.5rem' }}>Run your first fairness audit to see results here.</p>
          <Link to="/audit/new" style={{ background:'#0d6f73', color:'#fff', padding:'0.8rem 1.5rem',
            borderRadius:999, fontWeight:700, textDecoration:'none' }}>
            Start first audit
          </Link>
        </div>
      ) : (
        <div style={{ display:'grid', gap:12 }}>
          {history.map(a => (
            <Link key={a.audit_id} to={`/audit/${a.audit_id}`}
              style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
                background:'#fbfaf7', border:'1px solid rgba(37,34,27,0.1)', borderRadius:12,
                padding:'1.2rem 1.5rem', textDecoration:'none', color:'inherit',
                transition:'box-shadow 0.2s ease' }}
              onMouseOver={e=>e.currentTarget.style.boxShadow='0 4px 16px rgba(37,34,27,0.1)'}
              onMouseOut={e=>e.currentTarget.style.boxShadow='none'}>
              <div style={{ display:'flex', gap:12, alignItems:'center' }}>
                <span style={{ width:10, height:10, borderRadius:'50%',
                  background: DOM_C[a.domain]||'#0d6f73', display:'inline-block' }} />
                <span style={{ fontWeight:700, fontSize:'0.95rem' }}>{a.domain}</span>
                <span style={{ color:'#68655e', fontSize:'0.85rem' }}>· {a.sensitive_column}</span>
              </div>
              <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                <span style={{ padding:'0.3rem 0.8rem', borderRadius:999, fontSize:'0.78rem', fontWeight:700,
                  background:`${SEV_C[a.severity]||'#a85f16'}18`,
                  color: SEV_C[a.severity]||'#a85f16',
                  border:`1px solid ${SEV_C[a.severity]||'#a85f16'}40` }}>
                  {(a.severity||'unknown').toUpperCase()}
                </span>
                <span style={{ color:'#0d6f73', fontWeight:700, fontSize:'0.85rem' }}>View →</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}