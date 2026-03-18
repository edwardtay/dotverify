"use client";

import { useState, useEffect } from "react";
import { useAccount } from "wagmi";

type ProofRecord = {
  anchorId: string;
  type: string;
  summary: string;
  timestamp: number;
  txHash: string;
  data: string;
};

const TYPE_META: Record<string, { icon: string; label: string }> = {
  portfolio: { icon: "\u{1F4B0}", label: "Portfolio Balance" },
  staking: { icon: "\u{1F512}", label: "Staking Position" },
  governance: { icon: "\u{1F5F3}", label: "Governance Activity" },
  identity: { icon: "\u{1F464}", label: "On-Chain Identity" },
  custom: { icon: "\u{270D}\u{FE0F}", label: "Custom Proof" },
};

export function MyProofsTab() {
  const { address } = useAccount();
  const [proofs, setProofs] = useState<ProofRecord[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (!address) return;
    const stored = JSON.parse(localStorage.getItem(`polkaprove-proofs-${address}`) || "[]") as ProofRecord[];
    setProofs(stored);
  }, [address]);

  function handleShare(proof: ProofRecord) {
    const url = `https://blockscout-testnet.polkadot.io/tx/${proof.txHash}`;
    navigator.clipboard.writeText(url);
    setCopiedId(proof.txHash);
    setTimeout(() => setCopiedId(null), 2000);
  }

  function handleClearAll() {
    if (!address) return;
    if (confirm("Clear all saved proofs? This only removes local records — on-chain data is permanent.")) {
      localStorage.removeItem(`polkaprove-proofs-${address}`);
      setProofs([]);
    }
  }

  if (!address) {
    return (
      <div className="text-center py-16">
        <p className="text-sm text-muted-foreground">Connect your wallet to view your proofs.</p>
      </div>
    );
  }

  if (proofs.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-2xl mb-3">{"\u25CE"}</p>
        <p className="text-sm font-medium mb-1">No proofs yet</p>
        <p className="text-[11px] text-muted-foreground">
          Create your first proof in the Prove tab. Your proofs will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-sm">Your Proofs</h2>
          <p className="text-[10px] text-muted-foreground">
            {proofs.length} proof{proofs.length !== 1 ? "s" : ""} anchored on-chain
          </p>
        </div>
        <button
          onClick={handleClearAll}
          className="text-[10px] text-muted-foreground hover:text-red-600 transition-colors"
        >
          Clear local history
        </button>
      </div>

      <div className="space-y-3">
        {proofs.map((proof) => {
          const meta = TYPE_META[proof.type] || TYPE_META.custom;
          return (
            <div
              key={proof.txHash}
              className="border border-border rounded-xl p-4 hover:border-[#E6007A]/30 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <span className="text-xl flex-shrink-0 mt-0.5">{meta.icon}</span>
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium text-muted-foreground">{meta.label}</p>
                    <p className="text-sm font-medium mt-0.5 truncate">{proof.summary}</p>
                    <p className="text-[10px] text-muted-foreground mt-1 font-mono truncate" title={proof.txHash}>
                      Tx: {proof.txHash}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {new Date(proof.timestamp).toLocaleString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleShare(proof)}
                    className="px-2.5 py-1.5 border border-border rounded-lg text-[11px] font-medium hover:bg-muted/50 transition-colors"
                  >
                    {copiedId === proof.txHash ? "Copied!" : "Share"}
                  </button>
                  <a
                    href={`https://blockscout-testnet.polkadot.io/tx/${proof.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-1.5 border border-border rounded-lg text-[11px] font-medium hover:bg-muted/50 transition-colors"
                  >
                    Explorer
                  </a>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
