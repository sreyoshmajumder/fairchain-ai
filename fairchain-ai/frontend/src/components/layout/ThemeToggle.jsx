import React, { useState, useEffect } from 'react';

export default function ThemeToggle() {
  const [dark, setDark] = useState(
    () => window.matchMedia('(prefers-color-scheme: dark)').matches
  );

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    document.body.style.background = dark ? '#171614' : '#f6f4ef';
    document.body.style.color      = dark ? '#cdccca' : '#25221b';
  }, [dark]);

  return (
    <button
      onClick={() => setDark(d => !d)}
      aria-label={`Switch to ${dark ? 'light' : 'dark'} mode`}
      style={{
        background: 'rgba(37,34,27,0.07)',
        border: '1px solid rgba(37,34,27,0.12)',
        borderRadius: 9999,
        width: 36, height: 36,
        display: 'grid', placeItems: 'center',
        cursor: 'pointer',
        color: '#68655e',
        transition: 'background 0.18s ease',
        fontSize: '1rem',
      }}>
      {dark ? '☀️' : '🌙'}
    </button>
  );
}