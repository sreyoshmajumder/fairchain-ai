import React, { useEffect, useState } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { getAudit } from '../config/api';

const SEV_COLOR = { low:'#3d7a2a', medium:'#a85f16', high:'#c0392b' };

export default function AuditResults() {
  const { id } = useParams();
  const loc     = useLocation();
  const [audit, setAudit] = useState(loc.state?.audit || null);

  useEffect(() => {
    if (!audit) getAudit(id).then(r => setAudit(r.data));
  }, [id]);

  if (!audit) return <div style={{ padding:'3rem', textAlign:'center' }}>Loading audit...</div>;

  const bfm = audit.baseline?.fairness_metrics || {};
  const mfm = audit.mitigated?.fairness_metrics || {};
  const sev = bfm.severity || 'medium';
  const sev_color = SEV_COLOR[sev] || '#a85f16';

  // Group chart data
  const groupData = Object.entries(audit.baseline?.group_metrics || {}).map(([grp, v]) => ({
    name: grp,
    'Baseline': Math.round((v.selection_rate||0)*100),
    'Mitigated': Math.round(((audit.mitigated?.group_metrics||{})[grp]?.selection_rate||0)*100),
  }));

  // Fairness comparison
  const metricComp = [
    { name:'Statistical Parity Diff',
      before: Math.round((bfm.statistical_parity_diff||0)*100),
      after:  Math.round((mfm.statistical_parity_diff||0)*100) },
    { name:'Equal Opportunity Diff',
      before: Math.round((bfm.equal_opportunity_diff||0)*100),
      after:  Math.round((mfm.equal_opportunity_diff||0)*100) },
    { name:'FP Rate Diff',
      before: Math.round((bfm.false_positive_rate_diff||0)*100),
      after:  Math.round((mfm.false_positive_rate_diff||0)*100) },
  ];

  const improvement = audit.improvement || {};
  const exp = audit.explanation || {};

  return (
    <main style={{ maxWidth:1100, margin:'0 auto', padding:'2.5rem 1.5rem' }}>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start',
        flexWrap:'wrap', gap:'1rem', marginBottom:'2rem' }}>
        <div>
          <div style={{ fontSize:'0.8rem', color:'#68655e', textTransform:'uppercase',
            letterSpacing:'0.1em', marginBottom:'0.4rem' }}>
            Audit ID: {audit.audit_id} · Domain: {audit.domain}
          </div>
          <h1 style={{ fontFamily:"'Georgia',serif", fontSize:'2rem', letterSpacing:'-0.04em', marginBottom:'0.3rem' }}>
            Fairness Audit Results
          </h1>
          <p style={{ color:'#68655e' }}>
            Sensitive attribute: <strong>{audit.sensitive_column}</strong>
            &nbsp;·&nbsp;Dataset: {audit.dataset_shape?.[0]} rows
          </p>
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <span style={{ padding:'0.5rem 1rem', borderRadius:999, fontWeight:700, fontSize:'0.85rem',
            background:`${sev_color}18`, color:sev_color, border:`1px solid ${sev_color}40` }}>
            {sev.toUpperCase()} RISK
          </span>
          <Link to={`/report/${audit.audit_id}`} state={{ audit }}
            style={{ padding:'0.5rem 1rem', borderRadius:999, fontWeight:700, fontSize:'0.85rem',
              background:'#0d6f73', color:'#fff', textDecoration:'none' }}>
            View Report →
          </Link>
        </div>
      </div>

      {/* Key metrics */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:12, marginBottom:'2rem' }}>
        {[
          { label:'Statistical Parity Diff', value:`${(bfm.statistical_parity_diff*100||0).toFixed(1)}%`, sub: `Reduced to ${(mfm.statistical_parity_diff*100||0).toFixed(1)}%` },
          { label:'Equal Opportunity Diff',  value:`${(bfm.equal_opportunity_diff*100||0).toFixed(1)}%`,  sub: `Reduced to ${(mfm.equal_opportunity_diff*100||0).toFixed(1)}%` },
          { label:'Least Favored Group', value: bfm.least_favored||'—', sub:'Receives fewest approvals' },
          { label:'Accuracy',            value:`${((audit.baseline?.overall_accuracy||0)*100).toFixed(1)}%`, sub:`After mitigation: ${((audit.mitigated?.overall_accuracy||0)*100).toFixed(1)}%` },
        ].map((m,i) => (
          <div key={i} style={{ background:'#fbfaf7', border:'1px solid rgba(37,34,27,0.1)',
            borderRadius:14, padding:'1.2rem', boxShadow:'0 2px 8px rgba(37,34,27,0.05)' }}>
            <div style={{ fontSize:'0.75rem', color:'#68655e', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:6 }}>{m.label}</div>
            <div style={{ fontSize:'1.4rem', fontWeight:800, marginBottom:4 }}>{m.value}</div>
            <div style={{ fontSize:'0.8rem', color:'#68655e' }}>{m.sub}</div>
          </div>
        ))}
      </div>

      {/* Charts side by side */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:'2rem' }}>
        <div style={{ background:'#fbfaf7', border:'1px solid rgba(37,34,27,0.1)', borderRadius:14, padding:'1.5rem' }}>
          <h2 style={{ fontSize:'1rem', fontWeight:700, marginBottom:'1rem' }}>Selection Rate by Group</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={groupData} margin={{ top:5, right:10, left:-20, bottom:5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(37,34,27,0.07)" />
              <XAxis dataKey="name" tick={{ fontSize:11 }} />
              <YAxis unit="%" tick={{ fontSize:11 }} />
              <Tooltip formatter={v=>`${v}%`} />
              <Legend />
              <Bar dataKey="Baseline"  fill={sev_color}  radius={[4,4,0,0]} />
              <Bar dataKey="Mitigated" fill="#3d7a2a"    radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={{ background:'#fbfaf7', border:'1px solid rgba(37,34,27,0.1)', borderRadius:14, padding:'1.5rem' }}>
          <h2 style={{ fontSize:'1rem', fontWeight:700, marginBottom:'1rem' }}>Fairness Metrics: Before vs After</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={metricComp} margin={{ top:5, right:10, left:-20, bottom:5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(37,34,27,0.07)" />
              <XAxis dataKey="name" tick={{ fontSize:10 }} />
              <YAxis unit="%" tick={{ fontSize:11 }} />
              <Tooltip formatter={v=>`${v}%`} />
              <Legend />
              <Bar dataKey="before" fill={sev_color} name="Before" radius={[4,4,0,0]} />
              <Bar dataKey="after"  fill="#3d7a2a"   name="After"  radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Gemini explanation */}
      <div style={{ background:'rgba(13,111,115,0.05)', border:'1px solid rgba(13,111,115,0.2)',
        borderRadius:14, padding:'1.5rem', marginBottom:'2rem' }}>
        <h2 style={{ fontWeight:700, marginBottom:'0.75rem', color:'#0d6f73' }}>
          🤖 AI Explanation {exp.source==='gemini' ? '(Gemini)' : '(Rule-based)'}
        </h2>
        <p style={{ color:'#25221b', lineHeight:1.7, marginBottom: exp.recommended_steps ? '1rem' : 0 }}>
          {exp.summary}
        </p>
        {exp.recommended_steps && (
          <>
            <h3 style={{ fontWeight:700, marginBottom:'0.5rem', marginTop:'1rem', fontSize:'0.95rem' }}>Recommended steps</h3>
            <ol style={{ paddingLeft:'1.2rem', display:'grid', gap:'0.5rem' }}>
              {exp.recommended_steps.map((s,i)=><li key={i} style={{ color:'#25221b', lineHeight:1.6 }}>{s}</li>)}
            </ol>
          </>
        )}
      </div>

      {/* Improvement summary */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
        {[
          { label:'SPD Reduction', value:`${(improvement.spd_reduction*100||0).toFixed(1)}%`, good: improvement.spd_reduction > 0 },
          { label:'EOD Reduction', value:`${(improvement.eod_reduction*100||0).toFixed(1)}%`, good: improvement.eod_reduction > 0 },
          { label:'Accuracy Change', value:`${(improvement.accuracy_change*100||0).toFixed(1)}%`, good: improvement.accuracy_change >= -0.02 },
        ].map((m,i)=>(
          <div key={i} style={{ background: m.good ? 'rgba(61,122,42,0.07)' : 'rgba(192,57,43,0.07)',
            border: `1px solid ${m.good ? 'rgba(61,122,42,0.2)' : 'rgba(192,57,43,0.2)'}`,
            borderRadius:12, padding:'1rem', textAlign:'center' }}>
            <div style={{ fontSize:'0.75rem', textTransform:'uppercase', letterSpacing:'0.1em',
              color: m.good ? '#3d7a2a' : '#c0392b', marginBottom:4 }}>{m.label}</div>
            <div style={{ fontSize:'1.6rem', fontWeight:800, color: m.good ? '#3d7a2a' : '#c0392b' }}>{m.value}</div>
          </div>
        ))}
      </div>
    </main>
  );
}