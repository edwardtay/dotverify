"use client";

import { useState } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { toHex } from "viem";
import { DOTVERIFY_ABI, DOTVERIFY_ADDRESS } from "@/config/contract";

type ProofType = "web2" | "balance" | "fullState";

const WEB2_TEMPLATES = [
  { id: "bank", icon: "🏦", label: "Bank Balance", placeholder: '{"bank":"Revolut","balance":"$12,500","currency":"USD","date":"2026-03-18"}' },
  { id: "degree", icon: "🎓", label: "Academic Credential", placeholder: '{"name":"Alice","university":"MIT","degree":"Computer Science","year":2024}' },
  { id: "employment", icon: "💼", label: "Employment", placeholder: '{"name":"Alice","company":"Acme Corp","role":"Engineer","since":"2023-01"}' },
  { id: "social", icon: "👤", label: "Social Account", placeholder: '{"platform":"Twitter","handle":"@alice","followers":5000,"verified":true}' },
  { id: "kyc", icon: "✓", label: "KYC Status", placeholder: '{"provider":"Jumio","status":"verified","country":"SG","date":"2026-01-15"}' },
  { id: "custom", icon: "📄", label: "Custom", placeholder: "Paste any data..." },
];

export function ProveTab() {
  const { address } = useAccount();
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [proofData, setProofData] = useState("");
  const [proofType, setProofType] = useState<ProofType>("web2");
  const [lastTxHash, setLastTxHash] = useState<string | null>(null);

  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  function handleAnchorWeb2() {
    if (!DOTVERIFY_ADDRESS || !proofData) return;
    setProofType("web2");
    const payload = JSON.stringify({
      type: selectedTemplate || "custom",
      data: proofData,
      prover: address,
      timestamp: Math.floor(Date.now() / 1000),
    });
    writeContract({
      address: DOTVERIFY_ADDRESS,
      abi: DOTVERIFY_ABI,
      functionName: "anchorOffchain",
      args: [toHex(new TextEncoder().encode(payload)) as `0x${string}`],
    });
  }

  function handleProveBalance() {
    if (!DOTVERIFY_ADDRESS) return;
    setProofType("balance");
    writeContract({ address: DOTVERIFY_ADDRESS, abi: DOTVERIFY_ABI, functionName: "proveBalance" });
  }

  function handleProveFullState() {
    if (!DOTVERIFY_ADDRESS) return;
    setProofType("fullState");
    writeContract({ address: DOTVERIFY_ADDRESS, abi: DOTVERIFY_ABI, functionName: "proveFullState" });
  }

  // Save on success
  if (isSuccess && txHash && txHash !== lastTxHash) {
    setLastTxHash(txHash);
    try {
      const existing = JSON.parse(localStorage.getItem(`polkaprove-proofs-${address}`) || "[]");
      existing.push({
        type: proofType === "web2" ? (selectedTemplate || "custom") : proofType,
        txHash,
        timestamp: Date.now(),
        summary: proofType === "web2"
          ? `Web2 proof: ${selectedTemplate || "custom"}`
          : proofType === "balance" ? "On-chain balance proof" : "Full PVM state proof",
      });
      localStorage.setItem(`polkaprove-proofs-${address}`, JSON.stringify(existing));
    } catch {}
  }

  const template = WEB2_TEMPLATES.find((t) => t.id === selectedTemplate);

  return (
    <div className="space-y-6">
      {!address && (
        <div className="border border-amber-200 bg-amber-50 rounded-xl p-4 text-center">
          <p className="text-sm text-amber-700">Connect your wallet to create proofs.</p>
        </div>
      )}

      {/* Web2 Proofs — PRIMARY */}
      <div>
        <h2 className="text-sm font-bold mb-1">Prove Web2 Data</h2>
        <p className="text-[10px] text-muted-foreground mb-4">
          Anchor a tamper-proof fingerprint of real-world data on Polkadot Hub. Only the BLAKE2 hash is stored — your data stays private.
        </p>

        {/* Template picker */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-4">
          {WEB2_TEMPLATES.map((t) => (
            <button
              key={t.id}
              onClick={() => {
                setSelectedTemplate(t.id);
                setProofData(t.id === "custom" ? "" : t.placeholder);
              }}
              className={`border rounded-xl p-3 text-center transition-all ${
                selectedTemplate === t.id
                  ? "border-[#E6007A] bg-[#E6007A]/5"
                  : "border-border hover:border-[#E6007A]/30"
              }`}
            >
              <span className="text-lg block mb-1">{t.icon}</span>
              <span className="text-[10px] font-medium">{t.label}</span>
            </button>
          ))}
        </div>

        {/* Data input */}
        {selectedTemplate && (
          <div className="space-y-3">
            <textarea
              value={proofData}
              onChange={(e) => setProofData(e.target.value)}
              placeholder={template?.placeholder || "Paste data..."}
              rows={4}
              className="w-full border border-border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-[#E6007A]"
            />

            <button
              onClick={handleAnchorWeb2}
              disabled={!address || !proofData || isPending || isConfirming}
              className="w-full px-4 py-2.5 bg-[#E6007A] text-white rounded-lg text-sm font-medium hover:bg-[#c40066] transition-colors disabled:opacity-50"
            >
              {isPending && proofType === "web2" ? "Signing..." : isConfirming && proofType === "web2" ? "Anchoring..." : "Anchor Proof On-Chain"}
            </button>

            <p className="text-[9px] text-muted-foreground text-center">
              With zkTLS integration (roadmap): data will be cryptographically verified from the source website before anchoring
            </p>
          </div>
        )}
      </div>

      {/* Success */}
      {isSuccess && txHash && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <p className="text-sm font-medium text-green-700 mb-1">Proof anchored</p>
          <p className="font-mono text-[10px] text-green-600">Tx: {txHash}</p>
          <p className="text-[10px] text-green-600 mt-1">
            BLAKE2-256 fingerprint stored on Polkadot Hub. Check My Proofs to share.
          </p>
        </div>
      )}

      {/* On-Chain Proofs — SECONDARY */}
      <div className="border-t border-border pt-6">
        <h2 className="text-sm font-bold mb-1">On-Chain Proofs (Trustless)</h2>
        <p className="text-[10px] text-muted-foreground mb-3">
          The contract reads your on-chain state directly — no user input, fully verifiable.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            onClick={handleProveBalance}
            disabled={!address || isPending || isConfirming}
            className="text-left border border-border rounded-xl p-4 hover:border-[#E6007A]/30 transition-all disabled:opacity-50"
          >
            <span className="font-medium text-xs">💰 Balance Proof</span>
            <p className="text-[10px] text-muted-foreground mt-1">Contract reads msg.sender.balance + Substrate AccountId</p>
          </button>
          <button
            onClick={handleProveFullState}
            disabled={!address || isPending || isConfirming}
            className="text-left border border-border rounded-xl p-4 hover:border-[#E6007A]/30 transition-all disabled:opacity-50"
          >
            <span className="font-medium text-xs">⬡ Full PVM State</span>
            <p className="text-[10px] text-muted-foreground mt-1">Balance + existential deposit + weight + code hash</p>
          </button>
        </div>
      </div>
    </div>
  );
}
