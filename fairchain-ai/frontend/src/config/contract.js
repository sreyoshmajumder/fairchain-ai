export const CONTRACT_ADDRESS =
  process.env.REACT_APP_CONTRACT_ADDRESS ||
  '0x0000000000000000000000000000000000000000';

export const CONTRACT_ABI = [
  {
    "inputs": [
      { "internalType": "string", "name": "auditId",          "type": "string"  },
      { "internalType": "string", "name": "reportHash",       "type": "string"  },
      { "internalType": "string", "name": "domain",           "type": "string"  },
      { "internalType": "string", "name": "sensitiveAttribute","type": "string" },
      { "internalType": "string", "name": "status",           "type": "string"  }
    ],
    "name": "anchorAudit",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "string", "name": "auditId",    "type": "string" },
      { "internalType": "string", "name": "reportHash", "type": "string" }
    ],
    "name": "verifyAudit",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "string", "name": "auditId", "type": "string" }
    ],
    "name": "getRecord",
    "outputs": [
      { "internalType": "string", "name": "reportHash",        "type": "string"  },
      { "internalType": "string", "name": "domain",            "type": "string"  },
      { "internalType": "string", "name": "sensitiveAttribute","type": "string"  },
      { "internalType": "string", "name": "status",            "type": "string"  },
      { "internalType": "address","name": "auditor",           "type": "address" },
      { "internalType": "uint256","name": "timestamp",         "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  }
];