import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDomains, runAudit, runAuditWithFile } from '../config/api'; // ← SINGLE source
import Spinner from '../components/ui/Spinner';

// ── Step indicator ────────────────────────────────────────────────────────────
const Step = ({ n, label, active, done }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
    <div style={{
      width: 26, height: 26, borderRadius: '50%', display: 'flex',
      alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem',
      fontWeight: 700, flexShrink: 0,
      background: done ? '#0d9a8c' : active ? 'rgba(13,154,140,0.2)' : 'rgba(255,255,255,0.06)',
      border: active || done ? '2px solid #0d9a8c' : '2px solid rgba(255,255,255,0.1)',
      color: done || active ? '#0d9a8c' : '#64748b',
    }}>
      {done ? '✓' : n}
    </div>
    <span style={{
      fontSize: '0.82rem',
      color: active ? '#e2e8f0' : '#64748b',
      fontWeight: active ? 600 : 400,
    }}>
      {label}
    </span>
  </div>
);

export default function NewAudit() {
  const navigate = useNavigate();

  const [domains, setDomains]               = useState([]);
  const [loadingDomains, setLoadingDomains] = useState(true);
  const [domainError, setDomainError]       = useState('');   // shown inside step 1

  const [selectedDomain, setSelectedDomain] = useState(null);
  const [datasetMode, setDatasetMode]       = useState(null); // 'preexisting' | 'upload'
  const [selectedAttr, setSelectedAttr]     = useState(null);

  const [uploadedFile, setUploadedFile]     = useState(null);
  const [uploadedCols, setUploadedCols]     = useState([]);
  const [dragOver, setDragOver]             = useState(false);
  const [parseError, setParseError]         = useState('');
  const fileInputRef                        = useRef(null);

  const [fetching, setFetching]             = useState(false);
  const [error, setError]                   = useState('');

  // ── Load domains via shared API config ───────────────────────────────────
  useEffect(() => {
    setLoadingDomains(true);
    setDomainError('');
    getDomains()
      .then(data => {
        setDomains(Array.isArray(data) ? data : []);
        setLoadingDomains(false);
      })
      .catch(err => {
        setDomainError(err.message || 'Failed to load domains.');
        setDomains([]);
        setLoadingDomains(false);
      });
  }, []);

  // Reset downstream when domain changes
  useEffect(() => {
    setDatasetMode(null);
    setSelectedAttr(null);
    setUploadedFile(null);
    setUploadedCols([]);
    setParseError('');
    setError('');
  }, [selectedDomain]);

  // Reset attr when mode changes
  useEffect(() => {
    setSelectedAttr(null);
    setUploadedFile(null);
    setUploadedCols([]);
    setParseError('');
  }, [datasetMode]);

  // ── CSV header parser ─────────────────────────────────────────────────────
  const parseCSVHeaders = (file) => {
    setParseError('');
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text    = e.target.result;
        const lines   = text.split('\n').filter(l => l.trim());
        if (lines.length < 2) {
          setParseError('CSV must have at least a header row and one data row.');
          return;
        }
        const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
        if (headers.length < 2) {
          setParseError("Could not detect columns — ensure it's a valid comma-separated CSV.");
          return;
        }
        setUploadedCols(headers);
        setUploadedFile(file);
        setSelectedAttr(null);
      } catch {
        setParseError('Failed to read CSV file.');
      }
    };
    reader.readAsText(file);
  };

  const handleFileDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file?.name.endsWith('.csv')) parseCSVHeaders(file);
    else setParseError('Please upload a .csv file.');
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) parseCSVHeaders(file);
  };

  // ── Run audit ────────────────────────────────────────────────────────────
  const handleRun = async () => {
    if (!selectedDomain || !selectedAttr) return;
    setFetching(true);
    setError('');
    try {
      const result = datasetMode === 'upload' && uploadedFile
        ? await runAuditWithFile(selectedDomain.id, selectedAttr, uploadedFile)
        : await runAudit(selectedDomain.id, selectedAttr, true);
      navigate('/audit/results', { state: { result, domain: selectedDomain } });
    } catch (e) {
      setError(e.message || 'Audit failed.');
    } finally {
      setFetching(false);
    }
  };

  // ── Derived ───────────────────────────────────────────────────────────────
  const attrOptions = datasetMode === 'upload'
    ? uploadedCols
    : (selectedDomain?.sensitive_columns ?? []);

  const canRun =
    selectedDomain && datasetMode && selectedAttr &&
    (datasetMode === 'preexisting' || (datasetMode === 'upload' && uploadedFile));

  const step = !selectedDomain ? 1 : !datasetMode ? 2 : !selectedAttr ? 3 : 4;

  // ── Retry domains ─────────────────────────────────────────────────────────
  const retryDomains = () => {
    setLoadingDomains(true);
    setDomainError('');
    getDomains()
      .then(data => { setDomains(Array.isArray(data) ? data : []); setLoadingDomains(false); })
      .catch(err => { setDomainError(err.message); setLoadingDomains(false); });
  };

  return (
    <main style={{ maxWidth: 820, margin: '0 auto', padding: '2.5rem 1.5rem' }}>

      {/* ── Title ── */}
      <h1 style={{ fontFamily:"'Georgia',serif", fontSize:'2rem',
                   letterSpacing:'-0.04em', marginBottom:'0.4rem' }}>
        New Fairness Audit
      </h1>
      <p style={{ color:'#8e9aad', fontSize:'0.9rem', marginBottom:'2rem' }}>
        Select a domain, choose your dataset source, pick a sensitive attribute, and run bias analysis.
      </p>

      {/* ── Step progress ── */}
      <div style={{ display:'flex', gap:'1.5rem', marginBottom:'2rem',
                    flexWrap:'wrap', alignItems:'center' }}>
        <Step n={1} label="Choose domain"    active={step===1} done={step>1} />
        <span style={{ color:'#334155' }}>→</span>
        <Step n={2} label="Dataset source"   active={step===2} done={step>2} />
        <span style={{ color:'#334155' }}>→</span>
        <Step n={3} label="Sensitive column" active={step===3} done={step>3} />
        <span style={{ color:'#334155' }}>→</span>
        <Step n={4} label="Run audit"        active={step===4} done={false} />
      </div>

      {/* ════════════════ STEP 1 — Domain ════════════════ */}
      <section style={{ marginBottom:'2rem' }}>
        <h2 style={{ fontSize:'0.95rem', fontWeight:700, marginBottom:'0.85rem',
                     color:'#cbd5e1', letterSpacing:'0.02em' }}>
          1 · Choose Domain
        </h2>

        {/* Loading skeleton */}
        {loadingDomains && (
          <div style={{ display:'flex', justifyContent:'center', padding:'2.5rem' }}>
            <Spinner size={32} />
          </div>
        )}

        {/* Backend error shown IN context, with retry button */}
        {!loadingDomains && domainError && (
          <div style={{
            background:'rgba(248,113,113,0.08)',
            border:'1px solid rgba(248,113,113,0.25)',
            borderRadius:'0.6rem', padding:'1rem 1.25rem',
            display:'flex', alignItems:'center',
            justifyContent:'space-between', flexWrap:'wrap', gap:'0.75rem',
          }}>
            <span style={{ color:'#f87171', fontSize:'0.875rem' }}>
              ⚠️ {domainError}
            </span>
            <button onClick={retryDomains} style={{
              padding:'0.4rem 1rem', borderRadius:'0.4rem',
              background:'rgba(248,113,113,0.15)',
              border:'1px solid rgba(248,113,113,0.3)',
              color:'#f87171', fontWeight:600, fontSize:'0.8rem',
              cursor:'pointer', fontFamily:'inherit',
            }}>
              ↺ Retry
            </button>
          </div>
        )}

        {/* Domain grid */}
        {!loadingDomains && !domainError && (
          <div style={{
            display:'grid',
            gridTemplateColumns:'repeat(auto-fill, minmax(175px, 1fr))',
            gap:'0.75rem',
          }}>
            {domains.map(d => {
              const isSelected = selectedDomain?.id === d.id;
              return (
                <button key={d.id} onClick={() => setSelectedDomain(d)} style={{
                  padding:'1rem', borderRadius:'0.75rem', textAlign:'left', cursor:'pointer',
                  border: isSelected
                    ? `2px solid ${d.color || '#0d9a8c'}`
                    : '1px solid rgba(255,255,255,0.09)',
                  background: isSelected
                    ? `${d.color || '#0d9a8c'}18`
                    : 'rgba(255,255,255,0.03)',
                  transition:'all 0.18s',
                }}>
                  <div style={{ fontSize:'1.4rem', marginBottom:'0.4rem' }}>{d.icon || '📊'}</div>
                  <div style={{
                    fontWeight:700, fontSize:'0.9rem',
                    color: isSelected ? (d.color || '#0d9a8c') : '#e2e8f0',
                  }}>
                    {d.name}
                  </div>
                  <div style={{ fontSize:'0.76rem', color:'#64748b',
                                marginTop:'0.25rem', lineHeight:1.4 }}>
                    {d.description}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* ════════════════ STEP 2 — Dataset source ════════════════ */}
      {selectedDomain && (
        <section style={{ marginBottom:'2rem' }}>
          <h2 style={{ fontSize:'0.95rem', fontWeight:700, marginBottom:'0.85rem',
                       color:'#cbd5e1', letterSpacing:'0.02em' }}>
            2 · Choose Dataset Source
          </h2>
          <div style={{ display:'flex', gap:'1rem', flexWrap:'wrap' }}>

            {/* Pre-existing */}
            <button
              onClick={() => setDatasetMode('preexisting')}
              style={{
                flex:'1 1 220px', padding:'1.25rem 1.5rem', borderRadius:'0.75rem',
                textAlign:'left', cursor:'pointer',
                border: datasetMode==='preexisting'
                  ? '2px solid #0d9a8c' : '1px solid rgba(255,255,255,0.09)',
                background: datasetMode==='preexisting'
                  ? 'rgba(13,154,140,0.1)' : 'rgba(255,255,255,0.03)',
                transition:'all 0.18s',
              }}>
              <div style={{ fontSize:'1.6rem', marginBottom:'0.5rem' }}>📂</div>
              <div style={{ fontWeight:700, fontSize:'0.95rem', marginBottom:'0.35rem',
                            color: datasetMode==='preexisting' ? '#0d9a8c' : '#e2e8f0' }}>
                Load Pre-existing Dataset
              </div>
              <div style={{ fontSize:'0.8rem', color:'#64748b', lineHeight:1.5 }}>
                Use the built-in synthetic dataset for the{' '}
                <strong style={{ color:'#94a3b8' }}>{selectedDomain.name}</strong> domain.
                Ready to run instantly.
              </div>
              {datasetMode==='preexisting' && selectedDomain.stats && (
                <div style={{ marginTop:'0.75rem', display:'flex', gap:'1rem' }}>
                  {[
                    { label:'Rows',    val: selectedDomain.stats.rows    },
                    { label:'Columns', val: selectedDomain.stats.columns },
                  ].map(s => (
                    <div key={s.label} style={{
                      background:'rgba(13,154,140,0.15)', borderRadius:'0.4rem',
                      padding:'0.3rem 0.6rem', fontSize:'0.78rem',
                    }}>
                      <span style={{ color:'#8e9aad' }}>{s.label}: </span>
                      <span style={{ color:'#0d9a8c', fontWeight:700 }}>{s.val}</span>
                    </div>
                  ))}
                </div>
              )}
            </button>

            {/* Upload */}
            <button
              onClick={() => setDatasetMode('upload')}
              style={{
                flex:'1 1 220px', padding:'1.25rem 1.5rem', borderRadius:'0.75rem',
                textAlign:'left', cursor:'pointer',
                border: datasetMode==='upload'
                  ? '2px solid #a78bfa' : '1px solid rgba(255,255,255,0.09)',
                background: datasetMode==='upload'
                  ? 'rgba(167,139,250,0.08)' : 'rgba(255,255,255,0.03)',
                transition:'all 0.18s',
              }}>
              <div style={{ fontSize:'1.6rem', marginBottom:'0.5rem' }}>⬆️</div>
              <div style={{ fontWeight:700, fontSize:'0.95rem', marginBottom:'0.35rem',
                            color: datasetMode==='upload' ? '#a78bfa' : '#e2e8f0' }}>
                Import Your Own Dataset
              </div>
              <div style={{ fontSize:'0.8rem', color:'#64748b', lineHeight:1.5 }}>
                Upload a <strong style={{ color:'#94a3b8' }}>.csv file</strong> from your machine.
                Columns are auto-detected for attribute selection.
              </div>
            </button>
          </div>

          {/* File upload zone */}
          {datasetMode === 'upload' && (
            <div style={{ marginTop:'1.25rem' }}>
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleFileDrop}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: dragOver
                    ? '2px dashed #a78bfa'
                    : uploadedFile
                      ? '2px dashed #4ade80'
                      : '2px dashed rgba(255,255,255,0.12)',
                  borderRadius:'0.75rem', padding:'2rem',
                  textAlign:'center', cursor:'pointer',
                  background: dragOver ? 'rgba(167,139,250,0.06)' : 'rgba(255,255,255,0.02)',
                  transition:'all 0.2s',
                }}>
                <input
                  ref={fileInputRef} type="file" accept=".csv"
                  style={{ display:'none' }} onChange={handleFileSelect}
                />
                {uploadedFile ? (
                  <>
                    <div style={{ fontSize:'2rem', marginBottom:'0.5rem' }}>✅</div>
                    <div style={{ color:'#4ade80', fontWeight:700, fontSize:'0.95rem' }}>
                      {uploadedFile.name}
                    </div>
                    <div style={{ color:'#64748b', fontSize:'0.8rem', marginTop:'0.25rem' }}>
                      {uploadedCols.length} columns detected · Click to change file
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize:'2rem', marginBottom:'0.5rem' }}>📄</div>
                    <div style={{ color:'#94a3b8', fontSize:'0.9rem', fontWeight:600 }}>
                      Drag & drop a CSV here, or click to browse
                    </div>
                    <div style={{ color:'#475569', fontSize:'0.78rem', marginTop:'0.35rem' }}>
                      Only .csv files are supported
                    </div>
                  </>
                )}
              </div>

              {parseError && (
                <p style={{
                  color:'#f87171', fontSize:'0.82rem', marginTop:'0.6rem',
                  background:'rgba(248,113,113,0.08)', padding:'0.5rem 0.75rem',
                  borderRadius:'0.4rem', border:'1px solid rgba(248,113,113,0.2)',
                }}>
                  ⚠️ {parseError}
                </p>
              )}

              {uploadedCols.length > 0 && (
                <div style={{ marginTop:'0.85rem' }}>
                  <div style={{ fontSize:'0.76rem', color:'#64748b', marginBottom:'0.4rem' }}>
                    Detected columns:
                  </div>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:'0.4rem' }}>
                    {uploadedCols.map(c => (
                      <span key={c} style={{
                        padding:'0.2rem 0.6rem', borderRadius:'9999px',
                        background:'rgba(255,255,255,0.06)',
                        border:'1px solid rgba(255,255,255,0.1)',
                        fontSize:'0.76rem', color:'#94a3b8',
                      }}>{c}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* ════════════════ STEP 3 — Sensitive attribute ════════════════ */}
      {selectedDomain && datasetMode &&
       (datasetMode === 'preexisting' || uploadedFile) && (
        <section style={{ marginBottom:'2rem' }}>
          <h2 style={{ fontSize:'0.95rem', fontWeight:700, marginBottom:'0.85rem',
                       color:'#cbd5e1', letterSpacing:'0.02em' }}>
            3 · Choose Sensitive Attribute
          </h2>
          {attrOptions.length === 0 ? (
            <p style={{ color:'#64748b', fontSize:'0.85rem' }}>
              {datasetMode==='upload'
                ? 'Upload a CSV first to detect columns.'
                : 'No sensitive columns configured for this domain.'}
            </p>
          ) : (
            <div style={{ display:'flex', flexWrap:'wrap', gap:'0.6rem' }}>
              {attrOptions.map(attr => {
                const isSelected = selectedAttr === attr;
                const color = datasetMode==='upload'
                  ? '#a78bfa'
                  : (selectedDomain.color || '#0d9a8c');
                return (
                  <button key={attr} onClick={() => setSelectedAttr(attr)} style={{
                    padding:'0.45rem 1rem', borderRadius:'9999px', cursor:'pointer',
                    border: isSelected
                      ? `2px solid ${color}`
                      : '1px solid rgba(255,255,255,0.12)',
                    background: isSelected ? `${color}20` : 'transparent',
                    color: isSelected ? color : '#94a3b8',
                    fontSize:'0.875rem', fontWeight: isSelected ? 700 : 400,
                    transition:'all 0.18s',
                  }}>
                    {attr}
                  </button>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* ════════════════ STEP 4 — Run ════════════════ */}
      {canRun && (
        <section style={{ marginBottom:'1.5rem' }}>
          <button
            onClick={handleRun}
            disabled={fetching}
            style={{
              padding:'0.9rem 2.5rem', borderRadius:'0.6rem',
              background: fetching ? '#1e293b' : '#0d9a8c',
              color:'#fff', fontWeight:700, fontSize:'1rem',
              border: fetching ? '1px solid rgba(255,255,255,0.08)' : 'none',
              cursor: fetching ? 'not-allowed' : 'pointer',
              display:'flex', alignItems:'center', gap:'0.6rem',
              transition:'background 0.2s', fontFamily:'inherit',
            }}
            onMouseOver={e => { if (!fetching) e.currentTarget.style.background='#0b857a'; }}
            onMouseOut={e  => { if (!fetching) e.currentTarget.style.background='#0d9a8c'; }}
          >
            {fetching
              ? <><Spinner size={18} color="#fff" /> Running audit…</>
              : <>🚀 Run Fairness Audit on "{selectedAttr}"</>
            }
          </button>
          <p style={{ fontSize:'0.78rem', color:'#475569', marginTop:'0.5rem' }}>
            {datasetMode==='upload'
              ? `Using uploaded file: ${uploadedFile?.name}`
              : `Using pre-existing ${selectedDomain?.name} dataset`}
          </p>
        </section>
      )}

      {/* ── Audit run error ── */}
      {error && (
        <div style={{
          color:'#f87171', fontSize:'0.875rem', marginTop:'0.75rem',
          background:'rgba(248,113,113,0.08)', padding:'0.65rem 1rem',
          borderRadius:'0.5rem', border:'1px solid rgba(248,113,113,0.2)',
        }}>
          ⚠️ {error}
        </div>
      )}
    </main>
  );
}