# PolkaProve — Prove Web2 Facts on Polkadot Hub

## Hackathon
OpenGuild Polkadot Solidity Hackathon 2026
https://dorahacks.io/hackathon/polkadot-solidity-hackathon/buidl

## What This Is
zkTLS-powered proof anchoring on Polkadot Hub. Verify data from real websites (Binance, OKX, TikTok, Legion) via Primus attestor network, anchor BLAKE2 fingerprints on-chain, mint soulbound credential NFTs.

## Structure
- `frontend/` — Next.js 16 + wagmi + viem + RainbowKit + Primus zkTLS JS SDK
- `contracts/` — Foundry, Solidity 0.8.26, PVM Precompiles, OpenZeppelin

## Quick Start
```bash
cd frontend && pnpm install && pnpm dev
cd contracts && forge build && forge test
```

## Target Chain
Polkadot Hub Testnet, Chain ID: 420420417
RPC: https://eth-rpc-testnet.polkadot.io
Contract: 0x5f7D3BF531C2DcF0d7dd791BA38dEE36Dc9A8C9E
