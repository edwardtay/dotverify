export const DOTVERIFY_ADDRESS = (process.env.NEXT_PUBLIC_DOTVERIFY_ADDRESS || "0x5f7D3BF531C2DcF0d7dd791BA38dEE36Dc9A8C9E") as `0x${string}`;

export const DOTVERIFY_ABI = [
  // Schema Registry (3-arg overload, no resolver)
  {
    name: "registerSchema",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "name", type: "string" },
      { name: "definition", type: "string" },
      { name: "revocable", type: "bool" },
    ],
    outputs: [{ name: "uid", type: "bytes32" }],
  },
  // Schema Registry (4-arg overload, with resolver)
  {
    name: "registerSchema",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "name", type: "string" },
      { name: "definition", type: "string" },
      { name: "revocable", type: "bool" },
      { name: "resolver", type: "address" },
    ],
    outputs: [{ name: "uid", type: "bytes32" }],
  },
  {
    name: "getSchema",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "uid", type: "bytes32" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "uid", type: "bytes32" },
          { name: "creator", type: "address" },
          { name: "name", type: "string" },
          { name: "definition", type: "string" },
          { name: "revocable", type: "bool" },
          { name: "resolver", type: "address" },
          { name: "createdAt", type: "uint256" },
        ],
      },
    ],
  },
  {
    name: "getSchemaCount",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "getAllSchemaUids",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "bytes32[]" }],
  },
  // Attestations
  {
    name: "attest",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "schemaUid", type: "bytes32" },
      { name: "recipient", type: "address" },
      { name: "data", type: "bytes" },
      { name: "expiresAt", type: "uint256" },
      { name: "refUid", type: "bytes32" },
    ],
    outputs: [{ name: "uid", type: "bytes32" }],
  },
  {
    name: "attestSecure",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "schemaUid", type: "bytes32" },
      { name: "recipient", type: "address" },
      { name: "data", type: "bytes" },
      { name: "expiresAt", type: "uint256" },
      { name: "refUid", type: "bytes32" },
    ],
    outputs: [{ name: "uid", type: "bytes32" }],
  },
  {
    name: "attestWithSr25519",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "signature", type: "uint8[64]" },
      { name: "publicKey", type: "bytes32" },
      { name: "schemaUid", type: "bytes32" },
      { name: "recipient", type: "address" },
      { name: "data", type: "bytes" },
      { name: "expiresAt", type: "uint256" },
    ],
    outputs: [{ name: "uid", type: "bytes32" }],
  },
  {
    name: "attestDelegated",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "issuer", type: "address" },
      { name: "schemaUid", type: "bytes32" },
      { name: "recipient", type: "address" },
      { name: "data", type: "bytes" },
      { name: "expiresAt", type: "uint256" },
      { name: "refUid", type: "bytes32" },
    ],
    outputs: [{ name: "uid", type: "bytes32" }],
  },
  {
    name: "revoke",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "attestationUid", type: "bytes32" }],
    outputs: [],
  },
  {
    name: "verify",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "attestationUid", type: "bytes32" }],
    outputs: [
      { name: "valid", type: "bool" },
      {
        name: "a",
        type: "tuple",
        components: [
          { name: "uid", type: "bytes32" },
          { name: "schemaUid", type: "bytes32" },
          { name: "issuer", type: "address" },
          { name: "recipient", type: "address" },
          { name: "data", type: "bytes" },
          { name: "dataHash", type: "bytes32" },
          { name: "issuedAt", type: "uint256" },
          { name: "expiresAt", type: "uint256" },
          { name: "revoked", type: "bool" },
          { name: "refUid", type: "bytes32" },
        ],
      },
    ],
  },
  {
    name: "verifyData",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "attestationUid", type: "bytes32" },
      { name: "originalData", type: "bytes" },
    ],
    outputs: [{ name: "valid", type: "bool" }],
  },
  {
    name: "getReceivedAttestations",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ name: "", type: "bytes32[]" }],
  },
  {
    name: "getIssuedAttestations",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "issuer", type: "address" }],
    outputs: [{ name: "", type: "bytes32[]" }],
  },
  {
    name: "getSchemaAttestations",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "schemaUid", type: "bytes32" }],
    outputs: [{ name: "", type: "bytes32[]" }],
  },
  {
    name: "attestationCount",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  // XCM
  {
    name: "sendAttestationXcm",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "attestationUid", type: "bytes32" },
      { name: "destination", type: "bytes" },
      { name: "message", type: "bytes" },
    ],
    outputs: [],
  },
  {
    name: "estimateXcmWeight",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "message", type: "bytes" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "refTime", type: "uint64" },
          { name: "proofSize", type: "uint64" },
        ],
      },
    ],
  },
  // System
  {
    name: "getRemainingWeight",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [
      { name: "refTime", type: "uint64" },
      { name: "proofSize", type: "uint64" },
    ],
  },
  {
    name: "isDirectCaller",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "getMinimumBalance",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "blake2Hash",
    type: "function",
    stateMutability: "pure",
    inputs: [{ name: "data", type: "bytes" }],
    outputs: [{ name: "", type: "bytes32" }],
  },
  {
    name: "getCodeHash",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "bytes32" }],
  },
  // Issuer Registry
  {
    name: "registerIssuer",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "name", type: "string" }],
    outputs: [],
  },
  {
    name: "getIssuer",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "addr", type: "address" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "registered", type: "bool" },
          { name: "name", type: "string" },
          { name: "substrateAccountId", type: "bytes32" },
          { name: "codeHashAtRegistration", type: "bytes32" },
          { name: "attestationsMade", type: "uint256" },
          { name: "registeredAt", type: "uint256" },
        ],
      },
    ],
  },
  {
    name: "getIssuerCount",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  // Delegates
  {
    name: "addDelegate",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "delegate", type: "address" }],
    outputs: [],
  },
  {
    name: "removeDelegate",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "delegate", type: "address" }],
    outputs: [],
  },
  {
    name: "delegates",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "issuer", type: "address" },
      { name: "delegate", type: "address" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  // Batch Operations
  {
    name: "multiAttest",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "requests",
        type: "tuple[]",
        components: [
          { name: "schemaUid", type: "bytes32" },
          { name: "recipient", type: "address" },
          { name: "data", type: "bytes" },
          { name: "expiresAt", type: "uint256" },
          { name: "refUid", type: "bytes32" },
        ],
      },
    ],
    outputs: [{ name: "uids", type: "bytes32[]" }],
  },
  {
    name: "multiRevoke",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "attestationUids", type: "bytes32[]" }],
    outputs: [],
  },
  // Extended Verification
  {
    name: "multiVerify",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "uids", type: "bytes32[]" }],
    outputs: [{ name: "results", type: "bool[]" }],
  },
  {
    name: "verifyFull",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "attestationUid", type: "bytes32" },
      { name: "originalData", type: "bytes" },
    ],
    outputs: [
      { name: "valid", type: "bool" },
      { name: "dataIntact", type: "bool" },
      {
        name: "a",
        type: "tuple",
        components: [
          { name: "uid", type: "bytes32" },
          { name: "schemaUid", type: "bytes32" },
          { name: "issuer", type: "address" },
          { name: "recipient", type: "address" },
          { name: "data", type: "bytes" },
          { name: "dataHash", type: "bytes32" },
          { name: "issuedAt", type: "uint256" },
          { name: "expiresAt", type: "uint256" },
          { name: "revoked", type: "bool" },
          { name: "refUid", type: "bytes32" },
        ],
      },
    ],
  },
  {
    name: "isAttestationValid",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "uid", type: "bytes32" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "blake2Hash128",
    type: "function",
    stateMutability: "pure",
    inputs: [{ name: "data", type: "bytes" }],
    outputs: [{ name: "", type: "bytes32" }],
  },
  // Off-chain Anchoring
  {
    name: "anchorOffchain",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "data", type: "bytes" }],
    outputs: [{ name: "anchorId", type: "bytes32" }],
  },
  {
    name: "verifyOffchain",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "anchorId", type: "bytes32" },
      { name: "data", type: "bytes" },
    ],
    outputs: [
      { name: "valid", type: "bool" },
      { name: "dataMatch", type: "bool" },
    ],
  },
  {
    name: "revokeOffchain",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "anchorId", type: "bytes32" }],
    outputs: [],
  },
  // Trustless On-Chain Proofs
  {
    name: "proveBalance",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [{ name: "proofId", type: "bytes32" }],
  },
  {
    name: "proveTokenBalance",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "token", type: "address" }],
    outputs: [{ name: "proofId", type: "bytes32" }],
  },
  {
    name: "proveFullState",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [{ name: "proofId", type: "bytes32" }],
  },
  {
    name: "getOnChainProof",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "proofId", type: "bytes32" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "prover", type: "address" },
          { name: "nativeBalance", type: "uint256" },
          { name: "blockNumber", type: "uint256" },
          { name: "timestamp", type: "uint256" },
          { name: "dataHash", type: "bytes32" },
          { name: "accountId", type: "bytes32" },
        ],
      },
    ],
  },
  {
    name: "getUserProofs",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ name: "", type: "bytes32[]" }],
  },
  // Soulbound Credential Tokens
  {
    name: "mintSBT",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "anchorId", type: "bytes32" },
      { name: "credentialType", type: "string" },
    ],
    outputs: [{ name: "tokenId", type: "uint256" }],
  },
  {
    name: "hasCredential",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "holder", type: "address" },
      { name: "credentialType", type: "string" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "getHolderTokens",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "holder", type: "address" }],
    outputs: [{ name: "", type: "uint256[]" }],
  },
  {
    name: "sbtNextId",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  // Events
  {
    name: "SchemaRegistered",
    type: "event",
    inputs: [
      { name: "uid", type: "bytes32", indexed: true },
      { name: "creator", type: "address", indexed: true },
      { name: "name", type: "string", indexed: false },
    ],
  },
  {
    name: "AttestationCreated",
    type: "event",
    inputs: [
      { name: "uid", type: "bytes32", indexed: true },
      { name: "schemaUid", type: "bytes32", indexed: true },
      { name: "issuer", type: "address", indexed: true },
      { name: "recipient", type: "address", indexed: false },
    ],
  },
  {
    name: "AttestationRevoked",
    type: "event",
    inputs: [
      { name: "uid", type: "bytes32", indexed: true },
      { name: "revoker", type: "address", indexed: true },
    ],
  },
  {
    name: "IssuerRegistered",
    type: "event",
    inputs: [
      { name: "issuer", type: "address", indexed: true },
      { name: "name", type: "string", indexed: false },
      { name: "substrateId", type: "bytes32", indexed: false },
    ],
  },
  {
    name: "DelegateAdded",
    type: "event",
    inputs: [
      { name: "issuer", type: "address", indexed: true },
      { name: "delegate", type: "address", indexed: true },
    ],
  },
  {
    name: "DelegateRemoved",
    type: "event",
    inputs: [
      { name: "issuer", type: "address", indexed: true },
      { name: "delegate", type: "address", indexed: true },
    ],
  },
] as const;
