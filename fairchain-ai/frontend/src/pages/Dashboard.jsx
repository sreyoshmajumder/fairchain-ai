import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAudits } from '../context/AuditContext';

const round    = (v, d = 3) => (v != null ? Number(v).toFixed(d) : '—');
const sevColor = s => s === 'high' ? '#f87171' : s === 'medium' ? '#facc15' : '#4ade80';
const sevBg    = s =>
  s === 'high'   ? 'rgba(248,113,113,0.1)' :
  s === 'medium' ? 'rgba(250,204,21,0.1)'  :
                   'rgba(74,222,128,0.1)';

function KPICard({ label, value, color, sub }) {
  return (
    <div style={{
      flex: '1 1 180px',
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '0.875rem',
      padding: '1.25rem 1.5rem',
    }}>
      <div style={{ fontSize: '0.78rem', color: '#8e9aad', marginBottom: '0.5rem', letterSpacing: '0.04em' }}>
        {label}
      </div>
      <div style={{
        fontSize: '2rem', fontWeight: 800, color: color || '#e2e8f0',
        fontFamily: 'monospace', lineHeight: 1.1,
      }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.35rem' }}>
          {sub}
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { audits, clearAudits, removeAudit } = useAudits();
  const [confirmClear, setConfirmClear] = useState(false);
  const [filter, setFilter] = useState('all');

  const total       = audits.length;
  const highBias    = audits.filter(a => (a.baseline?.severity ?? 'low') === 'high').length;
  const spdValues   = audits.map(a => a.baseline?.statistical_parity_diff).filter(v => v != null);
  const avgSPD      = spdValues.length
    ? (spdValues.reduce((s, v) => s + Math.abs(v), 0) / spdValues.length).toFixed(3)
    : '—';
  const domains     = new Set(audits.map(a => a.domain_id).filter(Boolean));
  const domainCount = domains.size;

  const filtered = filter === 'all'
    ? audits
    : audits.filter(a => (a.baseline?.severity ?? 'low') === filter);

  const fmtTime = (iso) => {
    try {
      return new Date(iso).toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });
    } catch { return iso ?? '—'; }
  };

  return (
    <main style={{ maxWidth: 1100, margin: '0 auto', padding: '2.5rem 1.5rem' }}>

      {/* ── Header ── */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem',
      }}>
        <div>
          <h1 style={{
            fontFamily: "'Georgia',serif", fontSize: '2rem',
            letterSpacing: '-0.03em', color: '#e2e8f0', margin: 0,
          }}>
            Dashboard
          </h1>
          <p style={{ color: '#8e9aad', fontSize: '0.88rem', margin: '0.4rem 0 0' }}>
            Overview of all fairness audits run in this session.
          </p>
        </div>
        <button
          onClick={() => navigate('/audit/new')}
          style={{
            padding: '0.65rem 1.4rem', background: '#0d9a8c', color: '#fff',
            border: 'none', borderRadius: '0.5rem', fontWeight: 600,
            fontSize: '0.9rem', cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          + New Audit
        </button>
      </div>

      {/* ── KPI Cards ── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '2.5rem' }}>
        <KPICard label="Total Audits"     value={total}       color="#0d9a8c"
          sub={total === 0 ? 'Run your first audit' : `${total} audit${total !== 1 ? 's' : ''} recorded`} />
        <KPICard label="High Bias Cases"  value={highBias}    color={highBias > 0 ? '#f87171' : '#4ade80'}
          sub={highBias > 0 ? 'Immediate review recommended' : 'No critical bias found'} />
        <KPICard label="Avg SPD"          value={avgSPD}      color="#facc15"
          sub="Statistical Parity Difference" />
        <KPICard label="Domains Covered"  value={domainCount} color="#a78bfa"
          sub={domainCount > 0 ? Array.from(domains).join(', ') : 'No domains yet'} />
      </div>

      {/* ── Filter + Clear bar ── */}
      {total > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem',
        }}>
          <div>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#e2e8f0', margin: 0 }}>
              Audit History
            </h2>
            <p style={{ color: '#64748b', fontSize: '0.78rem', margin: '0.2rem 0 0' }}>
              {filtered.length} of {total} audits
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            {['all', 'high', 'medium', 'low'].map(f => (
              <button key={f} onClick={() => setFilter(f)} style={{
                padding: '0.3rem 0.85rem', borderRadius: '9999px',
                border: filter === f
                  ? `1px solid ${f === 'all' ? '#0d9a8c' : sevColor(f)}`
                  : '1px solid rgba(255,255,255,0.1)',
                background: filter === f
                  ? f === 'all' ? 'rgba(13,154,140,0.15)' : sevBg(f)
                  : 'transparent',
                color: filter === f
                  ? f === 'all' ? '#0d9a8c' : sevColor(f)
                  : '#8e9aad',
                fontSize: '0.78rem', fontWeight: 600,
                cursor: 'pointer', fontFamily: 'inherit',
                textTransform: 'capitalize',
                transition: 'all 0.15s',
              }}>
                {f === 'all' ? 'All' : `${f.charAt(0).toUpperCase() + f.slice(1)} Bias`}
              </button>
            ))}

            {!confirmClear ? (
              <button onClick={() => setConfirmClear(true)} style={{
                padding: '0.3rem 0.85rem', borderRadius: '9999px',
                border: '1px solid rgba(248,113,113,0.25)',
                background: 'rgba(248,113,113,0.06)', color: '#f87171',
                fontSize: '0.78rem', fontWeight: 600,
                cursor: 'pointer', fontFamily: 'inherit',
              }}>
                Clear All
              </button>
            ) : (
              <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: '#f87171' }}>Confirm?</span>
                <button onClick={() => { clearAudits(); setConfirmClear(false); }} style={{
                  padding: '0.3rem 0.75rem', borderRadius: '9999px',
                  border: '1px solid rgba(248,113,113,0.4)',
                  background: 'rgba(248,113,113,0.15)', color: '#f87171',
                  fontSize: '0.75rem', fontWeight: 700,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}>
                  Yes, clear
                </button>
                <button onClick={() => setConfirmClear(false)} style={{
                  padding: '0.3rem 0.75rem', borderRadius: '9999px',
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'transparent', color: '#8e9aad',
                  fontSize: '0.75rem', cursor: 'pointer', fontFamily: 'inherit',
                }}>
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Empty / Filtered empty / Table ── */}
      {total === 0 ? (
        <div style={{
          textAlign: 'center', padding: '5rem 2rem',
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: '1rem',
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📋</div>
          <h3 style={{ color: '#e2e8f0', margin: '0 0 0.5rem', fontSize: '1.1rem' }}>No audits yet</h3>
          <p style={{ color: '#64748b', margin: '0 0 2rem', fontSize: '0.88rem' }}>
            Run your first fairness audit to see results here.
          </p>
          <button onClick={() => navigate('/audit/new')} style={{
            padding: '0.7rem 1.75rem', background: '#0d9a8c', color: '#fff',
            border: 'none', borderRadius: '0.5rem', fontWeight: 600,
            fontSize: '0.9rem', cursor: 'pointer', fontFamily: 'inherit',
          }}>
            Start First Audit
          </button>
        </div>

      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b', fontSize: '0.88rem' }}>
          No audits match the selected filter.
        </div>

      ) : (
        <div style={{
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: '0.875rem', overflowX: 'auto',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                {['Domain','Sensitive Attr','Target','Groups','SPD (Base)','SPD (Mit)','Accuracy','Severity','Timestamp',''].map(h => (
                  <th key={h} style={{
                    padding: '0.75rem 1rem', textAlign: 'left',
                    color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap',
                    fontSize: '0.75rem', letterSpacing: '0.05em', textTransform: 'uppercase',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((audit) => {
                const sev    = audit.baseline?.severity  ?? 'low';
                const mitSev = audit.mitigated?.severity ?? 'low';
                return (
                  <tr
                    key={audit.id}
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', cursor: 'pointer', transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    onClick={() => navigate('/audit/results', { state: { result: audit, domain: { id: audit.domain_id } } })}
                  >
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: '#e2e8f0', whiteSpace: 'nowrap' }}>
                      {audit.domain_id ?? '—'}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: '#0d9a8c', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                      {audit.sensitive_column ?? '—'}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: '#8e9aad', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                      {audit.target_column ?? '—'}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: '#8e9aad', textAlign: 'center' }}>
                      {audit.groups_analyzed ?? '—'}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: sevColor(sev), fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                      {round(audit.baseline?.statistical_parity_diff, 4)}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: sevColor(mitSev), fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                      {round(audit.mitigated?.statistical_parity_diff, 4)}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: '#38bdf8', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                      {audit.baseline?.model_accuracy != null ? `${audit.baseline.model_accuracy}%` : '—'}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>
                      <span style={{
                        padding: '0.2rem 0.6rem', borderRadius: '9999px',
                        background: sevBg(sev), color: sevColor(sev),
                        fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase',
                      }}>
                        {sev}
                      </span>
                      {mitSev !== sev && (
                        <span style={{
                          marginLeft: '0.35rem', padding: '0.2rem 0.6rem',
                          borderRadius: '9999px', background: sevBg(mitSev),
                          color: sevColor(mitSev), fontSize: '0.72rem',
                          fontWeight: 700, textTransform: 'uppercase',
                        }}>
                          → {mitSev}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: '#64748b', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                      {fmtTime(audit.timestamp)}
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <button
                        onClick={e => { e.stopPropagation(); removeAudit(audit.id); }}
                        title="Remove audit"
                        style={{
                          background: 'none', border: 'none', color: '#475569',
                          cursor: 'pointer', fontSize: '1rem', padding: '0.2rem 0.4rem',
                          borderRadius: '0.25rem', fontFamily: 'inherit', transition: 'color 0.15s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.color = '#f87171'}
                        onMouseLeave={e => e.currentTarget.style.color = '#475569'}
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}