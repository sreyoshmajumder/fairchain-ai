const FAIRCHAIN_ABI = [
  {
    "inputs": [
      { "internalType": "bytes32", "name": "reportHash",      "type": "bytes32" },
      { "internalType": "string",  "name": "domain",          "type": "string"  },
      { "internalType": "string",  "name": "sensitiveColumn", "type": "string"  },
      { "internalType": "int256",  "name": "spdBefore",       "type": "int256"  },
      { "internalType": "int256",  "name": "spdAfter",        "type": "int256"  },
      { "internalType": "int256",  "name": "eodBefore",       "type": "int256"  },
      { "internalType": "int256",  "name": "eodAfter",        "type": "int256"  },
      { "internalType": "string",  "name": "metadataURI",     "type": "string"  }
    ],
    "name": "storeAudit",
    "outputs": [{ "internalType": "uint256", "name": "auditId", "type": "uint256" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "auditId", "type": "uint256" }],
    "name": "getAudit",
    "outputs": [{
      "components": [
        { "internalType": "bytes32", "name": "reportHash",      "type": "bytes32" },
        { "internalType": "string",  "name": "domain",          "type": "string"  },
        { "internalType": "string",  "name": "sensitiveColumn", "type": "string"  },
        { "internalType": "int256",  "name": "spdBefore",       "type": "int256"  },
        { "internalType": "int256",  "name": "spdAfter",        "type": "int256"  },
        { "internalType": "int256",  "name": "eodBefore",       "type": "int256"  },
        { "internalType": "int256",  "name": "eodAfter",        "type": "int256"  },
        { "internalType": "address", "name": "auditor",         "type": "address" },
        { "internalType": "uint256", "name": "timestamp",       "type": "uint256" },
        { "internalType": "string",  "name": "metadataURI",     "type": "string"  }
      ],
      "internalType": "struct FairChainAudit.AuditRecord",
      "name": "",
      "type": "tuple"
    }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "auditor", "type": "address" }],
    "name": "getAuditsByAuditor",
    "outputs": [{ "internalType": "uint256[]", "name": "", "type": "uint256[]" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "auditId",    "type": "uint256" },
      { "internalType": "bytes32", "name": "reportHash", "type": "bytes32" }
    ],
    "name": "verifyReport",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "totalAudits",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true,  "internalType": "uint256", "name": "auditId",    "type": "uint256" },
      { "indexed": true,  "internalType": "bytes32", "name": "reportHash", "type": "bytes32" },
      { "indexed": false, "internalType": "string",  "name": "domain",     "type": "string"  },
      { "indexed": true,  "internalType": "address", "name": "auditor",    "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "timestamp",  "type": "uint256" }
    ],
    "name": "AuditStored",
    "type": "event"
  }
];

export default FAIRCHAIN_ABI;