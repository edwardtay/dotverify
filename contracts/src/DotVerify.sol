// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {IXcm, XCM_PRECOMPILE_ADDRESS} from "./interfaces/IXcm.sol";
import {ISystem, SYSTEM_ADDR} from "./interfaces/ISystem.sol";

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

/// @title ISchemaResolver — Optional hook contract called on attest/revoke
interface ISchemaResolver {
    function onAttest(bytes32 attestationUid, address issuer, address recipient, bytes calldata data) external returns (bool);
    function onRevoke(bytes32 attestationUid, address revoker) external returns (bool);
}

/// @title PolkaProve — On-chain Attestation & Credential Verification for Polkadot Hub
/// @notice Full EAS-equivalent attestation protocol with deep PVM precompile integration.
///         Schema resolvers, delegated attestations, batch ops, issuer registry, BLAKE2/sr25519/XCM.
/// @dev Leverages ALL Polkadot Hub precompiles: IXcm (0xA0000) send/execute/weighMessage,
///      ISystem (0x900) sr25519Verify/BLAKE2/weightLeft/callerIsOrigin/ecdsaToEthAddress/toAccountId.
contract PolkaProve is Ownable, ReentrancyGuard, Pausable {
    IXcm public constant xcm = IXcm(XCM_PRECOMPILE_ADDRESS);
    ISystem public constant system = ISystem(SYSTEM_ADDR);

    constructor() Ownable(msg.sender) {}

    // =========================================================================
    // Schema Registry (with Resolvers)
    // =========================================================================

    struct Schema {
        bytes32 uid;
        address creator;
        string name;
        string definition;       // field:type pairs
        bool revocable;
        address resolver;        // optional resolver contract (address(0) = none)
        uint256 createdAt;
    }

    mapping(bytes32 => Schema) public schemas;
    bytes32[] public allSchemaUids;

    event SchemaRegistered(bytes32 indexed uid, address indexed creator, string name, address resolver);

    /// @notice Register a schema with optional resolver hook
    /// @dev UID = BLAKE2-256(creator, name, definition, resolver) — PVM-native hash
    function registerSchema(
        string calldata name,
        string calldata definition,
        bool revocable,
        address resolver
    ) external whenNotPaused returns (bytes32 uid) {
        uid = system.hashBlake256(abi.encodePacked(msg.sender, name, definition, resolver));
        require(schemas[uid].createdAt == 0, "schema already exists");

        schemas[uid] = Schema({
            uid: uid,
            creator: msg.sender,
            name: name,
            definition: definition,
            revocable: revocable,
            resolver: resolver,
            createdAt: block.timestamp
        });
        allSchemaUids.push(uid);

        emit SchemaRegistered(uid, msg.sender, name, resolver);
    }

    /// @notice Register a schema without resolver (convenience overload)
    function registerSchema(
        string calldata name,
        string calldata definition,
        bool revocable
    ) external whenNotPaused returns (bytes32 uid) {
        uid = system.hashBlake256(abi.encodePacked(msg.sender, name, definition, address(0)));
        require(schemas[uid].createdAt == 0, "schema already exists");

        schemas[uid] = Schema({
            uid: uid,
            creator: msg.sender,
            name: name,
            definition: definition,
            revocable: revocable,
            resolver: address(0),
            createdAt: block.timestamp
        });
        allSchemaUids.push(uid);

        emit SchemaRegistered(uid, msg.sender, name, address(0));
    }

    function getSchema(bytes32 uid) external view returns (Schema memory) {
        require(schemas[uid].createdAt > 0, "schema not found");
        return schemas[uid];
    }

    function getSchemaCount() external view returns (uint256) {
        return allSchemaUids.length;
    }

    function getAllSchemaUids() external view returns (bytes32[] memory) {
        return allSchemaUids;
    }

    // =========================================================================
    // Trusted Issuer Registry (PVM-native identity)
    // =========================================================================

    struct Issuer {
        bool registered;
        string name;
        bytes32 substrateAccountId;  // Polkadot-native identity via toAccountId
        bytes32 codeHashAtRegistration;  // contract integrity snapshot
        uint256 attestationsMade;
        uint256 registeredAt;
    }

    mapping(address => Issuer) public issuers;
    address[] public allIssuers;

    event IssuerRegistered(address indexed issuer, string name, bytes32 substrateId);

    /// @notice Register as a trusted issuer with PVM identity binding
    /// @dev Resolves EVM address to Substrate AccountId32 via toAccountId precompile,
    ///      captures contract code hash for integrity verification
    function registerIssuer(string calldata name) external whenNotPaused {
        require(!issuers[msg.sender].registered, "already registered");

        bytes memory accountIdBytes = system.toAccountId(msg.sender);
        bytes32 substrateId;
        assembly { substrateId := mload(add(accountIdBytes, 32)) }

        issuers[msg.sender] = Issuer({
            registered: true,
            name: name,
            substrateAccountId: substrateId,
            codeHashAtRegistration: system.ownCodeHash(),
            attestationsMade: 0,
            registeredAt: block.timestamp
        });
        allIssuers.push(msg.sender);

        emit IssuerRegistered(msg.sender, name, substrateId);
    }

    function getIssuer(address addr) external view returns (Issuer memory) {
        return issuers[addr];
    }

    function getIssuerCount() external view returns (uint256) {
        return allIssuers.length;
    }

    // =========================================================================
    // Attestation Core
    // =========================================================================

    struct Attestation {
        bytes32 uid;
        bytes32 schemaUid;
        address issuer;
        address recipient;
        bytes data;
        bytes32 dataHash;        // BLAKE2-256 of raw data for integrity
        uint256 issuedAt;
        uint256 expiresAt;
        bool revoked;
        bytes32 refUid;
    }

    mapping(bytes32 => Attestation) public attestations;
    mapping(address => bytes32[]) public receivedAttestations;
    mapping(address => bytes32[]) public issuedAttestations;
    mapping(bytes32 => bytes32[]) public schemaAttestations;
    mapping(bytes32 => bool) public usedSignatures;
    uint256 public attestationCount;

    event AttestationCreated(bytes32 indexed uid, bytes32 indexed schemaUid, address indexed issuer, address recipient);
    event AttestationRevoked(bytes32 indexed uid, address indexed revoker);
    event Sr25519AttestationIssued(bytes32 indexed uid, bytes32 indexed publicKey);
    event DelegatedAttestationIssued(bytes32 indexed uid, address indexed delegator, address indexed issuer);
    event XcmAttestationQuery(bytes32 indexed uid, bytes destination);

    /// @dev Internal attestation logic shared by all attest variants
    function _attest(
        bytes32 schemaUid,
        address issuer,
        address recipient,
        bytes calldata data,
        uint256 expiresAt,
        bytes32 refUid
    ) internal returns (bytes32 uid) {
        require(schemas[schemaUid].createdAt > 0, "schema not found");
        require(expiresAt == 0 || expiresAt > block.timestamp, "already expired");

        // BLAKE2-256 for UID generation and data integrity
        uid = system.hashBlake256(
            abi.encodePacked(schemaUid, issuer, recipient, data, block.timestamp, attestationCount)
        );
        bytes32 dataHash = system.hashBlake256(data);

        attestations[uid] = Attestation({
            uid: uid,
            schemaUid: schemaUid,
            issuer: issuer,
            recipient: recipient,
            data: data,
            dataHash: dataHash,
            issuedAt: block.timestamp,
            expiresAt: expiresAt,
            revoked: false,
            refUid: refUid
        });

        receivedAttestations[recipient].push(uid);
        issuedAttestations[issuer].push(uid);
        schemaAttestations[schemaUid].push(uid);
        attestationCount++;

        // Update issuer stats
        if (issuers[issuer].registered) {
            issuers[issuer].attestationsMade++;
        }

        // Call resolver if schema has one
        Schema storage s = schemas[schemaUid];
        if (s.resolver != address(0)) {
            require(
                ISchemaResolver(s.resolver).onAttest(uid, issuer, recipient, data),
                "resolver rejected attestation"
            );
        }

        emit AttestationCreated(uid, schemaUid, issuer, recipient);
    }

    /// @notice Issue an attestation
    function attest(
        bytes32 schemaUid,
        address recipient,
        bytes calldata data,
        uint256 expiresAt,
        bytes32 refUid
    ) external whenNotPaused returns (bytes32 uid) {
        return _attest(schemaUid, msg.sender, recipient, data, expiresAt, refUid);
    }

    /// @notice Issue attestation with callerIsOrigin verification (blocks proxy attacks)
    function attestSecure(
        bytes32 schemaUid,
        address recipient,
        bytes calldata data,
        uint256 expiresAt,
        bytes32 refUid
    ) external whenNotPaused returns (bytes32 uid) {
        require(system.callerIsOrigin(), "PolkaProve: must be direct caller");
        return _attest(schemaUid, msg.sender, recipient, data, expiresAt, refUid);
    }

    /// @notice Issue attestation via sr25519 signature from a Substrate wallet
    /// @dev Polkadot.js/Talisman users authorize via sr25519 signature, verified on-chain. EVM wallet relays tx.
    ///      Replay protected via BLAKE2 signature hashing.
    function attestWithSr25519(
        uint8[64] calldata signature,
        bytes32 publicKey,
        bytes32 schemaUid,
        address recipient,
        bytes calldata data,
        uint256 expiresAt
    ) external whenNotPaused returns (bytes32 uid) {
        require(schemas[schemaUid].createdAt > 0, "schema not found");

        bytes memory message = abi.encodePacked(
            "PolkaProve:attest:",
            block.chainid,
            msg.sender,
            schemaUid, recipient, data, expiresAt
        );
        require(system.sr25519Verify(signature, message, publicKey), "invalid sr25519 signature");

        bytes32 sigHash = system.hashBlake256(abi.encodePacked(signature));
        require(!usedSignatures[sigHash], "signature already used");
        usedSignatures[sigHash] = true;

        uid = _attest(schemaUid, msg.sender, recipient, data, expiresAt, bytes32(0));
        emit Sr25519AttestationIssued(uid, publicKey);
    }

    // =========================================================================
    // Delegated Attestations
    // =========================================================================

    /// @notice Authorized delegates who can attest on behalf of an issuer
    mapping(address => mapping(address => bool)) public delegates;

    event DelegateAdded(address indexed issuer, address indexed delegate);
    event DelegateRemoved(address indexed issuer, address indexed delegate);

    function addDelegate(address delegate) external {
        delegates[msg.sender][delegate] = true;
        emit DelegateAdded(msg.sender, delegate);
    }

    function removeDelegate(address delegate) external {
        delegates[msg.sender][delegate] = false;
        emit DelegateRemoved(msg.sender, delegate);
    }

    /// @notice Issue attestation on behalf of another issuer (delegated)
    function attestDelegated(
        address issuer,
        bytes32 schemaUid,
        address recipient,
        bytes calldata data,
        uint256 expiresAt,
        bytes32 refUid
    ) external whenNotPaused returns (bytes32 uid) {
        require(delegates[issuer][msg.sender], "not authorized delegate");
        uid = _attest(schemaUid, issuer, recipient, data, expiresAt, refUid);
        emit DelegatedAttestationIssued(uid, msg.sender, issuer);
    }

    // =========================================================================
    // Revocation
    // =========================================================================

    function revoke(bytes32 attestationUid) external {
        Attestation storage a = attestations[attestationUid];
        require(a.issuedAt > 0, "attestation not found");
        require(a.issuer == msg.sender || delegates[a.issuer][msg.sender], "not authorized");
        require(!a.revoked, "already revoked");
        require(schemas[a.schemaUid].revocable, "schema not revocable");

        a.revoked = true;

        // Call resolver if schema has one
        Schema storage s = schemas[a.schemaUid];
        if (s.resolver != address(0)) {
            ISchemaResolver(s.resolver).onRevoke(attestationUid, msg.sender);
        }

        emit AttestationRevoked(attestationUid, msg.sender);
    }

    // =========================================================================
    // Batch Operations
    // =========================================================================

    struct AttestationRequest {
        bytes32 schemaUid;
        address recipient;
        bytes data;
        uint256 expiresAt;
        bytes32 refUid;
    }

    /// @notice Issue multiple attestations in one tx
    function multiAttest(AttestationRequest[] calldata requests) external whenNotPaused returns (bytes32[] memory uids) {
        uids = new bytes32[](requests.length);
        for (uint256 i = 0; i < requests.length; i++) {
            uids[i] = _attest(
                requests[i].schemaUid,
                msg.sender,
                requests[i].recipient,
                requests[i].data,
                requests[i].expiresAt,
                requests[i].refUid
            );
        }
    }

    /// @notice Revoke multiple attestations in one tx
    function multiRevoke(bytes32[] calldata attestationUids) external {
        for (uint256 i = 0; i < attestationUids.length; i++) {
            Attestation storage a = attestations[attestationUids[i]];
            require(a.issuedAt > 0, "attestation not found");
            require(a.issuer == msg.sender || delegates[a.issuer][msg.sender], "not authorized");
            require(!a.revoked, "already revoked");
            require(schemas[a.schemaUid].revocable, "schema not revocable");

            a.revoked = true;

            Schema storage s = schemas[a.schemaUid];
            if (s.resolver != address(0)) {
                ISchemaResolver(s.resolver).onRevoke(attestationUids[i], msg.sender);
            }

            emit AttestationRevoked(attestationUids[i], msg.sender);
        }
    }

    // =========================================================================
    // Verification
    // =========================================================================

    /// @notice Verify attestation: exists, not revoked, not expired
    function verify(bytes32 attestationUid) external view returns (bool valid, Attestation memory a) {
        a = attestations[attestationUid];
        if (a.issuedAt == 0) return (false, a);
        if (a.revoked) return (false, a);
        if (a.expiresAt > 0 && a.expiresAt <= block.timestamp) return (false, a);
        return (true, a);
    }

    /// @notice Verify attestation data integrity via BLAKE2-256
    function verifyData(
        bytes32 attestationUid,
        bytes calldata originalData
    ) external view returns (bool valid) {
        Attestation storage a = attestations[attestationUid];
        require(a.issuedAt > 0, "attestation not found");
        bytes32 recomputed = system.hashBlake256(originalData);
        return recomputed == a.dataHash;
    }

    /// @notice Check if attestation is valid AND data matches (combined verification)
    function verifyFull(
        bytes32 attestationUid,
        bytes calldata originalData
    ) external view returns (bool valid, bool dataIntact, Attestation memory a) {
        a = attestations[attestationUid];
        valid = a.issuedAt > 0 && !a.revoked && (a.expiresAt == 0 || a.expiresAt > block.timestamp);
        dataIntact = valid && (system.hashBlake256(originalData) == a.dataHash);
    }

    /// @notice Batch verify multiple attestations
    function multiVerify(bytes32[] calldata uids) external view returns (bool[] memory results) {
        results = new bool[](uids.length);
        for (uint256 i = 0; i < uids.length; i++) {
            Attestation storage a = attestations[uids[i]];
            results[i] = a.issuedAt > 0 && !a.revoked && (a.expiresAt == 0 || a.expiresAt > block.timestamp);
        }
    }

    // =========================================================================
    // Query Functions
    // =========================================================================

    function getReceivedAttestations(address user) external view returns (bytes32[] memory) {
        return receivedAttestations[user];
    }

    function getIssuedAttestations(address issuer) external view returns (bytes32[] memory) {
        return issuedAttestations[issuer];
    }

    function getSchemaAttestations(bytes32 schemaUid) external view returns (bytes32[] memory) {
        return schemaAttestations[schemaUid];
    }

    function isAttestationValid(bytes32 uid) external view returns (bool) {
        Attestation storage a = attestations[uid];
        return a.issuedAt > 0 && !a.revoked && (a.expiresAt == 0 || a.expiresAt > block.timestamp);
    }

    // =========================================================================
    // XCM Cross-Chain Operations
    // =========================================================================

    /// @notice Send attestation status to another parachain via XCM
    function sendAttestationXcm(
        bytes32 attestationUid,
        bytes calldata destination,
        bytes calldata message
    ) external whenNotPaused nonReentrant {
        require(attestations[attestationUid].issuedAt > 0, "attestation not found");
        xcm.send(destination, message);
        emit XcmAttestationQuery(attestationUid, destination);
    }

    /// @notice Execute XCM locally with 10% weight safety margin
    function executeXcmLocal(bytes calldata message) external whenNotPaused nonReentrant {
        IXcm.Weight memory estimated = xcm.weighMessage(message);
        estimated.refTime = estimated.refTime * 11 / 10;
        estimated.proofSize = estimated.proofSize * 11 / 10;
        xcm.execute(message, estimated);
    }

    /// @notice Estimate XCM weight
    function estimateXcmWeight(bytes calldata message) external view returns (IXcm.Weight memory) {
        return xcm.weighMessage(message);
    }

    // =========================================================================
    // PVM System Precompile Features
    // =========================================================================

    /// @notice Resolve EVM address to Polkadot AccountId32
    function resolveIssuerIdentity(address issuer) external returns (bytes memory) {
        return system.toAccountId(issuer);
    }

    /// @notice Convert ECDSA pubkey to ETH address
    function ecdsaToAddress(uint8[33] calldata publicKey) external view returns (address) {
        return address(system.ecdsaToEthAddress(publicKey));
    }

    /// @notice Get remaining 2D execution weight
    function getRemainingWeight() external view returns (uint64 refTime, uint64 proofSize) {
        return system.weightLeft();
    }

    /// @notice Check if caller is direct (not proxy)
    function isDirectCaller() external view returns (bool) {
        return system.callerIsOrigin();
    }

    /// @notice Get existential deposit
    function getMinimumBalance() external view returns (uint256) {
        return system.minimumBalance();
    }

    /// @notice Hash data with BLAKE2-256
    function blake2Hash(bytes calldata data) external pure returns (bytes32) {
        return ISystem(SYSTEM_ADDR).hashBlake256(data);
    }

    /// @notice Hash data with BLAKE2-128 (Substrate storage key format)
    function blake2Hash128(bytes calldata data) external pure returns (bytes32) {
        return ISystem(SYSTEM_ADDR).hashBlake128(data);
    }

    /// @notice Get contract code hash for integrity verification
    function getCodeHash() external view returns (bytes32) {
        return system.ownCodeHash();
    }

    // =========================================================================
    // Off-chain Attestations (on-chain anchoring)
    // =========================================================================

    /// @notice Store only the BLAKE2 hash of an off-chain attestation (cheap)
    /// @dev The full attestation data lives off-chain (IPFS, server, etc).
    ///      Only the hash is stored on-chain for integrity verification.
    mapping(bytes32 => OffchainAnchor) public offchainAnchors;

    struct OffchainAnchor {
        bytes32 dataHash;      // BLAKE2-256 of the full off-chain attestation
        address issuer;
        uint256 anchoredAt;
        bool revoked;
    }

    event OffchainAnchored(bytes32 indexed anchorId, address indexed issuer, bytes32 dataHash);
    event OffchainRevoked(bytes32 indexed anchorId, address indexed revoker);

    /// @notice Anchor an off-chain attestation by storing its BLAKE2 hash
    function anchorOffchain(bytes calldata offchainData) external whenNotPaused returns (bytes32 anchorId) {
        bytes32 dataHash = system.hashBlake256(offchainData);
        anchorId = system.hashBlake256(abi.encodePacked(msg.sender, dataHash, block.timestamp));

        offchainAnchors[anchorId] = OffchainAnchor({
            dataHash: dataHash,
            issuer: msg.sender,
            anchoredAt: block.timestamp,
            revoked: false
        });

        emit OffchainAnchored(anchorId, msg.sender, dataHash);
    }

    /// @notice Verify an off-chain attestation against its anchor
    function verifyOffchain(bytes32 anchorId, bytes calldata offchainData) external view returns (bool valid, bool dataMatch) {
        OffchainAnchor storage anchor = offchainAnchors[anchorId];
        valid = anchor.anchoredAt > 0 && !anchor.revoked;
        dataMatch = valid && (system.hashBlake256(offchainData) == anchor.dataHash);
    }

    /// @notice Revoke an off-chain attestation anchor
    function revokeOffchain(bytes32 anchorId) external {
        OffchainAnchor storage anchor = offchainAnchors[anchorId];
        require(anchor.anchoredAt > 0, "anchor not found");
        require(anchor.issuer == msg.sender, "not issuer");
        require(!anchor.revoked, "already revoked");
        anchor.revoked = true;
        emit OffchainRevoked(anchorId, msg.sender);
    }

    // =========================================================================
    // Trustless On-Chain Proofs (contract reads state directly)
    // =========================================================================

    struct OnChainProof {
        address prover;
        uint256 nativeBalance;     // read by contract via address.balance
        uint256 blockNumber;
        uint256 timestamp;
        bytes32 dataHash;          // BLAKE2 of encoded proof data
        bytes32 accountId;         // Substrate AccountId32 via toAccountId
    }

    mapping(bytes32 => OnChainProof) public onChainProofs;
    mapping(address => bytes32[]) public userProofs;

    event OnChainProofCreated(bytes32 indexed proofId, address indexed prover, uint256 balance, uint256 blockNumber);

    /// @notice Create a trustless balance proof — contract reads msg.sender.balance directly
    /// @dev This is fully trustless: the balance is read by the contract at execution time,
    ///      not submitted by the user. Block number + timestamp prove WHEN.
    ///      BLAKE2 hash proves integrity. Substrate AccountId proves cross-ecosystem identity.
    function proveBalance() external whenNotPaused returns (bytes32 proofId) {
        uint256 balance = msg.sender.balance;
        bytes memory accountIdBytes = system.toAccountId(msg.sender);
        bytes32 accountId;
        assembly { accountId := mload(add(accountIdBytes, 32)) }

        bytes memory proofData = abi.encodePacked(
            msg.sender, balance, block.number, block.timestamp, accountId
        );
        bytes32 dataHash = system.hashBlake256(proofData);
        proofId = system.hashBlake256(abi.encodePacked(msg.sender, dataHash, block.timestamp));

        onChainProofs[proofId] = OnChainProof({
            prover: msg.sender,
            nativeBalance: balance,
            blockNumber: block.number,
            timestamp: block.timestamp,
            dataHash: dataHash,
            accountId: accountId
        });
        userProofs[msg.sender].push(proofId);

        emit OnChainProofCreated(proofId, msg.sender, balance, block.number);
    }

    /// @notice Create a trustless ERC20 token balance proof
    function proveTokenBalance(address token) external whenNotPaused returns (bytes32 proofId) {
        // Read token balance directly from the token contract
        (bool success, bytes memory result) = token.staticcall(
            abi.encodeWithSignature("balanceOf(address)", msg.sender)
        );
        require(success && result.length >= 32, "token read failed");
        uint256 tokenBalance = abi.decode(result, (uint256));

        bytes memory proofData = abi.encodePacked(
            msg.sender, token, tokenBalance, block.number, block.timestamp
        );
        bytes32 dataHash = system.hashBlake256(proofData);
        proofId = system.hashBlake256(abi.encodePacked(msg.sender, dataHash, block.timestamp));

        onChainProofs[proofId] = OnChainProof({
            prover: msg.sender,
            nativeBalance: tokenBalance,
            blockNumber: block.number,
            timestamp: block.timestamp,
            dataHash: dataHash,
            accountId: bytes32(uint256(uint160(token)))
        });
        userProofs[msg.sender].push(proofId);

        emit OnChainProofCreated(proofId, msg.sender, tokenBalance, block.number);
    }

    /// @notice Create a proof combining balance + existential deposit + weight (full PVM snapshot)
    function proveFullState() external whenNotPaused returns (bytes32 proofId) {
        uint256 balance = msg.sender.balance;
        uint256 minBalance = system.minimumBalance();
        (uint64 refTime, uint64 proofSize) = system.weightLeft();
        bytes32 codeHash = system.ownCodeHash();
        bool isDirect = system.callerIsOrigin();

        bytes memory accountIdBytes = system.toAccountId(msg.sender);
        bytes32 accountId;
        assembly { accountId := mload(add(accountIdBytes, 32)) }

        bytes memory proofData = abi.encodePacked(
            msg.sender, balance, minBalance, refTime, proofSize,
            codeHash, isDirect, accountId, block.number, block.timestamp
        );
        bytes32 dataHash = system.hashBlake256(proofData);
        proofId = system.hashBlake256(abi.encodePacked(msg.sender, dataHash, block.timestamp));

        onChainProofs[proofId] = OnChainProof({
            prover: msg.sender,
            nativeBalance: balance,
            blockNumber: block.number,
            timestamp: block.timestamp,
            dataHash: dataHash,
            accountId: accountId
        });
        userProofs[msg.sender].push(proofId);

        emit OnChainProofCreated(proofId, msg.sender, balance, block.number);
    }

    /// @notice Get a proof by ID
    function getOnChainProof(bytes32 proofId) external view returns (OnChainProof memory) {
        return onChainProofs[proofId];
    }

    /// @notice Get all proof IDs for a user
    function getUserProofs(address user) external view returns (bytes32[] memory) {
        return userProofs[user];
    }

    // =========================================================================
    // Soulbound Credential Token (non-transferable)
    // =========================================================================

    struct SoulboundToken {
        address holder;
        bytes32 anchorId;        // links to off-chain proof anchor
        string credentialType;   // e.g. "kyc", "trade-history", "investment"
        uint256 mintedAt;
    }

    uint256 public sbtNextId;
    mapping(uint256 => SoulboundToken) public soulboundTokens;
    mapping(address => uint256[]) public holderTokens;

    event SBTMinted(uint256 indexed tokenId, address indexed holder, bytes32 indexed anchorId, string credentialType);

    /// @notice Mint a soulbound credential token linked to an anchored proof
    function mintSBT(bytes32 anchorId, string calldata credentialType) external whenNotPaused returns (uint256 tokenId) {
        // Verify the anchor exists and belongs to the caller
        OffchainAnchor storage anchor = offchainAnchors[anchorId];
        require(anchor.anchoredAt > 0, "anchor not found");
        require(anchor.issuer == msg.sender, "not anchor owner");
        require(!anchor.revoked, "anchor revoked");

        tokenId = sbtNextId++;
        soulboundTokens[tokenId] = SoulboundToken({
            holder: msg.sender,
            anchorId: anchorId,
            credentialType: credentialType,
            mintedAt: block.timestamp
        });
        holderTokens[msg.sender].push(tokenId);

        emit SBTMinted(tokenId, msg.sender, anchorId, credentialType);
    }

    /// @notice Check if an address holds a specific credential type
    function hasCredential(address holder, string calldata credentialType) external view returns (bool) {
        uint256[] storage tokens = holderTokens[holder];
        for (uint256 i = 0; i < tokens.length; i++) {
            SoulboundToken storage sbt = soulboundTokens[tokens[i]];
            if (keccak256(bytes(sbt.credentialType)) == keccak256(bytes(credentialType)) &&
                !offchainAnchors[sbt.anchorId].revoked) {
                return true;
            }
        }
        return false;
    }

    /// @notice Get all SBT IDs for a holder
    function getHolderTokens(address holder) external view returns (uint256[] memory) {
        return holderTokens[holder];
    }

    // =========================================================================
    // Admin
    // =========================================================================

    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }
}
