import React, { useState } from 'react';
import { useWallet } from '../../hooks/useWallet';

export default function VerifyBadge({ auditId, reportHash }) {
  const { verifyOnChain, getOnChainRecord } = useWallet();
  const [result,    setResult]    = useState(null);
  const [record,    setRecord]    = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');
  const [showRec,   setShowRec]   = useState(false);

  const handleVerify = async () => {
    setLoading(true); setError(''); setResult(null);
    try {
      const ok = await verifyOnChain(auditId, reportHash);
      setResult(ok);
    } catch (e) {
      setError(e.message);
    } finally { setLoading(false); }
  };

  const handleFetchRecord = async () => {
    setLoading(true); setError('');
    try {
      const rec = await getOnChainRecord(auditId);
      setRecord(rec); setShowRec(true);
    } catch (e) {
      setError(e.message);
    } finally { setLoading(false); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button onClick={handleVerify} disabled={loading} style={{
          padding: '0.55rem 1rem', borderRadius: 9999, background: '#6f52c8',
          color: '#fff', fontWeight: 700, fontSize: '0.82rem', border: 'none',
          cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.7 : 1,
        }}>
          {loading ? 'Verifying...' : '🔍 Verify Hash On-Chain'}
        </button>
        <button onClick={handleFetchRecord} disabled={loading} style={{
          padding: '0.55rem 1rem', borderRadius: 9999,
          background: 'rgba(13,111,115,0.1)', color: '#0d6f73',
          fontWeight: 700, fontSize: '0.82rem',
          border: '1px solid rgba(13,111,115,0.2)', cursor: 'pointer',
        }}>
          📋 Fetch Record
        </button>
      </div>

      {result !== null && (
        <div style={{
          padding: '0.6rem 1rem', borderRadius: 10, fontSize: '0.875rem', fontWeight: 700,
          background: result ? 'rgba(61,122,42,0.1)' : 'rgba(192,57,43,0.1)',
          color: result ? '#3d7a2a' : '#c0392b',
          border: `1px solid ${result ? 'rgba(61,122,42,0.25)' : 'rgba(192,57,43,0.25)'}`,
        }}>
          {result ? '✅ Hash matches the on-chain record — report is untampered.' : '❌ Hash mismatch — report may have been altered.'}
        </div>
      )}

      {showRec && record && (
        <div style={{
          fontFamily: 'monospace', fontSize: '0.78rem',
          background: 'rgba(0,0,0,0.04)', borderRadius: 8,
          padding: '0.75rem', display: 'grid', gap: 4,
        }}>
          <div><strong>Domain:</strong>    {record.domain}</div>
          <div><strong>Attribute:</strong> {record.sensitiveAttribute}</div>
          <div><strong>Status:</strong>    {record.status}</div>
          <div><strong>Auditor:</strong>   {record.auditor}</div>
          <div><strong>Timestamp:</strong> {record.timestamp}</div>
        </div>
      )}

      {error && <p style={{ color: '#c0392b', fontSize: '0.82rem' }}>{error}</p>}
    </div>
  );
}