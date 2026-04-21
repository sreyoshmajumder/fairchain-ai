import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import ThemeToggle from './ThemeToggle';

export default function Navbar() {
  const loc = useLocation();
  const isActive = (path) => loc.pathname === path || loc.pathname.startsWith(path + '/');

  const navLink = (to, label) => (
    <Link to={to} style={{
      color: isActive(to) ? '#0d6f73' : '#68655e',
      fontWeight: isActive(to) ? 700 : 400,
      textDecoration: 'none',
      fontSize: '0.9rem',
      transition: 'color 0.18s ease',
    }}>
      {label}
    </Link>
  );

  return (
    <nav style={{
      position: 'sticky', top: 0, zIndex: 50,
      backdropFilter: 'blur(16px)',
      background: 'rgba(246,244,239,0.88)',
      borderBottom: '1px solid rgba(37,34,27,0.1)',
      padding: '0 1.5rem',
    }}>
      <div style={{
        maxWidth: 1240, margin: '0 auto',
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', height: 56,
      }}>
        {/* Logo */}
        <Link to="/" style={{
          display: 'flex', alignItems: 'center', gap: 10,
          textDecoration: 'none', color: '#25221b',
          fontWeight: 800, letterSpacing: '-0.04em', fontSize: '1.1rem',
        }}>
          <span style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'rgba(13,111,115,0.12)', color: '#0d6f73',
            display: 'grid', placeItems: 'center',
            border: '1px solid rgba(13,111,115,0.2)',
            fontSize: '1rem',
          }}>⚖</span>
          FairChain AI
        </Link>

        {/* Links */}
        <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
          {navLink('/dashboard', 'Dashboard')}
          {navLink('/audit/new', 'New Audit')}
          <ThemeToggle />
          <Link to="/audit/new" style={{
            background: '#0d6f73', color: '#fff',
            padding: '0.5rem 1.1rem', borderRadius: 9999,
            fontSize: '0.875rem', fontWeight: 700,
            textDecoration: 'none',
            boxShadow: '0 4px 12px rgba(13,111,115,0.25)',
            transition: 'background 0.18s ease',
          }}>
            Start Audit
          </Link>
        </div>
      </div>
    </nav>
  );
}