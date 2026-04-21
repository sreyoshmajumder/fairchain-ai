import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Cell,
} from 'recharts';

const COLORS = ['#0d6f73','#6f52c8','#a85f16','#3d7a2a','#c0392b','#1a6fb5'];

export default function GroupBarChart({ groupMetrics = {}, mitigatedMetrics = {}, title = 'Selection Rate by Group' }) {
  const data = Object.entries(groupMetrics).map(([grp, v], i) => ({
    name: grp,
    Baseline:  Math.round((v.selection_rate || 0) * 100),
    Mitigated: Math.round(((mitigatedMetrics[grp]?.selection_rate) || 0) * 100),
  }));

  if (data.length === 0) return (
    <div style={{ textAlign: 'center', color: '#68655e', padding: '2rem' }}>No group data available</div>
  );

  return (
    <div style={{
      background: '#fbfaf7', border: '1px solid rgba(37,34,27,0.1)',
      borderRadius: 14, padding: '1.5rem',
    }}>
      <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '1rem' }}>{title}</h3>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(37,34,27,0.07)" />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
          <YAxis unit="%" tick={{ fontSize: 11 }} domain={[0, 100]} />
          <Tooltip formatter={v => `${v}%`} />
          <Legend />
          <Bar dataKey="Baseline"  fill="#c0392b" radius={[4,4,0,0]} />
          <Bar dataKey="Mitigated" fill="#3d7a2a" radius={[4,4,0,0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}