# PolkaProve

**Prove Web2 facts on Polkadot.** Verify data from real websites with zkTLS, anchor tamper-proof fingerprints on Polkadot Hub, and mint soulbound credential NFTs.

![Polkadot](https://img.shields.io/badge/Polkadot-E6007A?style=flat&logo=polkadot&logoColor=white)
![Solidity](https://img.shields.io/badge/Solidity-0.8.26-363636?style=flat&logo=solidity&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js_16-000?style=flat&logo=next.js&logoColor=white)
![Foundry](https://img.shields.io/badge/Foundry-DEA584?style=flat)

**Live:** [polkaprove.vercel.app](https://polkaprove.vercel.app)
**Contract:** [`0x5f7D3BF531C2DcF0d7dd791BA38dEE36Dc9A8C9E`](https://blockscout-testnet.polkadot.io/address/0x5f7D3BF531C2DcF0d7dd791BA38dEE36Dc9A8C9E) (verified on Blockscout)

---

## What Does "Prove" Mean?

PolkaProve combines three layers of verification — not a single ZK prover, but a trust chain from website to blockchain:

| Layer | What it proves | How |
|-------|---------------|-----|
| **zkTLS (Primus)** | Data came from a real website | A Primus attestor co-verifies the TLS session between your browser and the source (Binance, OKX, TikTok, etc). The attestor signs a cryptographic proof that the data is authentic — without ever seeing your login credentials. |
| **BLAKE2-256 (PVM)** | Data hasn't been tampered with | The proof is hashed using Polkadot-native BLAKE2-256 and anchored on-chain. Any modification to the data is instantly detectable. |
| **Soulbound Token** | You hold a verified credential | After proving, you can mint a non-transferable credential NFT linked to the proof anchor. dApps can check `hasCredential(address, type)` on-chain. |

**What this is NOT:** PolkaProve doesn't generate zero-knowledge proofs in the traditional sense (no Groth16, no PLONK circuits). It's attestation-based: a trusted attestor (Primus network) vouches for data authenticity, and the blockchain provides immutability and verifiability.

---

## How It Works

```
User clicks "Binance Trade History"
  → Primus JS SDK opens browser authentication
  → User logs into Binance
  → Primus attestor verifies the TLS session with Binance's server
  → Attestor signs the verified data (without seeing credentials)
  → Proof returned to browser
  → User clicks "Anchor on Polkadot Hub"
  → Contract hashes proof with BLAKE2-256 and stores the fingerprint
  → User mints a Soulbound Credential NFT linked to the anchor
  → Anyone can verify: hasCredential(address, "trader") → true
```

---

## zkTLS Proof Templates

| Template | Source | What it proves |
|----------|--------|----------------|
| **Legion Investment** | app.legion.cc | Total invested amount |
| **Binance Trade History** | binance.com | 30-day spot trading activity |
| **OKX KYC Level** | okx.com | KYC verification status |
| **TikTok Balance** | tiktok.com | Coin balance on platform |

**Privacy Mode:** Each template supports selective disclosure — prove "balance > $10,000" without revealing the exact amount.

Powered by [Primus zkTLS](https://primuslabs.xyz/).

---

## Soulbound Credentials

After proving a fact, mint a non-transferable credential NFT:

- **KYC Verified** — proves identity verification status
- **Active Trader** — proves trading history
- **Verified Investor** — proves investment activity
- **Identity Verified** — proves account ownership
- **Social Verified** — proves social media presence

dApps can gate access with a single contract call:
```solidity
polkaProve.hasCredential(userAddress, "kyc") // → true/false
```

---

## Why Polkadot Hub PVM

| Feature | Precompile | What it does |
|---------|-----------|-------------|
| **BLAKE2-256** | ISystem `0x900` | Polkadot-native hashing for proof fingerprints |
| **toAccountId** | ISystem `0x900` | Maps EVM address to Substrate AccountId32 |
| **callerIsOrigin** | ISystem `0x900` | Blocks proxy attacks on secure proofs |
| **minimumBalance** | ISystem `0x900` | Existential deposit awareness |
| **weightLeft** | ISystem `0x900` | 2D weight metering (refTime + proofSize) |
| **XCM send** | IXcm `0xA0000` | Cross-chain proof queries to any parachain |

---

## Smart Contract

**[`PolkaProve.sol`](contracts/src/DotVerify.sol)** — deployed and verified on Polkadot Hub Testnet.

```solidity
// zkTLS proof anchoring
function anchorOffchain(bytes data) → bytes32 anchorId
function verifyOffchain(bytes32 anchorId, bytes data) → (bool valid, bool dataMatch)
function revokeOffchain(bytes32 anchorId)

// Soulbound credential NFTs
function mintSBT(bytes32 anchorId, string credentialType) → uint256 tokenId
function hasCredential(address holder, string credentialType) → bool
function getHolderTokens(address holder) → uint256[]

// Trustless on-chain proofs
function proveBalance() → bytes32 proofId
function proveFullState() → bytes32 proofId
```

### Security (OpenZeppelin)
- **Ownable** — admin controls
- **ReentrancyGuard** — reentrancy protection
- **Pausable** — emergency circuit breaker

### Tests
```
65 tests passed, 0 failed (unit + fuzz)
```

---

## Getting Started

```bash
# Frontend
cd frontend && cp .env.example .env.local && pnpm install && pnpm dev

# Contracts
cd contracts && forge build && forge test -vv
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Chain** | Polkadot Hub Testnet (420420417) |
| **Contracts** | Solidity 0.8.26, Foundry, OpenZeppelin, PVM Precompiles |
| **zkTLS** | Primus Network JS SDK |
| **Frontend** | Next.js 16, React 19, wagmi, viem, RainbowKit, Tailwind |

---

## Roadmap

**Current** — 4 zkTLS templates, selective disclosure, soulbound credentials, verified contract

**Next** — More templates (GitHub, LinkedIn, banking APIs), on-chain Primus signature verification, XCM credential relay to parachains

**Future** — Credential marketplace, mobile wallet integration, W3C VC compatibility layer

---

## License

MIT
