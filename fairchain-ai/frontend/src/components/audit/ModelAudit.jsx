import React from 'react';
import Badge from '../ui/Badge';
import Metric from '../ui/Metric';

export default function ModelAudit({ baseline = {}, sensitiveColumn = '' }) {
  const { group_metrics = {}, fairness_metrics = {}, overall_accuracy } = baseline;
  const sev = fairness_metrics.severity || 'medium';

  return (
    <div style={{
      background: '#fbfaf7', border: '1px solid rgba(37,34,27,0.1)',
      borderRadius: 14, padding: '1.5rem',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
        <h3 style={{ fontWeight: 700, fontSize: '0.95rem' }}>🤖 Model Fairness Audit</h3>
        <Badge label={`${sev.toUpperCase()} RISK`} variant={sev} />
      </div>

      {/* Overall metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: 10, marginBottom: '1.2rem' }}>
        <Metric label="Model Accuracy"         value={`${((overall_accuracy||0)*100).toFixed(1)}%`} />
        <Metric label="Stat. Parity Diff"      value={`${((fairness_metrics.statistical_parity_diff||0)*100).toFixed(1)}%`}
          color={sev==='high'?'#c0392b':sev==='medium'?'#a85f16':'#3d7a2a'} />
        <Metric label="Equal Opp. Diff"        value={`${((fairness_metrics.equal_opportunity_diff||0)*100).toFixed(1)}%`}
          color={sev==='high'?'#c0392b':sev==='medium'?'#a85f16':'#3d7a2a'} />
        <Metric label="Least Favored"          value={fairness_metrics.least_favored || '—'}
          sub={`on: ${sensitiveColumn}`} />
      </div>

      {/* Per-group table */}
      {Object.keys(group_metrics).length > 0 && (
        <>
          <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.1em',
            color: '#68655e', marginBottom: 8 }}>Per-Group Breakdown</div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(37,34,27,0.1)' }}>
                  {['Group','Count','Accuracy','Selection Rate','TPR','FPR'].map(h => (
                    <th key={h} style={{ padding: '0.5rem 0.75rem', textAlign: 'left',
                      color: '#68655e', fontWeight: 600, fontSize: '0.78rem',
                      textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.entries(group_metrics).map(([grp, v], i) => (
                  <tr key={grp} style={{ borderBottom: '1px solid rgba(37,34,27,0.06)',
                    background: i%2===0 ? 'transparent' : 'rgba(37,34,27,0.02)' }}>
                    <td style={{ padding: '0.55rem 0.75rem', fontWeight: 700 }}>{grp}</td>
                    <td style={{ padding: '0.55rem 0.75rem', color: '#68655e' }}>{v.count}</td>
                    <td style={{ padding: '0.55rem 0.75rem' }}>{(v.accuracy*100).toFixed(1)}%</td>
                    <td style={{ padding: '0.55rem 0.75rem', fontWeight: 700,
                      color: grp===fairness_metrics.least_favored?'#c0392b':grp===fairness_metrics.most_favored?'#3d7a2a':'#25221b' }}>
                      {(v.selection_rate*100).toFixed(1)}%
                    </td>
                    <td style={{ padding: '0.55rem 0.75rem' }}>{(v.true_positive_rate*100).toFixed(1)}%</td>
                    <td style={{ padding: '0.55rem 0.75rem' }}>{(v.false_positive_rate*100).toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}