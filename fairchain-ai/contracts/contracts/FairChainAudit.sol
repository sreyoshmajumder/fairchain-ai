// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title FairChainAudit
/// @notice Immutable on-chain audit trail for AI fairness reports
/// @dev Deploy via Remix IDE → Injected Provider (MetaMask) → Polygon Amoy
contract FairChainAudit {

    // ── Types ───────────────────────────────────────────────
    enum FairnessStatus { PASS, WARNING, FAIL }

    struct AuditRecord {
        string         auditId;
        bytes32        reportHash;
        string         domain;
        string         sensitiveAttribute;
        uint256        timestamp;
        FairnessStatus status;
        address        auditor;
        bool           exists;
    }

    // ── Storage ─────────────────────────────────────────────
    mapping(string => AuditRecord) private _records;
    string[] private _auditIds;

    // ── Events ──────────────────────────────────────────────
    event AuditAnchored(
        string  indexed auditId,
        bytes32         reportHash,
        string          domain,
        string          sensitiveAttribute,
        FairnessStatus  status,
        address indexed auditor,
        uint256         timestamp
    );

    event AuditVerified(
        string  indexed auditId,
        bool            result,
        address indexed verifier
    );

    // ── Errors ──────────────────────────────────────────────
    error AlreadyAnchored(string auditId);
    error AuditNotFound(string auditId);
    error InvalidStatus(uint8 status);

    // ── Write functions ─────────────────────────────────────

    /// @notice Anchor a new fairness audit report on-chain
    /// @param _auditId      Unique short audit ID from backend (e.g. "a1b2c3d4")
    /// @param _reportHash   keccak256 hash of the full JSON report
    /// @param _domain       Domain name: "lending", "hiring", "healthcare", "insurance"
    /// @param _sensitiveAttribute  Attribute audited: "gender", "region", etc.
    /// @param _status       0 = PASS, 1 = WARNING, 2 = FAIL
    function anchorAudit(
        string  calldata _auditId,
        bytes32          _reportHash,
        string  calldata _domain,
        string  calldata _sensitiveAttribute,
        uint8            _status
    ) external {
        if (_records[_auditId].exists)  revert AlreadyAnchored(_auditId);
        if (_status > 2)               revert InvalidStatus(_status);

        _records[_auditId] = AuditRecord({
            auditId:            _auditId,
            reportHash:         _reportHash,
            domain:             _domain,
            sensitiveAttribute: _sensitiveAttribute,
            timestamp:          block.timestamp,
            status:             FairnessStatus(_status),
            auditor:            msg.sender,
            exists:             true
        });
        _auditIds.push(_auditId);

        emit AuditAnchored(
            _auditId, _reportHash, _domain, _sensitiveAttribute,
            FairnessStatus(_status), msg.sender, block.timestamp
        );
    }

    // ── Read functions ──────────────────────────────────────

    /// @notice Get the full audit record
    function getAuditRecord(string calldata _auditId)
        external view
        returns (
            bytes32        reportHash,
            string memory  domain,
            string memory  sensitiveAttribute,
            uint256        timestamp,
            uint8          status,
            address        auditor
        )
    {
        if (!_records[_auditId].exists) revert AuditNotFound(_auditId);
        AuditRecord storage r = _records[_auditId];
        return (
            r.reportHash, r.domain, r.sensitiveAttribute,
            r.timestamp, uint8(r.status), r.auditor
        );
    }

    /// @notice Verify a report hash against the stored record
    /// @return true if the hash matches the on-chain record
    function verifyReport(string calldata _auditId, bytes32 _reportHash)
        external view returns (bool)
    {
        if (!_records[_auditId].exists) revert AuditNotFound(_auditId);
        return _records[_auditId].reportHash == _reportHash;
    }

    /// @notice Total number of anchored audits
    function totalAudits() external view returns (uint256) {
        return _auditIds.length;
    }

    /// @notice Get audit ID at a given index
    function getAuditIdAt(uint256 _index) external view returns (string memory) {
        require(_index < _auditIds.length, "Index out of range");
        return _auditIds[_index];
    }

    /// @notice Check if an audit ID already exists
    function exists(string calldata _auditId) external view returns (bool) {
        return _records[_auditId].exists;
    }
}