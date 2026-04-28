import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';

export default function Navbar() {
  const loc = useLocation();
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 30);
    window.addEventListener('scroll', fn);
    return () => window.removeEventListener('scroll', fn);
  }, []);

  const active = (p) => loc.pathname === p || loc.pathname.startsWith(p + '/');

  return (
    <nav style={{
      position:'fixed', top:0, left:0, right:0, zIndex:999,
      padding: scrolled ? '0.6rem 2rem' : '1.1rem 2rem',
      background: scrolled ? 'rgba(10,10,10,0.9)' : 'transparent',
      backdropFilter: scrolled ? 'blur(24px)' : 'none',
      borderBottom: scrolled ? '1px solid rgba(255,255,255,0.07)' : 'none',
      transition:'all 0.4s cubic-bezier(0.16,1,0.3,1)',
      display:'flex', alignItems:'center', justifyContent:'space-between',
    }}>
      {/* Logo */}
      <Link to="/" style={{ display:'flex', alignItems:'center', gap:10, textDecoration:'none' }}>
        <div style={{
          width:36, height:36, borderRadius:10,
          background:'linear-gradient(135deg, #14b8a6, #0891b2)',
          display:'grid', placeItems:'center', fontSize:'1rem',
          boxShadow:'0 0 20px rgba(20,184,166,0.4)',
        }}>⚖</div>
        <span style={{
          fontFamily:"'Space Grotesk', sans-serif",
          fontWeight:700, fontSize:'1.1rem', letterSpacing:'-0.02em',
          background:'linear-gradient(135deg, #fff 50%, #14b8a6)',
          WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
        }}>FairChain AI</span>
      </Link>

      {/* Links */}
      <div style={{ display:'flex', alignItems:'center', gap:6 }}>
        {[{ to:'/dashboard', label:'Dashboard' }, { to:'/audit/new', label:'New Audit' }].map(item => (
          <Link key={item.to} to={item.to} style={{
            padding:'0.45rem 1rem', borderRadius:'var(--r-full)',
            fontWeight:500, fontSize:'0.875rem',
            color: active(item.to) ? '#fff' : 'rgba(255,255,255,0.5)',
            background: active(item.to) ? 'rgba(20,184,166,0.15)' : 'transparent',
            border: active(item.to) ? '1px solid rgba(20,184,166,0.3)' : '1px solid transparent',
            transition:'all 0.2s ease',
          }}>
            {item.label}
          </Link>
        ))}
        <Link to="/audit/new" className="btn-primary" style={{ padding:'0.55rem 1.3rem', fontSize:'0.85rem', marginLeft:8 }}>
          Start Audit
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </Link>
      </div>
    </nav>
  );
}