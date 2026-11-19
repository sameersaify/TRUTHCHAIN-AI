// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";

/// @title TruthChainRegistry
/// @notice Stores tamper-evident fingerprints (file hash + report hash) per scan.
/// @dev Records are keyed by a unique scanId, so the same file can be scanned again
///      with a newer detector without overwriting earlier evidence.
///      It does NOT detect AI content and does not prove a report is correct.
contract TruthChainRegistry is AccessControl {
    bytes32 public constant REGISTRAR_ROLE = keccak256("REGISTRAR_ROLE");

    // 0 = image, 1 = video, 2 = audio, 3 = text
    uint8 public constant MAX_MEDIA_TYPE = 3;

    struct ScanRecord {
        bytes32 fileHash;
        bytes32 reportHash;
        uint64 timestamp;
        address registeredBy;
        uint8 mediaType;
        bool exists;
    }

    mapping(bytes32 => ScanRecord) private scans;

    event ScanRegistered(
        bytes32 indexed scanId,
        bytes32 indexed fileHash,
        bytes32 reportHash,
        uint8 mediaType,
        address indexed registeredBy,
        uint64 timestamp
    );

    error ZeroAddress();
    error ZeroHash();
    error InvalidMediaType();
    error ScanAlreadyRegistered(bytes32 scanId);

    constructor(address admin) {
        if (admin == address(0)) revert ZeroAddress();
        _grantRole(DEFAULT_ADMIN_ROLE, admin); // admin can grant/revoke REGISTRAR_ROLE
    }

    function registerScan(
        bytes32 scanId,
        bytes32 fileHash,
        bytes32 reportHash,
        uint8 mediaType
    ) external onlyRole(REGISTRAR_ROLE) {
        if (scanId == bytes32(0) || fileHash == bytes32(0) || reportHash == bytes32(0)) revert ZeroHash();
        if (mediaType > MAX_MEDIA_TYPE) revert InvalidMediaType();
        if (scans[scanId].exists) revert ScanAlreadyRegistered(scanId);

        scans[scanId] = ScanRecord({
            fileHash: fileHash,
            reportHash: reportHash,
            timestamp: uint64(block.timestamp),
            registeredBy: msg.sender,
            mediaType: mediaType,
            exists: true
        });
        emit ScanRegistered(scanId, fileHash, reportHash, mediaType, msg.sender, uint64(block.timestamp));
    }

    function getScan(bytes32 scanId) external view returns (ScanRecord memory) {
        return scans[scanId];
    }

    /// @return exists whether scanId is registered; fileMatches / reportMatches compare stored vs supplied.
    function verifyScan(
        bytes32 scanId,
        bytes32 fileHash,
        bytes32 reportHash
    ) external view returns (bool exists, bool fileMatches, bool reportMatches) {
        ScanRecord storage r = scans[scanId];
        if (!r.exists) return (false, false, false);
        return (true, r.fileHash == fileHash, r.reportHash == reportHash);
    }
}
