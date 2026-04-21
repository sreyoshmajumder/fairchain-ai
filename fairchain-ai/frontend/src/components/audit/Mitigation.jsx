import React from 'react';
import Metric from '../ui/Metric';
import Badge from '../ui/Badge';

export default function Mitigation({ baseline = {}, mitigated = {}, improvement = {} }) {
  const bfm = baseline.fairness_metrics  || {};
  const mfm = mitigated.fairness_metrics || {};
  const sev_before = bfm.severity || 'high';
  const sev_after  = mfm.severity || 'medium';

  const delta = (before, after) => {
    const d = ((before - after) * 100).toFixed(1);
    return { value: `${d}%`, improved: parseFloat(d) > 0 };
  };

  const spd  = delta(bfm.statistical_parity_diff  || 0, mfm.statistical_parity_diff  || 0);
  const eod  = delta(bfm.equal_opportunity_diff   || 0, mfm.equal_opportunity_diff   || 0);
  const accD = ((improvement.accuracy_change || 0) * 100).toFixed(1);

  return (
    <div style={{
      background: '#fbfaf7', border: '1px solid rgba(37,34,27,0.1)',
      borderRadius: 14, padding: '1.5rem',
    }}>
      <h3 style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '1rem' }}>
        🛠️ Mitigation Results (Reweighing)
      </h3>

      {/* Before → After severity */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1.2rem' }}>
        <Badge label={`Before: ${sev_before.toUpperCase()}`} variant={sev_before} />
        <span style={{ color: '#68655e', fontSize: '1.1rem' }}>→</span>
        <Badge label={`After: ${sev_after.toUpperCase()}`} variant={sev_after} />
      </div>

      {/* Improvement metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: '1.2rem' }}>
        <div style={{
          background: spd.improved ? 'rgba(61,122,42,0.07)' : 'rgba(192,57,43,0.07)',
          border: `1px solid ${spd.improved ? 'rgba(61,122,42,0.2)' : 'rgba(192,57,43,0.2)'}`,
          borderRadius: 12, padding: '1rem', textAlign: 'center',
        }}>
          <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.1em',
            color: spd.improved ? '#3d7a2a' : '#c0392b', marginBottom: 4 }}>SPD Reduction</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: spd.improved ? '#3d7a2a' : '#c0392b' }}>
            {spd.value}
          </div>
        </div>
        <div style={{
          background: eod.improved ? 'rgba(61,122,42,0.07)' : 'rgba(192,57,43,0.07)',
          border: `1px solid ${eod.improved ? 'rgba(61,122,42,0.2)' : 'rgba(192,57,43,0.2)'}`,
          borderRadius: 12, padding: '1rem', textAlign: 'center',
        }}>
          <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.1em',
            color: eod.improved ? '#3d7a2a' : '#c0392b', marginBottom: 4 }}>EOD Reduction</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: eod.improved ? '#3d7a2a' : '#c0392b' }}>
            {eod.value}
          </div>
        </div>
        <div style={{
          background: parseFloat(accD) >= -2 ? 'rgba(61,122,42,0.07)' : 'rgba(192,57,43,0.07)',
          border: `1px solid ${parseFloat(accD) >= -2 ? 'rgba(61,122,42,0.2)' : 'rgba(192,57,43,0.2)'}`,
          borderRadius: 12, padding: '1rem', textAlign: 'center',
        }}>
          <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.1em',
            color: parseFloat(accD) >= -2 ? '#3d7a2a' : '#c0392b', marginBottom: 4 }}>Accuracy Δ</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800,
            color: parseFloat(accD) >= -2 ? '#3d7a2a' : '#c0392b' }}>
            {accD}%
          </div>
        </div>
      </div>

      {/* Accuracy comparison */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Metric label="Baseline Accuracy" value={`${((baseline.overall_accuracy||0)*100).toFixed(1)}%`} />
        <Metric label="Mitigated Accuracy" value={`${((mitigated.overall_accuracy||0)*100).toFixed(1)}%`} accent />
      </div>
    </div>
  );
}