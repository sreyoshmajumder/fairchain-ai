import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDomains, runAudit } from '../config/api';
import Spinner from '../components/ui/Spinner';

const DOMAIN_COLORS = {
  lending:    '#0d6f73',
  hiring:     '#6f52c8',
  healthcare: '#a85f16',
  insurance:  '#3d7a2a',
};

export default function NewAudit() {
  const navigate = useNavigate();

  const [domains,   setDomains]   = useState([]);
  const [selected,  setSelected]  = useState(null);
  const [sensitive, setSensitive] = useState('');
  const [loading,   setLoading]   = useState(false);
  const [fetching,  setFetching]  = useState(true);
  const [error,     setError]     = useState('');

  useEffect(() => {
    getDomains()
      .then(r => { setDomains(r.data); setFetching(false); })
      .catch(() => { setError('Failed to load domains. Is the backend running?'); setFetching(false); });
  }, []);

  const handleRun = async () => {
    if (!selected || !sensitive) return;
    setLoading(true); setError('');
    try {
      const fd = new FormData();
      fd.append('domain_id',        selected.id);
      fd.append('sensitive_column', sensitive);
      fd.append('use_sample',       'true');
      const res = await runAudit(fd);
      navigate(`/audit/${res.data.audit_id}`, { state: { audit: res.data } });
    } catch (e) {
      setError('Audit failed: ' + (e.response?.data?.detail || e.message));
      setLoading(false);
    }
  };

  if (fetching) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
      <Spinner size={40} />
    </div>
  );

  return (
    <main style={{ maxWidth: 780, margin: '0 auto', padding: '2.5rem 1.5rem' }}>
      <h1 style={{ fontFamily: "'Georgia',serif", fontSize: '2rem',
        letterSpacing: '-0.04em', marginBottom: '0.5rem' }}>
        New Fairness Audit
      </h1>
      <p style={{ color: '#68655e', marginBottom: '2rem' }}>
        Select a domain, choose a sensitive attribute, and run a full bias analysis.
      </p>

      {/* ── Step 1: Domain ───────────────────────────────── */}
      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '1rem' }}>
          1 · Choose domain
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(170px,1fr))', gap: 12 }}>
          {domains.map(d => (
            <button key={d.id} onClick={() => { setSelected(d); setSensitive(''); }}
              style={{
                padding: '1.2rem', borderRadius: 14, textAlign: 'left', cursor: 'pointer',
                border: selected?.id === d.id
                  ? `2px solid ${DOMAIN_COLORS[d.id] || '#0d6f73'}`
                  : '1px solid rgba(37,34,27,0.12)',
                background: selected?.id === d.id
                  ? `${DOMAIN_COLORS[d.id] || '#0d6f73'}10`
                  : '#fbfaf7',
                transition: 'all 0.18s ease',
              }}>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: 4,
                color: DOMAIN_COLORS[d.id] || '#0d6f73' }}>
                {d.name}
              </div>
              <div style={{ fontSize: '0.78rem', color: '#68655e', lineHeight: 1.4 }}>
                {d.description}
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* ── Step 2: Sensitive attribute ───────────────────── */}
      {selected && (
        <section style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '1rem' }}>
            2 · Choose sensitive attribute
          </h2>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {selected.sensitive_columns?.map(col => (
              <button key={col} onClick={() => setSensitive(col)}
                style={{
                  padding: '0.6rem 1.2rem', borderRadius: 9999, cursor: 'pointer',
                  fontWeight: 600, fontSize: '0.875rem',
                  border: sensitive === col
                    ? `2px solid ${DOMAIN_COLORS[selected.id] || '#0d6f73'}`
                    : '1px solid rgba(37,34,27,0.15)',
                  background: sensitive === col
                    ? `${DOMAIN_COLORS[selected.id] || '#0d6f73'}15`
                    : '#fbfaf7',
                  color: sensitive === col
                    ? DOMAIN_COLORS[selected.id] || '#0d6f73'
                    : '#68655e',
                  transition: 'all 0.18s ease',
                }}>
                {col}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* ── Run button ───────────────────────────────────── */}
      {selected && sensitive && (
        <section>
          <button onClick={handleRun} disabled={loading} style={{
            padding: '0.85rem 2rem', borderRadius: 9999,
            background: DOMAIN_COLORS[selected.id] || '#0d6f73',
            color: '#fff', fontWeight: 800, fontSize: '1rem', border: 'none',
            cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.7 : 1,
            boxShadow: `0 4px 18px ${DOMAIN_COLORS[selected.id] || '#0d6f73'}40`,
            transition: 'opacity 0.18s ease',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            {loading && <Spinner size={18} color="#fff" />}
            {loading ? 'Running audit…' : `Run Fairness Audit on "${sensitive}"`}
          </button>
          {error && (
            <p style={{ color: '#c0392b', marginTop: '0.75rem', fontSize: '0.9rem' }}>
              {error}
            </p>
          )}
        </section>
      )}
    </main>
  );
}