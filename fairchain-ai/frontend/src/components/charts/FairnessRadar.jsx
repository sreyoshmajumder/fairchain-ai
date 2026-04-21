import React from 'react';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

export default function FairnessRadar({ baselineMetrics = {}, mitigatedMetrics = {}, title = 'Fairness Profile' }) {
  const toScore = (v) => Math.max(0, Math.round((1 - (v || 0)) * 100));

  const data = [
    { metric: 'Selection\nEquality',  Baseline: toScore(baselineMetrics.statistical_parity_diff),  Mitigated: toScore(mitigatedMetrics.statistical_parity_diff)  },
    { metric: 'Equal\nOpportunity',   Baseline: toScore(baselineMetrics.equal_opportunity_diff),    Mitigated: toScore(mitigatedMetrics.equal_opportunity_diff)    },
    { metric: 'FP Rate\nEquality',    Baseline: toScore(baselineMetrics.false_positive_rate_diff),  Mitigated: toScore(mitigatedMetrics.false_positive_rate_diff)  },
  ];

  return (
    <div style={{
      background: '#fbfaf7', border: '1px solid rgba(37,34,27,0.1)',
      borderRadius: 14, padding: '1.5rem',
    }}>
      <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '1rem' }}>{title}</h3>
      <ResponsiveContainer width="100%" height={240}>
        <RadarChart cx="50%" cy="50%" outerRadius={80} data={data}>
          <PolarGrid stroke="rgba(37,34,27,0.1)" />
          <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11 }} />
          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
          <Tooltip formatter={v => `${v}/100`} />
          <Legend />
          <Radar name="Baseline"  dataKey="Baseline"  stroke="#c0392b" fill="#c0392b" fillOpacity={0.15} />
          <Radar name="Mitigated" dataKey="Mitigated" stroke="#3d7a2a" fill="#3d7a2a" fillOpacity={0.2}  />
        </RadarChart>
      </ResponsiveContainer>
      <p style={{ fontSize: '0.78rem', color: '#68655e', textAlign: 'center', marginTop: '0.5rem' }}>
        Higher score = more fair. 100 = perfectly equal treatment.
      </p>
    </div>
  );
}