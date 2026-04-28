import { ethers } from 'ethers';
import FAIRCHAIN_ABI from '../config/contractABI';

// ── Hardcoded fallback so a missing .env NEVER blocks uploads ──────────────────
const HARDCODED_ADDRESS = '0xFf6e8DDFECa2142b88A332cC269753e17a2F1799';
const CONTRACT_ADDRESS  =
  process.env.REACT_APP_CONTRACT_ADDRESS?.trim() || HARDCODED_ADDRESS;

const SEPOLIA_CHAIN_ID = 11155111;

// ── Hash the full report deterministically ────────────────────────────────────
export function hashReport(reportData) {
  const normalized = JSON.stringify({
    domain_id:        reportData.domain_id        || '',
    sensitive_column: reportData.sensitive_column  || '',
    target_column:    reportData.target_column     || '',
    spd_before:       reportData.baseline?.statistical_parity_diff ?? 0,
    spd_after:        reportData.mitigated?.statistical_parity_diff ?? 0,
    eod_before:       reportData.baseline?.equal_opportunity_diff  ?? 0,
    eod_after:        reportData.mitigated?.equal_opportunity_diff  ?? 0,
    accuracy_before:  reportData.baseline?.model_accuracy           ?? 0,
    accuracy_after:   reportData.mitigated?.model_accuracy          ?? 0,
    groups_analyzed:  reportData.groups_analyzed   || 0,
  });
  return ethers.keccak256(ethers.toUtf8Bytes(normalized));
}

// ── Check MetaMask is installed ───────────────────────────────────────────────
export function isMetaMaskInstalled() {
  return (
    typeof window    !== 'undefined' &&
    typeof window.ethereum !== 'undefined' &&
    window.ethereum.isMetaMask
  );
}

// ── Connect wallet ────────────────────────────────────────────────────────────
export async function connectWallet() {
  if (!isMetaMaskInstalled()) {
    throw new Error(
      'MetaMask is not installed. Please install it from metamask.io'
    );
  }
  const provider = new ethers.BrowserProvider(window.ethereum);
  const accounts = await provider.send('eth_requestAccounts', []);
  if (!accounts || accounts.length === 0) {
    throw new Error('No accounts found. Please unlock MetaMask.');
  }
  return { provider, address: accounts[0] };
}

// ── Switch to / add Sepolia ───────────────────────────────────────────────────
export async function ensureSepoliaNetwork(provider) {
  const network = await provider.getNetwork();
  if (Number(network.chainId) === SEPOLIA_CHAIN_ID) return;

  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: '0xaa36a7' }],   // 11155111 in hex
    });
  } catch (switchErr) {
    // Chain not yet added to MetaMask — add it automatically
    if (switchErr.code === 4902) {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId:           '0xaa36a7',
          chainName:         'Sepolia Testnet',
          nativeCurrency:    { name: 'SepoliaETH', symbol: 'ETH', decimals: 18 },
          rpcUrls:           ['https://rpc.sepolia.org'],
          blockExplorerUrls: ['https://sepolia.etherscan.io'],
        }],
      });
    } else {
      throw switchErr;
    }
  }
}

// ── Main upload function ──────────────────────────────────────────────────────
export async function uploadReportToBlockchain(reportData) {
  // Accept an injected address from the caller (e.g. BlockchainUpload component)
  // or fall back to the module-level constant which already has the hardcoded fallback
  const contractAddress =
    reportData._contractAddress?.trim() || CONTRACT_ADDRESS;

  // Final sanity check — will never fire now due to hardcoded fallback above
  if (!contractAddress || contractAddress.startsWith('0xYour')) {
    throw new Error(
      'Contract address not configured. Set REACT_APP_CONTRACT_ADDRESS in frontend/.env'
    );
  }

  // 1. Connect wallet
  const { provider, address } = await connectWallet();

  // 2. Switch to Sepolia
  await ensureSepoliaNetwork(provider);

  // 3. Re-get provider AFTER network switch (prevents stale network reference)
  const freshProvider = new ethers.BrowserProvider(window.ethereum);
  const signer        = await freshProvider.getSigner();

  // 4. Contract instance
  const contract = new ethers.Contract(contractAddress, FAIRCHAIN_ABI, signer);

  // 5. Prepare values (multiply floats ×10000 for on-chain int storage)
  const toChainInt = (v) => Math.round((parseFloat(v) || 0) * 10000);

  const reportHash      = hashReport(reportData);
  const domain          = reportData.domain_id          || 'unknown';
  const sensitiveColumn = reportData.sensitive_column   || 'unknown';
  const spdBefore       = toChainInt(reportData.baseline?.statistical_parity_diff);
  const spdAfter        = toChainInt(reportData.mitigated?.statistical_parity_diff);
  const eodBefore       = toChainInt(reportData.baseline?.equal_opportunity_diff);
  const eodAfter        = toChainInt(reportData.mitigated?.equal_opportunity_diff);
  const metadataURI     = '';

  // 6. Estimate gas with a safe fallback if estimation fails
  let gasLimit;
  try {
    const gasEstimate = await contract.storeAudit.estimateGas(
      reportHash, domain, sensitiveColumn,
      spdBefore, spdAfter, eodBefore, eodAfter, metadataURI
    );
    gasLimit = (gasEstimate * 120n) / 100n;   // +20% buffer
  } catch (_) {
    gasLimit = 300000n;   // Safe manual fallback
  }

  // 7. Send transaction (MetaMask popup opens here)
  const tx = await contract.storeAudit(
    reportHash, domain, sensitiveColumn,
    spdBefore, spdAfter, eodBefore, eodAfter, metadataURI,
    { gasLimit }
  );

  // 8. Wait for 1 block confirmation
  const receipt = await tx.wait(1);

  // 9. Parse auditId from emitted AuditStored event
  let auditId = null;
  try {
    const iface      = new ethers.Interface(FAIRCHAIN_ABI);
    const parsedLogs = receipt.logs
      .map(log => { try { return iface.parseLog(log); } catch { return null; } })
      .filter(Boolean);
    const auditEvent = parsedLogs.find(e => e.name === 'AuditStored');
    if (auditEvent) auditId = auditEvent.args.auditId?.toString() ?? null;
  } catch (_) { /* non-fatal — auditId stays null */ }

  return {
    txHash:      receipt.hash,
    auditId,
    auditor:     address,
    reportHash,
    blockNumber: receipt.blockNumber,
    explorerUrl: `https://sepolia.etherscan.io/tx/${receipt.hash}`,
  };
}