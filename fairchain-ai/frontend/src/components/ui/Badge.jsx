import React from 'react';

const SEVERITY_STYLES = {
  low:     { bg: 'rgba(61,122,42,0.1)',   color: '#3d7a2a', border: 'rgba(61,122,42,0.25)'   },
  medium:  { bg: 'rgba(168,95,22,0.1)',   color: '#a85f16', border: 'rgba(168,95,22,0.25)'   },
  high:    { bg: 'rgba(192,57,43,0.1)',   color: '#c0392b', border: 'rgba(192,57,43,0.25)'   },
  pass:    { bg: 'rgba(61,122,42,0.1)',   color: '#3d7a2a', border: 'rgba(61,122,42,0.25)'   },
  warning: { bg: 'rgba(168,95,22,0.1)',   color: '#a85f16', border: 'rgba(168,95,22,0.25)'   },
  fail:    { bg: 'rgba(192,57,43,0.1)',   color: '#c0392b', border: 'rgba(192,57,43,0.25)'   },
  default: { bg: 'rgba(13,111,115,0.1)',  color: '#0d6f73', border: 'rgba(13,111,115,0.25)'  },
};

export default function Badge({ label, variant = 'default', style = {} }) {
  const s = SEVERITY_STYLES[variant?.toLowerCase()] || SEVERITY_STYLES.default;
  return (
    <span style={{
      display: 'inline-block',
      padding: '0.3rem 0.85rem',
      borderRadius: 9999,
      fontSize: '0.78rem',
      fontWeight: 700,
      letterSpacing: '0.06em',
      textTransform: 'uppercase',
      background: s.bg,
      color: s.color,
      border: `1px solid ${s.border}`,
      ...style,
    }}>
      {label}
    </span>
  );
}