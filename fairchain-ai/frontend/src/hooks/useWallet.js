import { useState, useCallback } from 'react';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '../config/contract';

export function useWallet() {
  const [account,  setAccount]  = useState(null);
  const [chainId,  setChainId]  = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  const connect = useCallback(async () => {
    if (!window.ethereum) {
      setError('MetaMask not installed. Please install it from metamask.io');
      return;
    }
    setLoading(true); setError('');
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const netId    = await window.ethereum.request({ method: 'eth_chainId' });
      setAccount(accounts[0]);
      setChainId(parseInt(netId, 16));
    } catch (e) {
      setError(e.message);
    } finally { setLoading(false); }
  }, []);

  const getContract = useCallback(async (readOnly = false) => {
    if (!window.ethereum) throw new Error('MetaMask not available');
    const provider = new ethers.BrowserProvider(window.ethereum);
    if (readOnly) return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
    const signer = await provider.getSigner();
    return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
  }, []);

  const anchorOnChain = useCallback(async (auditId, reportHash, domain, sensitiveAttr, status) => {
    const contract = await getContract(false);
    const tx       = await contract.anchorAudit(auditId, reportHash, domain, sensitiveAttr, status);
    const receipt  = await tx.wait();
    return { txHash: receipt.hash, blockNumber: Number(receipt.blockNumber) };
  }, [getContract]);

  const verifyOnChain = useCallback(async (auditId, reportHash) => {
    const contract = await getContract(true);
    return await contract.verifyAudit(auditId, reportHash);
  }, [getContract]);

  const getOnChainRecord = useCallback(async (auditId) => {
    const contract = await getContract(true);
    const rec      = await contract.getRecord(auditId);
    return {
      reportHash:        rec[0],
      domain:            rec[1],
      sensitiveAttribute:rec[2],
      status:            rec[3],
      auditor:           rec[4],
      timestamp:         new Date(Number(rec[5]) * 1000).toLocaleString(),
    };
  }, [getContract]);

  return { account, chainId, loading, error,
           connect, anchorOnChain, verifyOnChain, getOnChainRecord };
}