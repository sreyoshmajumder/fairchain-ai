import React from 'react';
import { useWallet } from '../../hooks/useWallet';

export default function WalletButton() {
  const { account, chainId, loading, error, connect } = useWallet();

  const networkLabel = chainId === 80002 ? '✅ Polygon Amoy'
    : chainId ? `⚠️ Chain ${chainId}`
    : null;

  if (account) return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      {networkLabel && (
        <span style={{
          fontSize: '0.78rem', padding: '0.3rem 0.7rem', borderRadius: 9999,
          background: chainId === 80002 ? 'rgba(61,122,42,0.1)' : 'rgba(168,95,22,0.1)',
          color: chainId === 80002 ? '#3d7a2a' : '#a85f16',
          border: `1px solid ${chainId === 80002 ? 'rgba(61,122,42,0.25)' : 'rgba(168,95,22,0.25)'}`,
          fontWeight: 600,
        }}>
          {networkLabel}
        </span>
      )}
      <span style={{
        fontFamily: 'monospace', fontSize: '0.82rem',
        background: 'rgba(246,133,27,0.1)', color: '#f6851b',
        border: '1px solid rgba(246,133,27,0.25)',
        padding: '0.35rem 0.85rem', borderRadius: 9999, fontWeight: 700,
      }}>
        🦊 {account.slice(0,6)}...{account.slice(-4)}
      </span>
    </div>
  );

  return (
    <div>
      <button onClick={connect} disabled={loading} style={{
        background: '#f6851b', color: '#fff',
        padding: '0.6rem 1.2rem', borderRadius: 9999,
        fontWeight: 700, fontSize: '0.875rem', border: 'none',
        cursor: loading ? 'wait' : 'pointer',
        opacity: loading ? 0.7 : 1,
        boxShadow: '0 4px 12px rgba(246,133,27,0.3)',
        transition: 'opacity 0.18s ease',
      }}>
        {loading ? 'Connecting...' : '🦊 Connect MetaMask'}
      </button>
      {error && <p style={{ color: '#c0392b', fontSize: '0.8rem', marginTop: 6 }}>{error}</p>}
    </div>
  );
}