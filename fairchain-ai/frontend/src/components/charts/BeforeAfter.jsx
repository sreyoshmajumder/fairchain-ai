import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

export default function BeforeAfter({ baselineMetrics = {}, mitigatedMetrics = {}, title = 'Fairness Metrics: Before vs After' }) {
  const metrics = [
    {
      name: 'Stat. Parity Diff',
      Before: Math.round((baselineMetrics.statistical_parity_diff  || 0) * 100),
      After:  Math.round((mitigatedMetrics.statistical_parity_diff || 0) * 100),
    },
    {
      name: 'Equal Opp. Diff',
      Before: Math.round((baselineMetrics.equal_opportunity_diff   || 0) * 100),
      After:  Math.round((mitigatedMetrics.equal_opportunity_diff  || 0) * 100),
    },
    {
      name: 'FP Rate Diff',
      Before: Math.round((baselineMetrics.false_positive_rate_diff  || 0) * 100),
      After:  Math.round((mitigatedMetrics.false_positive_rate_diff || 0) * 100),
    },
  ];

  return (
    <div style={{
      background: '#fbfaf7', border: '1px solid rgba(37,34,27,0.1)',
      borderRadius: 14, padding: '1.5rem',
    }}>
      <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '1rem' }}>{title}</h3>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={metrics} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(37,34,27,0.07)" />
          <XAxis dataKey="name" tick={{ fontSize: 10 }} />
          <YAxis unit="%" tick={{ fontSize: 11 }} />
          <Tooltip formatter={v => `${v}%`} />
          <Legend />
          <Bar dataKey="Before" fill="#c0392b" radius={[4,4,0,0]} />
          <Bar dataKey="After"  fill="#3d7a2a" radius={[4,4,0,0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}