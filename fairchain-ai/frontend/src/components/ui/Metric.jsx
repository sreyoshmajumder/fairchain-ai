import React from 'react';

export default function Metric({ label, value, sub, accent = false, color }) {
  return (
    <div style={{
      background: '#fbfaf7',
      border: accent ? `1px solid rgba(13,111,115,0.2)` : '1px solid rgba(37,34,27,0.1)',
      borderRadius: 14,
      padding: '1.2rem',
      boxShadow: '0 2px 8px rgba(37,34,27,0.05)',
    }}>
      <div style={{
        fontSize: '0.72rem',
        color: '#68655e',
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        marginBottom: 6,
      }}>
        {label}
      </div>
      <div style={{
        fontSize: '1.5rem',
        fontWeight: 800,
        letterSpacing: '-0.03em',
        color: color || (accent ? '#0d6f73' : '#25221b'),
        marginBottom: sub ? 4 : 0,
      }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: '0.8rem', color: '#68655e', lineHeight: 1.4 }}>{sub}</div>
      )}
    </div>
  );
}