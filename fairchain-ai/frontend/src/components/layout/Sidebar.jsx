import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const DOMAIN_COLORS = {
  lending: '#0d6f73', hiring: '#6f52c8',
  healthcare: '#a85f16', insurance: '#3d7a2a',
};

const NAV_ITEMS = [
  { to: '/',           icon: '🏠', label: 'Home'      },
  { to: '/dashboard',  icon: '📊', label: 'Dashboard' },
  { to: '/audit/new',  icon: '🔍', label: 'New Audit' },
];

export default function Sidebar({ open = true, auditHistory = [] }) {
  const loc = useLocation();
  if (!open) return null;

  return (
    <aside style={{
      width: 240, minHeight: '100vh',
      background: '#f3f0ec',
      borderRight: '1px solid rgba(37,34,27,0.1)',
      padding: '1.5rem 1rem',
      display: 'flex', flexDirection: 'column', gap: 8,
      position: 'sticky', top: 56,
    }}>
      {NAV_ITEMS.map(item => (
        <Link key={item.to} to={item.to} style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '0.65rem 0.85rem', borderRadius: 10,
          background: loc.pathname === item.to ? 'rgba(13,111,115,0.1)' : 'transparent',
          color: loc.pathname === item.to ? '#0d6f73' : '#68655e',
          fontWeight: loc.pathname === item.to ? 700 : 400,
          textDecoration: 'none', fontSize: '0.9rem',
          transition: 'all 0.18s ease',
        }}>
          <span>{item.icon}</span> {item.label}
        </Link>
      ))}

      {auditHistory.length > 0 && (
        <>
          <div style={{
            fontSize: '0.72rem', textTransform: 'uppercase',
            letterSpacing: '0.1em', color: '#a7a49f',
            padding: '1rem 0.85rem 0.25rem',
          }}>
            Recent Audits
          </div>
          {auditHistory.slice(0, 6).map(a => (
            <Link key={a.audit_id} to={`/audit/${a.audit_id}`} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '0.55rem 0.85rem', borderRadius: 8,
              textDecoration: 'none', fontSize: '0.85rem', color: '#68655e',
              transition: 'background 0.15s ease',
            }}
            onMouseOver={e => e.currentTarget.style.background = 'rgba(37,34,27,0.05)'}
            onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
              <span style={{
                width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                background: DOMAIN_COLORS[a.domain] || '#0d6f73',
              }} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {a.domain} · {a.sensitive_column}
              </span>
            </Link>
          ))}
        </>
      )}
    </aside>
  );
}