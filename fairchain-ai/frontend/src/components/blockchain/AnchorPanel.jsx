import React, { useState } from 'react';
import { useWallet } from '../../hooks/useWallet';
import { anchorAudit } from '../../config/api';
import WalletButton from './WalletButton';

export default function AnchorPanel({ report, onAnchored }) {
  const { account, anchorOnChain } = useWallet();
  const [anchoring, setAnchoring]  = useState(false);
  const [msg, setMsg]              = useState('');
  const [chainRec, setChainRec]    = useState(null);

  if (!report) return null;

  const handleBackend = async () => {
    setAnchoring(true); setMsg('');
    try {
      const bfm = report.baseline_fairness || {};
      const r = await anchorAudit({
        audit_id: report.audit_id,
        domain: report.domain,
        sensitive_column: report.sensitive_column,
        severity: report.risk_level,
        spd: bfm.statistical_parity_diff || 0,
        eod: bfm.equal_opportunity_diff  || 0,
        report_json: report,
      });
      setChainRec(r.data);
      setMsg('✅ Anchored (backend simulation).');
      onAnchored?.(r.data);
    } catch (e) {
      setMsg('❌ Failed: ' + (e.response?.data?.detail || e.message));
    } finally { setAnchoring(false); }
  };

  const handleOnChain = async () => {
    if (!account) return;
    setAnchoring(true); setMsg('');
    try {
      const res = await anchorOnChain(
        report.audit_id, report.report_hash,
        report.domain, report.sensitive_column, report.risk_level
      );
      const rec = { tx_hash: res.txHash, block_number: res.blockNumber,
                    network: 'Polygon Amoy Testnet', status: 'anchored' };
      setChainRec(rec);
      setMsg(`✅ On-chain! Tx: ${res.txHash.slice(0,20)}...`);
      onAnchored?.(rec);
    } catch (e) {
      setMsg('❌ ' + (e.reason || e.message));
    } finally { setAnchoring(false); }
  };

  if (chainRec) return (
    <div style={{
      background: 'rgba(61,122,42,0.08)', border: '1px solid rgba(61,122,42,0.25)',
      borderRadius: 12, padding: '1rem',
    }}>
      <strong style={{ color: '#3d7a2a' }}>✅ Anchored — {chainRec.network}</strong>
      <div style={{ fontFamily: 'monospace', fontSize: '0.8rem', marginTop: 6, display: 'grid', gap: 4 }}>
        <div>Tx: {chainRec.tx_hash?.slice(0, 44)}...</div>
        <div>Block: {chainRec.block_number}</div>
        {chainRec.timestamp && <div>Time: {new Date(chainRec.timestamp * 1000).toLocaleString()}</div>}
      </div>
    </div>
  );

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 8 }}>
        <button onClick={handleBackend} disabled={anchoring} style={{
          padding: '0.75rem 1.1rem', borderRadius: 9999, background: '#6f52c8',
          color: '#fff', fontWeight: 700, fontSize: '0.875rem', border: 'none',
          cursor: anchoring ? 'wait' : 'pointer', opacity: anchoring ? 0.7 : 1,
        }}>
          {anchoring ? 'Anchoring...' : '⛓ Anchor (Simulated)'}
        </button>
        {!account ? <WalletButton /> : (
          <button onClick={handleOnChain} disabled={anchoring} style={{
            padding: '0.75rem 1.1rem', borderRadius: 9999, background: '#f6851b',
            color: '#fff', fontWeight: 700, fontSize: '0.875rem', border: 'none',
            cursor: anchoring ? 'wait' : 'pointer', opacity: anchoring ? 0.7 : 1,
          }}>
            {anchoring ? 'Signing...' : '🦊 Anchor On-Chain'}
          </button>
        )}
      </div>
      {msg && (
        <p style={{ fontSize: '0.875rem', fontWeight: 600, marginTop: 4,
          color: msg.startsWith('✅') ? '#3d7a2a' : '#c0392b' }}>
          {msg}
        </p>
      )}
    </div>
  );
}