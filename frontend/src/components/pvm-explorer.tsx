"use client";

import { useReadContract } from "wagmi";
import { DOTVERIFY_ABI, DOTVERIFY_ADDRESS } from "@/config/contract";

const PVM_FEATURES = [
  {
    name: "BLAKE2-256 Attestation Hashing",
    desc: "All attestation UIDs and schema UIDs are generated using Polkadot-native BLAKE2-256, not keccak256. This ensures attestations are compatible with Substrate's native hashing.",
    precompile: "ISystem (0x900)",
    function: "hashBlake256(bytes)",
  },
  {
    name: "sr25519 Issuer Authentication",
    desc: "Substrate wallet users (Polkadot.js, Talisman, SubWallet) authorize attestations using their native sr25519 signatures, verified on-chain by PVM. An EVM wallet relays the transaction.",
    precompile: "ISystem (0x900)",
    function: "sr25519Verify(sig, msg, pubKey)",
  },
  {
    name: "XCM Cross-Chain Queries",
    desc: "Attestation status can be sent to any Polkadot parachain via XCM. Verify credentials cross-chain without bridges.",
    precompile: "IXcm (0xA0000)",
    function: "send(dest, msg)",
  },
  {
    name: "ecdsaToEthAddress Identity",
    desc: "Convert ECDSA public keys to Ethereum addresses for cross-ecosystem issuer identity resolution.",
    precompile: "ISystem (0x900)",
    function: "ecdsaToEthAddress(pubKey)",
  },
  {
    name: "callerIsOrigin Protection",
    desc: "attestSecure() blocks proxy/relay attacks by verifying the caller is the original transaction signer.",
    precompile: "ISystem (0x900)",
    function: "callerIsOrigin()",
  },
  {
    name: "2D Weight Metering",
    desc: "PVM tracks both computation time (refTime) and storage proof size (proofSize) independently — not single gas.",
    precompile: "ISystem (0x900)",
    function: "weightLeft()",
  },
];

export function PvmExplorer() {
  const { data: weight } = useReadContract({
    address: DOTVERIFY_ADDRESS,
    abi: DOTVERIFY_ABI,
    functionName: "getRemainingWeight",
    query: { enabled: !!DOTVERIFY_ADDRESS },
  });

  const { data: minBalance } = useReadContract({
    address: DOTVERIFY_ADDRESS,
    abi: DOTVERIFY_ABI,
    functionName: "getMinimumBalance",
    query: { enabled: !!DOTVERIFY_ADDRESS },
  });

  const { data: codeHash } = useReadContract({
    address: DOTVERIFY_ADDRESS,
    abi: DOTVERIFY_ABI,
    functionName: "getCodeHash",
    query: { enabled: !!DOTVERIFY_ADDRESS },
  });

  const { data: attestationCount } = useReadContract({
    address: DOTVERIFY_ADDRESS,
    abi: DOTVERIFY_ABI,
    functionName: "attestationCount",
    query: { enabled: !!DOTVERIFY_ADDRESS },
  });

  const { data: schemaCount } = useReadContract({
    address: DOTVERIFY_ADDRESS,
    abi: DOTVERIFY_ABI,
    functionName: "getSchemaCount",
    query: { enabled: !!DOTVERIFY_ADDRESS },
  });

  const w = weight as [bigint, bigint] | undefined;

  return (
    <div className="space-y-6">
      {/* Live Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Schemas", value: schemaCount !== undefined ? String(Number(schemaCount)) : "..." },
          { label: "Attestations", value: attestationCount !== undefined ? String(Number(attestationCount)) : "..." },
          { label: "Ref Time", value: w ? `${Number(w[0]).toLocaleString()}` : "..." },
          { label: "Proof Size", value: w ? `${Number(w[1]).toLocaleString()}` : "..." },
        ].map((s) => (
          <div key={s.label} className="border border-border rounded-lg p-3 text-center">
            <p className="text-[10px] text-muted-foreground">{s.label}</p>
            <p className="font-bold text-lg font-mono">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Contract Info */}
      <div className="border border-border rounded-lg p-4">
        <h2 className="font-semibold text-sm mb-3">Contract Info</h2>
        <div className="space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Contract</span>
            <span className="font-mono text-[10px]">{DOTVERIFY_ADDRESS || "Not deployed"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Chain</span>
            <span>Polkadot Hub Testnet (420420417)</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Existential Deposit</span>
            <span className="font-mono">{minBalance ? `${Number(minBalance) / 1e18} PAS` : "..."}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Code Hash</span>
            <span className="font-mono text-[10px]">{codeHash ? String(codeHash).slice(0, 18) + "..." : "..."}</span>
          </div>
        </div>
      </div>

      {/* PVM Feature Breakdown */}
      <div className="border border-border rounded-lg p-4">
        <h2 className="font-semibold text-sm mb-3">PVM Precompile Features (Not Possible on Standard EVM)</h2>
        <div className="space-y-3">
          {PVM_FEATURES.map((f) => (
            <div key={f.name} className="border border-border rounded-lg p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-xs">{f.name}</span>
                <span className="text-[10px] font-mono bg-muted/50 px-1.5 py-0.5 rounded">{f.precompile}</span>
              </div>
              <p className="text-[11px] text-muted-foreground mb-1">{f.desc}</p>
              <p className="text-[10px] font-mono text-[#E6007A]">{f.function}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
