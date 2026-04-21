import React from 'react';

export default function Spinner({ size = 24, color = '#0d6f73' }) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
        style={{ animation: 'spin 0.8s linear infinite' }}>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="3"
          strokeLinecap="round" strokeDasharray="31.4 31.4"
          strokeDashoffset="0" opacity="0.25" />
        <path d="M12 2a10 10 0 0 1 10 10" stroke={color} strokeWidth="3"
          strokeLinecap="round" />
      </svg>
    </div>
  );
}