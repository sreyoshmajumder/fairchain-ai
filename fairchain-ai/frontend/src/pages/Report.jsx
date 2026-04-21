import React, { useState, useEffect } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { generateReport, anchorAudit, getChainRecord } from '../config/api';
import { useWallet } from '../hooks/useWallet';

const SEV_COLOR = { low: '#3d7a2a', medium: '#a85f16', high: '#c0392b' };

export default function Report() {
  const { id }  = useParams();
  const loc     = useLocation();
  const audit   = loc.state?.audit;

  const { account, connect, loading: wLoading, error: wError,
          anchorOnChain, verifyOnChain } = useWallet();

  const [report,       setReport]       = useState(null);
  const [chainRec,     setChainRec]     = useState(null);
  const [anchoring,    setAnchoring]    = useState(false);
  const [msg,          setMsg]          = useState('');
  const [verifyResult, setVerifyResult] = useState(null);

  useEffect(() => {
    if (!audit) return;
    const bfm = audit.baseline?.fairness_metrics  || {};
    const mfm = audit.mitigated?.fairness_metrics || {};
    generateReport({
      audit_id:          audit.audit_id,
      domain:            audit.domain,
      sensitive_column:  audit.sensitive_column,
      baseline_metrics:  bfm,
      mitigated_metrics: mfm,
      explanation:       audit.explanation,
      improvement:       audit.improvement,
    }).then(r => setReport(r.data));

    getChainRecord(audit.audit_id)
      .then(r => { if (!r.data.error) setChainRec(r.data); })
      .catch(() => {});
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  // ── Anchor via backend simulation ───────────────────────────────────────
  const handleAnchorBackend = async () => {
    if (!report) return;
    setAnchoring(true); setMsg('');
    try {
      const bfm = audit.baseline?.fairness_metrics || {};
      const r   = await anchorAudit({
        audit_id:        report.audit_id,
        domain:          report.domain,
        sensitive_column: report.sensitive_column,
        severity:        report.risk_level,
        spd:             bfm.statistical_parity_diff || 0,
        eod:             bfm.equal_opportunity_diff  || 0,
        report_json:     report,
      });
      setChainRec(r.data);
      setMsg('✅ Anchored successfully (backend simulation).');
    } catch (e) {
      setMsg('❌ Anchor failed: ' + (e.response?.data?.detail || e.message));
    } finally { setAnchoring(false); }
  };

  // ── Anchor on-chain via MetaMask + Remix contract ────────────────────────
  const handleAnchorOnChain = async () => {
    if (!report || !account) return;
    setAnchoring(true); setMsg('');
    try {
      const res = await anchorOnChain(
        report.audit_id,
        report.report_hash,
        report.domain,
        report.sensitive_column,
        report.risk_level
      );
      const rec = {
        tx_hash:      res.txHash,
        block_number: res.blockNumber,
        network:      'Polygon Amoy Testnet',
        status:       'anchored',
      };
      setChainRec(rec);
      setMsg(`✅ On-chain! Tx: ${res.txHash.slice(0, 20)}... Block: ${res.blockNumber}`);
    } catch (e) {
      setMsg('❌ ' + (e.reason || e.message));
    } finally { setAnchoring(false); }
  };

  // ── Verify hash on-chain ─────────────────────────────────────────────────
  const handleVerifyOnChain = async () => {
    try {
      const ok = await verifyOnChain(report.audit_id, report.report_hash);
      setVerifyResult(ok);
    } catch (e) {
      setMsg('Verify failed: ' + e.message);
    }
  };

  // ── Guards ───────────────────────────────────────────────────────────────
  if (!audit) return (
    <div style={{ padding: '3rem', textAlign: 'center', color: '#68655e' }}>
      No audit data found. Please go back and run an audit first.
    </div>
  );
  if (!report) return (
    <div style={{ padding: '3rem', textAlign: 'center', color: '#68655e' }}>
      Generating report...
    </div>
  );

  const statusColor = { pass: '#3d7a2a', warning: '#a85f16', fail: '#c0392b' }[report.overall_status] || '#a85f16';
  const sev         = report.risk_level;

  return (
    <main style={{ maxWidth: 900, margin: '0 auto', padding: '2.5rem 1.5rem' }}>

      {/* ── Header ─────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between',
        alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
        <div>
          <div style={{ fontSize: '0.8rem', color: '#68655e', textTransform: 'uppercase',
            letterSpacing: '0.1em', marginBottom: '0.4rem' }}>
            Fairness Compliance Report
          </div>
          <h1 style={{ fontFamily: "'Georgia',serif", fontSize: '2rem',
            letterSpacing: '-0.04em', marginBottom: '0.3rem' }}>
            Audit #{report.audit_id}
          </h1>
          <p style={{ color: '#68655e' }}>
            Domain: <strong>{report.domain}</strong>
            &nbsp;·&nbsp;Attribute: <strong>{report.sensitive_column}</strong>
          </p>
        </div>
        <span style={{
          padding: '0.6rem 1.2rem', borderRadius: 9999, fontWeight: 800,
          fontSize: '0.9rem', background: `${statusColor}18`,
          color: statusColor, border: `1px solid ${statusColor}40`,
        }}>
          {report.overall_status?.toUpperCase()}
        </span>
      </div>

      {/* ── Executive Summary ──────────────────────────────── */}
      <div style={{ background: 'rgba(13,111,115,0.05)',
        border: '1px solid rgba(13,111,115,0.15)', borderRadius: 14,
        padding: '1.5rem', marginBottom: '1.5rem' }}>
        <h2 style={{ fontWeight: 700, color: '#0d6f73', marginBottom: '0.75rem' }}>
          Executive Summary
        </h2>
        <p style={{ color: '#25221b', lineHeight: 1.7 }}>{report.executive_summary}</p>
      </div>

      {/* ── Metrics grid ───────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: '1.5rem' }}>
        {[
          { title: 'Baseline Fairness',  metrics: report.baseline_fairness  },
          { title: 'After Mitigation',   metrics: report.mitigated_fairness },
        ].map((sec, i) => (
          <div key={i} style={{ background: '#fbfaf7',
            border: '1px solid rgba(37,34,27,0.1)', borderRadius: 14, padding: '1.2rem' }}>
            <h3 style={{ fontWeight: 700, marginBottom: '0.75rem', fontSize: '0.95rem' }}>
              {sec.title}
            </h3>
            {['statistical_parity_diff','equal_opportunity_diff',
              'false_positive_rate_diff','severity'].map(k => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between',
                padding: '0.45rem 0', borderBottom: '1px solid rgba(37,34,27,0.07)',
                fontSize: '0.88rem' }}>
                <span style={{ color: '#68655e' }}>{k.replace(/_/g, ' ')}</span>
                <span style={{ fontWeight: 600 }}>
                  {typeof sec.metrics?.[k] === 'number'
                    ? `${(sec.metrics[k] * 100).toFixed(1)}%`
                    : sec.metrics?.[k] || '—'}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* ── Improvement row ────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)',
        gap: 12, marginBottom: '1.5rem' }}>
        {[
          { label: 'SPD Reduction',   value: `${((report.improvement?.spd_reduction  || 0)*100).toFixed(1)}%`, good: (report.improvement?.spd_reduction  || 0) > 0 },
          { label: 'EOD Reduction',   value: `${((report.improvement?.eod_reduction  || 0)*100).toFixed(1)}%`, good: (report.improvement?.eod_reduction  || 0) > 0 },
          { label: 'Accuracy Change', value: `${((report.improvement?.accuracy_change|| 0)*100).toFixed(1)}%`, good: (report.improvement?.accuracy_change|| 0) >= -0.02 },
        ].map((m, i) => (
          <div key={i} style={{
            background: m.good ? 'rgba(61,122,42,0.07)' : 'rgba(192,57,43,0.07)',
            border: `1px solid ${m.good ? 'rgba(61,122,42,0.2)' : 'rgba(192,57,43,0.2)'}`,
            borderRadius: 12, padding: '1rem', textAlign: 'center',
          }}>
            <div style={{ fontSize: '0.72rem', textTransform: 'uppercase',
              letterSpacing: '0.1em', color: m.good ? '#3d7a2a' : '#c0392b', marginBottom: 4 }}>
              {m.label}
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800,
              color: m.good ? '#3d7a2a' : '#c0392b' }}>
              {m.value}
            </div>
          </div>
        ))}
      </div>

      {/* ── Recommended steps ──────────────────────────────── */}
      {report.recommended_steps?.length > 0 && (
        <div style={{ background: '#fbfaf7', border: '1px solid rgba(37,34,27,0.1)',
          borderRadius: 14, padding: '1.5rem', marginBottom: '1.5rem' }}>
          <h3 style={{ fontWeight: 700, marginBottom: '0.75rem' }}>Recommended next steps</h3>
          <ol style={{ paddingLeft: '1.2rem', display: 'grid', gap: '0.5rem' }}>
            {report.recommended_steps.map((s, i) => (
              <li key={i} style={{ color: '#25221b', lineHeight: 1.6 }}>{s}</li>
            ))}
          </ol>
        </div>
      )}

      {/* ── Report hash ────────────────────────────────────── */}
      <div style={{ fontFamily: 'monospace', fontSize: '0.78rem',
        background: 'rgba(0,0,0,0.04)', padding: '0.75rem', borderRadius: 8,
        marginBottom: '1.5rem', wordBreak: 'break-all', color: '#25221b' }}>
        Report hash: {report.report_hash}
      </div>

      {/* ── Blockchain section ─────────────────────────────── */}
      <div style={{ background: 'rgba(111,82,200,0.05)',
        border: '1px solid rgba(111,82,200,0.2)', borderRadius: 14, padding: '1.5rem' }}>
        <h2 style={{ fontWeight: 700, marginBottom: '0.5rem', color: '#6f52c8' }}>
          ⛓ Blockchain Fairness Passport
        </h2>
        <p style={{ color: '#68655e', marginBottom: '1.2rem', fontSize: '0.9rem' }}>
          Anchor this report on Polygon Amoy via your Remix-deployed contract.
          Anyone can verify integrity later using the report hash.
        </p>

        {chainRec ? (
          <div style={{ background: 'rgba(61,122,42,0.08)',
            border: '1px solid rgba(61,122,42,0.25)', borderRadius: 10,
            padding: '1rem', marginBottom: '0.75rem' }}>
            <strong style={{ color: '#3d7a2a' }}>✅ Anchored — {chainRec.network}</strong>
            <div style={{ fontFamily: 'monospace', fontSize: '0.8rem',
              marginTop: 6, display: 'grid', gap: 4 }}>
              <div>Tx: {chainRec.tx_hash?.slice(0, 44)}...</div>
              <div>Block: {chainRec.block_number}</div>
              {chainRec.timestamp && (
                <div>Time: {new Date(chainRec.timestamp * 1000).toLocaleString()}</div>
              )}
            </div>
            {/* Verify button — only shown after anchoring */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: '0.75rem' }}>
              <button onClick={handleVerifyOnChain} style={{
                padding: '0.5rem 1rem', borderRadius: 9999, background: '#6f52c8',
                color: '#fff', fontWeight: 700, fontSize: '0.82rem', border: 'none', cursor: 'pointer',
              }}>
                🔍 Verify on-chain
              </button>
              {verifyResult !== null && (
                <span style={{ fontWeight: 700, fontSize: '0.88rem',
                  color: verifyResult ? '#3d7a2a' : '#c0392b' }}>
                  {verifyResult
                    ? '✅ Hash matches on-chain record!'
                    : '❌ Hash mismatch!'}
                </span>
              )}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {/* Backend simulation */}
            <button onClick={handleAnchorBackend} disabled={anchoring} style={{
              padding: '0.8rem 1.2rem', borderRadius: 9999, background: '#6f52c8',
              color: '#fff', fontWeight: 700, fontSize: '0.9rem', border: 'none',
              cursor: anchoring ? 'wait' : 'pointer', opacity: anchoring ? 0.7 : 1,
            }}>
              {anchoring ? 'Anchoring...' : '⛓ Anchor (Simulated)'}
            </button>

            {/* MetaMask / on-chain */}
            {!account ? (
              <button onClick={connect} disabled={wLoading} style={{
                padding: '0.8rem 1.2rem', borderRadius: 9999, background: '#f6851b',
                color: '#fff', fontWeight: 700, fontSize: '0.9rem', border: 'none',
                cursor: wLoading ? 'wait' : 'pointer', opacity: wLoading ? 0.7 : 1,
              }}>
                {wLoading ? 'Connecting...' : '🦊 Connect MetaMask'}
              </button>
            ) : (
              <button onClick={handleAnchorOnChain} disabled={anchoring} style={{
                padding: '0.8rem 1.2rem', borderRadius: 9999, background: '#f6851b',
                color: '#fff', fontWeight: 700, fontSize: '0.9rem', border: 'none',
                cursor: anchoring ? 'wait' : 'pointer', opacity: anchoring ? 0.7 : 1,
              }}>
                {anchoring ? 'Signing tx...' : `🦊 Anchor On-Chain (${account.slice(0,6)}...)`}
              </button>
            )}
          </div>
        )}

        {msg && (
          <p style={{ marginTop: '0.75rem', fontSize: '0.9rem', fontWeight: 600,
            color: msg.startsWith('✅') ? '#3d7a2a' : '#c0392b' }}>
            {msg}
          </p>
        )}
        {wError && (
          <p style={{ color: '#c0392b', fontSize: '0.85rem', marginTop: '0.5rem' }}>
            {wError}
          </p>
        )}
      </div>
    </main>
  );
}