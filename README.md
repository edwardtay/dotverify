# DotVerify

**On-chain attestation and credential verification for Polkadot Hub** — register schemas, issue verifiable credentials, and verify them cross-chain with PVM-native cryptography.

![Polkadot](https://img.shields.io/badge/Polkadot-E6007A?style=flat&logo=polkadot&logoColor=white)
![Solidity](https://img.shields.io/badge/Solidity-0.8.26-363636?style=flat&logo=solidity&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js_16-000?style=flat&logo=next.js&logoColor=white)
![Foundry](https://img.shields.io/badge/Foundry-DEA584?style=flat)

**Live Demo:** [dotverify.vercel.app](https://dotverify.vercel.app)
**Contract:** [`0xC3B8399Cd69EC199eD663Ee281d2094dbA48EF7d`](https://blockscout-testnet.polkadot.io/address/0xC3B8399Cd69EC199eD663Ee281d2094dbA48EF7d) on Polkadot Hub Testnet

---

## Problem

Credentials today are PDFs and emails. They can't be verified without contacting the issuer, they can be forged, and they don't work across chains or ecosystems.

Existing on-chain attestation protocols (EAS, Verax) run on standard EVM chains where:

1. Attestation hashing uses keccak256 — incompatible with Polkadot's native BLAKE2
2. Substrate wallet users (sr25519) can't issue credentials without an EVM wallet
3. Credentials can't be verified cross-chain without bridges or oracles
4. No protection against proxy/relay attacks on credential issuance
5. No awareness of Polkadot-specific concepts like existential deposits or 2D weight

DotVerify solves all five natively on Polkadot Hub PVM.

---

## Why PVM? (Not Possible on Standard EVM)

DotVerify's smart contract uses **6 PVM-exclusive precompiles** from two interfaces:

| Feature | Precompile | Standard EVM? | What it enables |
|---------|-----------|:---:|----------------|
| **BLAKE2-256 attestation hashing** | ISystem `0x900` | No | All UIDs use Polkadot-native hashing for Substrate compatibility |
| **sr25519 issuer authentication** | ISystem `0x900` | No | Substrate wallets authorize credentials via sr25519, verified on-chain by PVM |
| **XCM cross-chain queries** | IXcm `0xA0000` | No | Verify credentials on any parachain without bridges |
| **callerIsOrigin protection** | ISystem `0x900` | No | Block proxy/relay attacks on credential issuance |
| **ecdsaToEthAddress** | ISystem `0x900` | No | Cross-ecosystem issuer identity resolution |
| **2D weight metering** | ISystem `0x900` | No | Expose refTime + proofSize for gas estimation |

On Ethereum or any standard EVM L2, none of these features exist.

---

## Architecture

```
                                    Polkadot Hub Testnet
                                   ┌──────────────────────┐
                                   │    DotVerify.sol      │
                                   │                      │
                                   │  SchemaRegistry ◄────┼── registerSchema
                                   │  Attestations  ◄────┼── attest / attestSecure
                                   │  Verification  ◄────┼── verify / verifyData
                                   │  Revocation    ◄────┼── revoke
                                   │  sr25519 Auth  ◄────┼── attestWithSr25519
                                   │  XCM Queries   ◄────┼── sendAttestationXcm
                                   │                      │
                                   │  ISystem (0x900)     │  IXcm (0xA0000)
                                   └────────┬─────────────┘
                                            │
┌───────────────────────────────────────────┼──────────────────────────┐
│                          Frontend (Next.js 16)                       │
│                                                                      │
│  ┌──────────┐ ┌───────┐ ┌────────┐ ┌────────┐ ┌──────┐ ┌─────────┐ │
│  │ Schema   │ │ Issue │ │ Verify │ │My Creds│ │ PVM  │ │   AI    │ │
│  │ Registry │ │Attest.│ │Credent.│ │Received│ │Explorer│ │ Chat  │ │
│  │ Create + │ │Dynamic│ │By UID  │ │+ Issued│ │Stats │ │Suggest │ │
│  │ Browse   │ │ Forms │ │+ Data  │ │+ Revoke│ │ Live │ │Analyze │ │
│  └──────────┘ └───────┘ └────────┘ └────────┘ └──────┘ └─────────┘ │
│                                                                      │
│  Wallets: MetaMask / RainbowKit + Polkadot.js / Talisman / SubWallet│
└──────────────────────────────────────────────────────────────────────┘
```

---

## Features

### Schema Registry
- Define attestation schemas with typed fields (e.g. `name:string,degree:string,date:uint256`)
- Choose revocable or permanent (non-revocable attestations can never be taken back)
- Pre-built templates for common use cases: Identity, Diploma, Employment
- Schema UIDs generated with BLAKE2-256

### Issue Credentials
- Dynamic form generated from schema field definitions
- Issue with MetaMask (EVM) or Substrate wallet (sr25519)
- Optional expiration dates
- Replay-protected sr25519 signatures via BLAKE2 hashing

### Verify Credentials
- Verify any attestation by UID — returns valid, expired, or revoked
- Full details: issuer, recipient, schema, data, timestamps
- Data integrity verification via BLAKE2 hash comparison
- Cross-chain verification via XCM to any Polkadot parachain

### My Credentials
- View received and issued attestations
- Revoke issued attestations (if schema allows)
- Status badges: Valid, Expired, Revoked

### AI Assistant
- Suggest schema definitions for any use case
- Analyze documents to extract attestation fields
- Explain PVM features and verification flow
- Multi-provider AI (Claude, Llama, Cerebras)

### Dual Wallet Support
- EVM wallets via RainbowKit (MetaMask, WalletConnect)
- Substrate wallets via Polkadot.js (Talisman, SubWallet, Polkadot.js)
- Both connected simultaneously

---

## Smart Contract

**[`DotVerify.sol`](contracts/src/DotVerify.sol)** — deployed on Polkadot Hub Testnet.

```solidity
// PVM precompile interfaces
IXcm  public constant xcm    = IXcm(0x0000000000000000000000000000000000A0000);
ISystem public constant system = ISystem(0x0000000000000000000000000000000000000900);

// Schema Registry (with optional resolvers)
function registerSchema(string name, string definition, bool revocable, address resolver) → bytes32 uid

// Trusted Issuer Registry (PVM identity binding)
function registerIssuer(string name)  // binds EVM address to Substrate AccountId32

// Attestation Lifecycle
function attest(bytes32 schemaUid, address recipient, bytes data, uint256 expiresAt, bytes32 refUid) → bytes32 uid
function attestSecure(...)  // + callerIsOrigin verification
function attestWithSr25519(uint8[64] sig, bytes32 pubKey, ...) → bytes32 uid  // Substrate wallet issuance
function attestDelegated(address issuer, ...) → bytes32 uid  // delegated issuance
function revoke(bytes32 attestationUid)

// Batch Operations
function multiAttest(AttestationRequest[] requests) → bytes32[] uids
function multiRevoke(bytes32[] attestationUids)

// Verification
function verify(bytes32 attestationUid) → (bool valid, Attestation memory)
function verifyData(bytes32 attestationUid, bytes data) → bool  // BLAKE2 integrity
function verifyFull(bytes32 uid, bytes data) → (bool valid, bool dataIntact, Attestation memory)
function multiVerify(bytes32[] uids) → bool[]

// Delegation
function addDelegate(address delegate)
function removeDelegate(address delegate)

// Cross-Chain
function sendAttestationXcm(bytes32 uid, bytes dest, bytes msg)
function executeXcmLocal(bytes message)

// PVM System Queries
function blake2Hash(bytes data) → bytes32
function blake2Hash128(bytes data) → bytes32
function resolveIssuerIdentity(address) → bytes accountId
function ecdsaToAddress(uint8[33] pubKey) → address
function getRemainingWeight() → (uint64 refTime, uint64 proofSize)
function isDirectCaller() → bool
function getMinimumBalance() → uint256
```

### Security
- OpenZeppelin `Ownable`, `ReentrancyGuard`, `Pausable`
- sr25519 replay prevention via BLAKE2 signature hashing
- callerIsOrigin blocks proxy/relay attacks on `attestSecure()`
- Schema resolvers: custom hooks that can accept/reject attestations and revocations
- Delegated attestations: authorized delegates can attest/revoke on behalf of issuers
- Schema-level revocability control (permanent credentials can never be revoked)

### Test Results
```
51 tests passed, 0 failed (unit + fuzz tests)
11 E2E tests passed on live testnet
```

---

## Getting Started

### Prerequisites
- Node.js 18+
- [Foundry](https://book.getfoundry.sh/getting-started/installation)

### Frontend

```bash
cd frontend
cp .env.example .env.local
# Add API keys (at least one AI provider)
pnpm install
pnpm dev
```

Open http://localhost:3000 — connect a wallet and start creating schemas.

### Smart Contracts

```bash
cd contracts
forge build
forge test -vv     # 37 tests
```

Deploy to Polkadot Hub Testnet:

```bash
source .env        # PRIVATE_KEY must be set
forge script script/Deploy.s.sol \
  --rpc-url https://eth-rpc-testnet.polkadot.io \
  --broadcast --legacy
```

---

## Project Structure

```
dotverify/
├── contracts/                 Foundry project
│   ├── src/
│   │   ├── DotVerify.sol            Main contract (480+ lines)
│   │   └── interfaces/
│   │       ├── ISystem.sol          PVM System precompile (0x900)
│   │       └── IXcm.sol             PVM XCM precompile (0xA0000)
│   ├── test/
│   │   └── DotVerify.t.sol          51 tests (schema, attest, revoke, resolver, delegate, batch, sr25519, XCM, fuzz)
│   └── script/
│       └── Deploy.s.sol             Deployment script
├── frontend/                  Next.js 16 + React 19
│   ├── src/components/        Schema registry, attestation, verification, AI chat
│   ├── src/app/api/agent/     AI agent with 5 tool functions
│   ├── src/hooks/             wagmi + Polkadot.js wallet hooks
│   └── src/config/            Chain config, contract ABI, site metadata
└── README.md
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Chain** | Polkadot Hub Testnet (Chain ID: 420420417) |
| **Contracts** | Solidity 0.8.26, Foundry, OpenZeppelin, PVM Precompiles |
| **Frontend** | Next.js 16, React 19, wagmi, viem, RainbowKit, Polkadot.js, Tailwind |
| **AI** | Multi-provider (Claude / Llama / Cerebras) with 5 tool functions |

---

## Roadmap

### Phase 1 — MVP (Current)
- Schema registry with BLAKE2-256 UIDs
- Attestation issuance, revocation, verification
- sr25519 issuer authentication
- Schema resolvers (custom hooks)
- Delegated attestations
- Batch operations (multiAttest, multiRevoke)
- AI assistant for schema suggestions and document analysis
- Dual wallet support (EVM + Substrate)
- Deployed on Polkadot Hub Testnet

### Phase 2 — Protocol Expansion
- Off-chain attestations (signed but not stored on-chain, lower cost)
- EIP-712 typed signature delegation
- Attestation indexer service (GraphQL API for fast queries)
- Schema marketplace (discover and reuse community schemas)
- Attestation explorer (search by issuer, recipient, schema)

### Phase 3 — Ecosystem Integration
- SDK for dApps to integrate DotVerify verification
- XCM attestation relay to Moonbeam, Astar, and other parachains
- Resolver library (payment-gated attestations, token-gated schemas, DAO-vote resolvers)
- Mainnet deployment on Polkadot Hub
- Integration with Polkadot identity system

### Phase 4 — Adoption
- Institutional issuer onboarding (universities, employers, auditors)
- Mobile credential wallet
- W3C Verifiable Credentials compatibility layer
- Governance for protocol upgrades via OpenGov

---

## License

MIT
