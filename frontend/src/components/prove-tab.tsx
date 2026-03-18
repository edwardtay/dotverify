"use client";

import { useState, useEffect } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { toHex } from "viem";
import { DOTVERIFY_ABI, DOTVERIFY_ADDRESS } from "@/config/contract";
import { ZkTlsProve } from "./zktls-prove";

type StoredProof = {
  type: string;
  txHash: string;
  timestamp: number;
  summary: string;
  templateLabel?: string;
  privacyMode?: boolean;
};

export function ProveTab() {
  const { address } = useAccount();
  const [customData, setCustomData] = useState("");
  const [lastTxHash, setLastTxHash] = useState<string | null>(null);

  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  // Composite proof state
  const [existingProofs, setExistingProofs] = useState<StoredProof[]>([]);
  const [selectedProofIndexes, setSelectedProofIndexes] = useState<Set<number>>(new Set());
  const [compositeLastTx, setCompositeLastTx] = useState<string | null>(null);

  const {
    writeContract: writeComposite,
    data: compositeTxHash,
    isPending: isCompositePending,
  } = useWriteContract();
  const { isLoading: isCompositeConfirming, isSuccess: isCompositeSuccess } = useWaitForTransactionReceipt({
    hash: compositeTxHash,
  });

  // Load existing proofs from localStorage
  useEffect(() => {
    if (!address) return;
    try {
      const stored = JSON.parse(localStorage.getItem(`polkaprove-proofs-${address}`) || "[]") as StoredProof[];
      setExistingProofs(stored);
    } catch {}
  }, [address, txHash, compositeTxHash]);

  function handleAnchorCustom() {
    if (!DOTVERIFY_ADDRESS || !customData) return;
    const payload = JSON.stringify({
      type: "custom",
      data: customData,
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

  // Save custom proof on success
  if (isSuccess && txHash && txHash !== lastTxHash && address) {
    setLastTxHash(txHash);
    try {
      const key = `polkaprove-proofs-${address}`;
      const existing = JSON.parse(localStorage.getItem(key) || "[]");
      existing.push({
        type: "custom",
        txHash,
        timestamp: Date.now(),
        summary: "Custom data anchor",
      });
      localStorage.setItem(key, JSON.stringify(existing));
    } catch {}
  }

  function toggleProofSelection(index: number) {
    setSelectedProofIndexes((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  function handleCompositeAnchor() {
    if (!DOTVERIFY_ADDRESS || !address || selectedProofIndexes.size < 2) return;

    const selectedProofs = Array.from(selectedProofIndexes).map((i) => existingProofs[i]);

    const payload = JSON.stringify({
      type: "composite",
      proofs: selectedProofs.map((p) => ({
        type: p.type,
        txHash: p.txHash,
        summary: p.summary,
        timestamp: p.timestamp,
      })),
      prover: address,
      timestamp: Math.floor(Date.now() / 1000),
      count: selectedProofs.length,
    });

    writeComposite({
      address: DOTVERIFY_ADDRESS,
      abi: DOTVERIFY_ABI,
      functionName: "anchorOffchain",
      args: [toHex(new TextEncoder().encode(payload)) as `0x${string}`],
    });
  }

  // Save composite proof on success
  if (isCompositeSuccess && compositeTxHash && compositeTxHash !== compositeLastTx && address) {
    setCompositeLastTx(compositeTxHash);
    setSelectedProofIndexes(new Set());
    try {
      const key = `polkaprove-proofs-${address}`;
      const existing = JSON.parse(localStorage.getItem(key) || "[]");
      existing.push({
        type: "composite",
        txHash: compositeTxHash,
        timestamp: Date.now(),
        summary: `Composite proof (${selectedProofIndexes.size} combined)`,
      });
      localStorage.setItem(key, JSON.stringify(existing));
    } catch {}
  }

  return (
    <div className="space-y-6">
      {!address && (
        <div className="border border-amber-200 bg-amber-50 rounded-xl p-4 text-center">
          <p className="text-sm text-amber-700">Connect your wallet to create proofs.</p>
        </div>
      )}

      {/* zkTLS — primary */}
      <ZkTlsProve />

      {/* Custom data anchor */}
      <div className="border border-border rounded-xl p-5">
        <h2 className="text-sm font-bold mb-1">Anchor Any Data</h2>
        <p className="text-[10px] text-muted-foreground mb-3">
          Paste any data — bank statements, certificates, documents. Only the BLAKE2 fingerprint is stored on-chain. Your data stays private.
        </p>
        <textarea
          value={customData}
          onChange={(e) => setCustomData(e.target.value)}
          placeholder='{"bank":"Revolut","balance":"$12,500","date":"2026-03-18"}'
          rows={4}
          className="w-full border border-border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-[#E6007A] mb-3"
        />
        <button
          onClick={handleAnchorCustom}
          disabled={!address || !customData || isPending || isConfirming}
          className="w-full px-4 py-2.5 bg-[#E6007A] text-white rounded-lg text-sm font-medium hover:bg-[#c40066] transition-colors disabled:opacity-50"
        >
          {isPending ? "Signing..." : isConfirming ? "Anchoring..." : "Anchor On-Chain"}
        </button>

        {isSuccess && txHash && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-3 mt-3">
            <p className="text-xs font-medium text-green-700">Anchored</p>
            <p className="font-mono text-[10px] text-green-600">Tx: {txHash}</p>
          </div>
        )}
      </div>

      {/* Composite Proof */}
      {address && existingProofs.length > 0 && (
        <div className="border border-[#E6007A]/20 bg-[#E6007A]/[0.03] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm">{"\u{1F517}"}</span>
            <h2 className="font-semibold text-sm">Composite Proof</h2>
            <span className="text-[9px] bg-[#E6007A]/10 text-[#E6007A] px-1.5 py-0.5 rounded font-medium">COMBINE</span>
          </div>
          <p className="text-[10px] text-muted-foreground mb-4">
            Select multiple completed proofs to combine into a single anchor — e.g., KYC verified AND active trader.
          </p>

          {existingProofs.length < 2 ? (
            <div className="bg-white border border-border rounded-xl p-4 text-center">
              <p className="text-[11px] text-muted-foreground">
                Create at least 2 proofs to combine them. You have {existingProofs.length} so far.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {existingProofs.map((proof, idx) => (
                  <label
                    key={`${proof.txHash}-${idx}`}
                    className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-all ${
                      selectedProofIndexes.has(idx)
                        ? "border-[#E6007A] bg-[#E6007A]/5"
                        : "border-border bg-white hover:border-[#E6007A]/30"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedProofIndexes.has(idx)}
                      onChange={() => toggleProofSelection(idx)}
                      className="w-4 h-4 rounded border-border text-[#E6007A] focus:ring-[#E6007A] accent-[#E6007A]"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-medium truncate">{proof.summary}</p>
                      <p className="text-[9px] text-muted-foreground font-mono truncate">
                        {proof.txHash}
                      </p>
                      <p className="text-[9px] text-muted-foreground">
                        {new Date(proof.timestamp).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    {proof.privacyMode && (
                      <span className="text-[8px] bg-[#E6007A]/10 text-[#E6007A] px-1.5 py-0.5 rounded flex-shrink-0">
                        PRIVATE
                      </span>
                    )}
                  </label>
                ))}
              </div>

              {selectedProofIndexes.size >= 2 && (
                <div className="bg-white/60 border border-[#E6007A]/10 rounded-lg px-3 py-2">
                  <p className="text-[10px] text-[#E6007A] font-medium">
                    {selectedProofIndexes.size} proofs selected — will be combined into a single composite anchor
                  </p>
                </div>
              )}

              <button
                onClick={handleCompositeAnchor}
                disabled={selectedProofIndexes.size < 2 || isCompositePending || isCompositeConfirming}
                className="w-full px-4 py-2.5 bg-[#E6007A] text-white rounded-lg text-sm font-medium hover:bg-[#c40066] transition-colors disabled:opacity-50"
              >
                {isCompositePending
                  ? "Signing..."
                  : isCompositeConfirming
                  ? "Anchoring..."
                  : `Combine & Anchor (${selectedProofIndexes.size} proofs)`}
              </button>

              {isCompositeSuccess && compositeTxHash && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                  <p className="text-xs font-medium text-green-700">Composite Proof Anchored!</p>
                  <p className="font-mono text-[10px] text-green-600">Tx: {compositeTxHash}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Multiple proofs combined into one on-chain anchor.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
