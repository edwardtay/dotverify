# PolkaProve — On-chain Attestation & Credential Verification for Polkadot Hub

## Hackathon
OpenGuild Polkadot Hackathon — PVM Track (EVM on Polkadot)
https://dorahacks.io/hackathon/polkadot-solidity-hackathon/buidl

## What This Is
EAS (Ethereum Attestation Service) for Polkadot — a general-purpose attestation protocol with PVM-native precompile integration. Register schemas, issue verifiable credentials, verify attestations, and query cross-chain via XCM.

## Key Features
- **Schema registry**: Define attestation schemas with field:type definitions
- **Issue attestations**: Create on-chain credentials with BLAKE2-256 integrity hashing
- **Verify credentials**: Check any attestation by UID — valid, expired, or revoked
- **sr25519 issuer auth**: Substrate wallets can issue attestations natively
- **XCM cross-chain**: Send attestation status to any Polkadot parachain
- **AI assistant**: Analyze documents, suggest schemas, verify credentials via chat
- **Dual wallet**: EVM (MetaMask/RainbowKit) + Polkadot (SubWallet/Talisman) simultaneously

## Structure
- `frontend/` — Next.js 16 + wagmi + viem + RainbowKit + @polkadot/extension-dapp
- `contracts/` — Foundry, Solidity 0.8.26, EVM Cancun, PVM Precompiles

## Quick Start
```bash
cd frontend && pnpm install
cp .env.example .env.local  # add API keys
pnpm dev
```

## Contract Workflow
```bash
cd contracts
~/.foundry/bin/forge build
~/.foundry/bin/forge test
~/.foundry/bin/forge script script/Deploy.s.sol --rpc-url $RPC_URL --broadcast
```

## Target Chain
Polkadot Hub Testnet, Chain ID: 420420417, Native: PAS
RPC: https://eth-rpc-testnet.polkadot.io
Explorer: https://blockscout-testnet.polkadot.io

## API Keys (in .env.local)
- OPENROUTER_API_KEY — primary AI provider
- GROQ_API_KEY — fallback AI provider
- CEREBRAS_API_KEY — second fallback
- NEXT_PUBLIC_WC_PROJECT_ID — WalletConnect
- NEXT_PUBLIC_DOTVERIFY_ADDRESS — deployed contract address
