# PolkaProve

**Prove Web2 facts on Polkadot.** Anchor tamper-proof proofs of your identity, finances, and credentials on Polkadot Hub — powered by zkTLS and PVM precompiles.

![Polkadot](https://img.shields.io/badge/Polkadot-E6007A?style=flat&logo=polkadot&logoColor=white)
![Solidity](https://img.shields.io/badge/Solidity-0.8.26-363636?style=flat&logo=solidity&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js_16-000?style=flat&logo=next.js&logoColor=white)
![Foundry](https://img.shields.io/badge/Foundry-DEA584?style=flat)

**Live:** [dotverify.vercel.app](https://dotverify.vercel.app)
**Contract:** [`0x9FC85713c0764eadA3c60DeB12687101971f8d45`](https://blockscout-testnet.polkadot.io/address/0x9FC85713c0764eadA3c60DeB12687101971f8d45) (verified on Blockscout)

---

## How It Works

1. **Prove** — Select a data source (Binance, OKX, TikTok, Legion). zkTLS verifies the data came from the real website via TLS.
2. **Anchor** — The verified proof is hashed with BLAKE2-256 (Polkadot-native) and stored on Polkadot Hub. Only the fingerprint goes on-chain — your data stays private.
3. **Verify** — Anyone can check if proof data matches the on-chain anchor. No wallet needed.

```
User → Primus zkTLS Attestor → Verified Data → BLAKE2 Hash → Polkadot Hub
                                                                    ↓
                                                              Anyone verifies
```

---

## zkTLS Proof Templates

| Template | Source | What it proves |
|----------|--------|----------------|
| **Legion Investment** | app.legion.cc | Total invested amount |
| **Binance Trade History** | binance.com | 30-day spot trading activity |
| **OKX KYC Level** | okx.com | KYC verification status |
| **TikTok Balance** | tiktok.com | Coin balance on platform |

Powered by [Primus zkTLS](https://primuslabs.xyz/) — a cryptographic attestor network that verifies TLS sessions without seeing your credentials.

---

## Why Polkadot Hub PVM

The smart contract uses PVM-exclusive precompiles not available on standard EVM:

| Feature | Precompile | What it does |
|---------|-----------|-------------|
| **BLAKE2-256** | ISystem `0x900` | Polkadot-native hashing for proof fingerprints |
| **toAccountId** | ISystem `0x900` | Maps EVM address to Substrate AccountId32 |
| **callerIsOrigin** | ISystem `0x900` | Blocks proxy/relay attacks on secure proofs |
| **minimumBalance** | ISystem `0x900` | Existential deposit awareness |
| **weightLeft** | ISystem `0x900` | 2D weight metering (refTime + proofSize) |
| **XCM send** | IXcm `0xA0000` | Cross-chain proof queries to any parachain |

---

## Smart Contract

**[`DotVerify.sol`](contracts/src/DotVerify.sol)** — deployed and verified on Polkadot Hub Testnet.

```solidity
// Off-chain proof anchoring
function anchorOffchain(bytes data) → bytes32 anchorId     // BLAKE2 hash + store
function verifyOffchain(bytes32 anchorId, bytes data) → (bool valid, bool dataMatch)
function revokeOffchain(bytes32 anchorId)

// Trustless on-chain proofs (contract reads state directly)
function proveBalance() → bytes32 proofId                  // reads msg.sender.balance
function proveFullState() → bytes32 proofId                // balance + weight + codeHash + callerIsOrigin
function proveTokenBalance(address token) → bytes32 proofId

// Full attestation protocol (available for dApps building on top)
function registerSchema(name, definition, revocable, resolver) → bytes32 uid
function attest(schemaUid, recipient, data, expiresAt, refUid) → bytes32 uid
function verify(attestationUid) → (bool valid, Attestation memory)
function revoke(attestationUid)
```

### Security (OpenZeppelin)
- **Ownable** — admin controls
- **ReentrancyGuard** — reentrancy protection on XCM functions
- **Pausable** — emergency circuit breaker
- 3 resolver contracts: PaymentResolver, TokenGateResolver, AllowlistResolver

### Tests
```
60 tests passed, 0 failed (unit + fuzz)
```

---

## Getting Started

### Frontend

```bash
cd frontend
cp .env.example .env.local
pnpm install
pnpm dev
```

### Smart Contracts

```bash
cd contracts
forge build
forge test -vv     # 60 tests
```

Deploy:
```bash
source .env
forge script script/Deploy.s.sol \
  --rpc-url https://eth-rpc-testnet.polkadot.io \
  --broadcast --legacy
```

---

## Project Structure

```
├── contracts/
│   ├── src/
│   │   ├── DotVerify.sol              Main contract
│   │   ├── interfaces/                ISystem.sol, IXcm.sol
│   │   └── resolvers/                 Payment, TokenGate, Allowlist
│   └── test/                          60 tests
├── frontend/
│   ├── src/components/
│   │   ├── prove-tab.tsx              zkTLS proofs + custom anchoring
│   │   ├── zktls-prove.tsx            Primus zkTLS SDK integration
│   │   ├── my-proofs-tab.tsx          Proof history
│   │   └── verify-tab.tsx             Anchor verification
│   ├── src/app/                       Next.js pages
│   └── src/config/                    Contract ABI, chain config
└── README.md
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Chain** | Polkadot Hub Testnet (420420417) |
| **Contracts** | Solidity 0.8.26, Foundry, **OpenZeppelin**, PVM Precompiles |
| **zkTLS** | Primus Network JS SDK |
| **Frontend** | Next.js 16, React 19, wagmi, viem, RainbowKit, Tailwind |

---

## Roadmap

**Current** — zkTLS proof anchoring with 4 templates, off-chain + on-chain proofs, verified contract

**Next** — More zkTLS templates (GitHub, LinkedIn, bank APIs), on-chain attestor signature verification, XCM proof relay to parachains, mobile-friendly proof sharing

**Future** — Primus attestor contract on Polkadot Hub (verify zkTLS signatures on-chain), SDK for dApps, mainnet deployment

---

## License

MIT
