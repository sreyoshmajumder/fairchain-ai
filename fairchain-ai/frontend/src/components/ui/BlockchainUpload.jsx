import { useState } from 'react';
import { uploadReportToBlockchain } from '../../services/blockchain';

// ── Fallback so a broken .env never blocks uploads ─────────────────────────────
const CONTRACT_ADDRESS =
  process.env.REACT_APP_CONTRACT_ADDRESS ||
  '0xFf6e8DDFECa2142b88A332cC269753e17a2F1799';

const SEPOLIA_CHAIN_ID =
  parseInt(process.env.REACT_APP_SEPOLIA_CHAIN_ID || '11155111', 10);

// ── Status UI helpers ─────────────────────────────────────────────────────────
const STATUS = {
  idle:    { color: '#8e9aad', bg: 'rgba(255,255,255,0.03)', border: 'rgba(255,255,255,0.07)' },
  loading: { color: '#38bdf8', bg: 'rgba(56,189,248,0.06)',  border: 'rgba(56,189,248,0.2)'  },
  success: { color: '#4ade80', bg: 'rgba(74,222,128,0.06)',  border: 'rgba(74,222,128,0.2)'  },
  error:   { color: '#f87171', bg: 'rgba(248,113,113,0.06)', border: 'rgba(248,113,113,0.2)' },
};

export default function BlockchainUpload({ reportData }) {
  const [phase,   setPhase]   = useState('idle');   // idle | loading | success | error
  const [txHash,  setTxHash]  = useState(null);
  const [errMsg,  setErrMsg]  = useState('');

  const handleUpload = async () => {
    setPhase('loading');
    setTxHash(null);
    setErrMsg('');

    try {
      // ── 1. MetaMask present? ──────────────────────────────────────────────
      if (!window.ethereum) {
        throw new Error('MetaMask not found. Please install the MetaMask browser extension.');
      }

      // ── 2. Request account access ────────────────────────────────────────
      await window.ethereum.request({ method: 'eth_requestAccounts' });

      // ── 3. Enforce Sepolia ───────────────────────────────────────────────
      const chainHex = await window.ethereum.request({ method: 'eth_chainId' });
      const chainId  = parseInt(chainHex, 16);
      if (chainId !== SEPOLIA_CHAIN_ID) {
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: `0x${SEPOLIA_CHAIN_ID.toString(16)}` }],
          });
        } catch {
          throw new Error(
            `Wrong network (chain ${chainId}). Please switch MetaMask to Sepolia Testnet.`
          );
        }
      }

      // ── 4. Upload — inject CONTRACT_ADDRESS directly ──────────────────────
      const payload = { ...reportData, _contractAddress: CONTRACT_ADDRESS };
      const hash    = await uploadReportToBlockchain(payload);
      setTxHash(hash);
      setPhase('success');

    } catch (err) {
      console.error('[BlockchainUpload]', err);
      setErrMsg(err?.message || 'Unknown error. Check console.');
      setPhase('error');
    }
  };

  const s = STATUS[phase] || STATUS.idle;

  return (
    <div style={{
      background: s.bg,
      border:     `1px solid ${s.border}`,
      borderRadius: '0.875rem',
      padding: '1.5rem',
      transition: 'all 0.3s ease',
    }}>

      {/* ── Idle ─────────────────────────────────────────────────────────── */}
      {phase === 'idle' && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ fontWeight: 700, color: '#e2e8f0', marginBottom: '0.3rem', fontSize: '0.95rem' }}>
              ⛓ Immutable Audit Record
            </div>
            <div style={{ color: '#64748b', fontSize: '0.82rem' }}>
              Store this fairness report permanently on Ethereum Sepolia testnet.
            </div>
            <div style={{ color: '#475569', fontSize: '0.75rem', marginTop: '0.25rem' }}>
              Contract: <span style={{ fontFamily: 'monospace', color: '#0d9a8c' }}>
                {CONTRACT_ADDRESS.slice(0, 10)}…{CONTRACT_ADDRESS.slice(-6)}
              </span>
            </div>
          </div>
          <button onClick={handleUpload} style={{
            padding: '0.65rem 1.4rem',
            background: 'linear-gradient(135deg, #0d9a8c, #0a7a70)',
            color: '#fff', border: 'none', borderRadius: '0.6rem',
            fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            fontFamily: 'inherit', whiteSpace: 'nowrap',
            transition: 'transform 0.15s',
          }}
            onMouseOver={e => e.currentTarget.style.transform = 'translateY(-1px)'}
            onMouseOut={e  => e.currentTarget.style.transform = 'translateY(0)'}
          >
            ⬆ Upload to Blockchain
          </button>
        </div>
      )}

      {/* ── Loading ──────────────────────────────────────────────────────── */}
      {phase === 'loading' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            width: 28, height: 28, borderRadius: '50%',
            border: '3px solid rgba(56,189,248,0.2)',
            borderTopColor: '#38bdf8',
            animation: 'spin 0.8s linear infinite',
            flexShrink: 0,
          }} />
          <div>
            <div style={{ color: '#38bdf8', fontWeight: 700, fontSize: '0.9rem' }}>
              Waiting for MetaMask…
            </div>
            <div style={{ color: '#64748b', fontSize: '0.78rem', marginTop: '0.2rem' }}>
              Confirm the transaction in your MetaMask popup.
            </div>
          </div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {/* ── Success ──────────────────────────────────────────────────────── */}
      {phase === 'success' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '1.3rem' }}>✅</span>
            <span style={{ color: '#4ade80', fontWeight: 700, fontSize: '0.95rem' }}>
              Report Uploaded Successfully
            </span>
          </div>
          {txHash && (
            <div style={{
              background: 'rgba(0,0,0,0.2)', borderRadius: '0.5rem',
              padding: '0.75rem 1rem', marginBottom: '0.75rem',
            }}>
              <div style={{ color: '#64748b', fontSize: '0.72rem', marginBottom: '0.3rem' }}>
                TRANSACTION HASH
              </div>
              <a
                href={`https://sepolia.etherscan.io/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontFamily: 'monospace', fontSize: '0.8rem',
                  color: '#0d9a8c', wordBreak: 'break-all',
                  textDecoration: 'none',
                }}
              >
                {txHash}
              </a>
            </div>
          )}
          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
            {txHash && (
              <a
                href={`https://sepolia.etherscan.io/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  padding: '0.5rem 1rem', background: 'rgba(74,222,128,0.12)',
                  color: '#4ade80', border: '1px solid rgba(74,222,128,0.3)',
                  borderRadius: '0.5rem', fontWeight: 600, fontSize: '0.82rem',
                  textDecoration: 'none',
                }}
              >
                View on Etherscan ↗
              </a>
            )}
            <button onClick={() => { setPhase('idle'); setTxHash(null); }} style={{
              padding: '0.5rem 1rem', background: 'rgba(255,255,255,0.05)',
              color: '#8e9aad', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '0.5rem', fontWeight: 600, fontSize: '0.82rem',
              cursor: 'pointer', fontFamily: 'inherit',
            }}>
              Upload Again
            </button>
          </div>
        </div>
      )}

      {/* ── Error ────────────────────────────────────────────────────────── */}
      {phase === 'error' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.6rem' }}>
            <span style={{ fontSize: '1.2rem' }}>✖</span>
            <span style={{ color: '#f87171', fontWeight: 700, fontSize: '0.95rem' }}>
              Transaction Failed
            </span>
          </div>
          <div style={{
            fontFamily: 'monospace', fontSize: '0.8rem', color: '#fca5a5',
            background: 'rgba(0,0,0,0.25)', borderRadius: '0.4rem',
            padding: '0.6rem 0.8rem', marginBottom: '0.75rem',
            wordBreak: 'break-word',
          }}>
            {errMsg}
          </div>
          <div style={{ color: '#64748b', fontSize: '0.78rem', marginBottom: '0.75rem' }}>
            Common fixes: Make sure MetaMask is on{' '}
            <strong style={{ color: '#38bdf8' }}>Sepolia Testnet</strong>
            {' '}and you have{' '}
            <a href="https://sepoliafaucet.com" target="_blank" rel="noopener noreferrer"
              style={{ color: '#0d9a8c' }}>
              Sepolia ETH
            </a>
            {' '}for gas fees.
          </div>
          <button onClick={handleUpload} style={{
            padding: '0.55rem 1.1rem', background: 'rgba(248,113,113,0.12)',
            color: '#f87171', border: '1px solid rgba(248,113,113,0.3)',
            borderRadius: '0.5rem', fontWeight: 600, fontSize: '0.82rem',
            cursor: 'pointer', fontFamily: 'inherit',
          }}>
            ↩ Try Again
          </button>
        </div>
      )}
    </div>
  );
}