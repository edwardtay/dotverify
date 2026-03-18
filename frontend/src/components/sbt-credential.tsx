"use client";

import { useState } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from "wagmi";
import { toHex } from "viem";
import { DOTVERIFY_ABI, DOTVERIFY_ADDRESS } from "@/config/contract";

const CREDENTIAL_STYLES: Record<string, { gradient: string; icon: string; label: string }> = {
  kyc: { gradient: "from-emerald-500 to-teal-600", icon: "✓", label: "KYC Verified" },
  trader: { gradient: "from-amber-500 to-orange-600", icon: "📊", label: "Active Trader" },
  investor: { gradient: "from-purple-500 to-indigo-600", icon: "💎", label: "Verified Investor" },
  identity: { gradient: "from-blue-500 to-cyan-600", icon: "👤", label: "Identity Verified" },
  social: { gradient: "from-pink-500 to-rose-600", icon: "🌐", label: "Social Verified" },
  default: { gradient: "from-[#E6007A] to-purple-700", icon: "◈", label: "Credential" },
};

function getStyle(type: string) {
  return CREDENTIAL_STYLES[type] || CREDENTIAL_STYLES.default;
}

type MintStep = "select" | "minting" | "done";

export function SbtCredential() {
  const { address } = useAccount();
  const [selectedProof, setSelectedProof] = useState<{ txHash: string; anchorId?: string; summary: string; type: string } | null>(null);
  const [credentialType, setCredentialType] = useState("kyc");
  const [step, setStep] = useState<MintStep>("select");

  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  // Get existing SBTs
  const { data: holderTokens } = useReadContract({
    address: DOTVERIFY_ADDRESS,
    abi: DOTVERIFY_ABI,
    functionName: "getHolderTokens",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  // Load proofs from localStorage
  const proofs = typeof window !== "undefined" && address
    ? JSON.parse(localStorage.getItem(`polkaprove-proofs-${address}`) || "[]")
    : [];

  function handleMint() {
    if (!selectedProof || !DOTVERIFY_ADDRESS) return;
    // Only mint if we have a real anchorId — txHash is NOT a valid anchorId
    if (!selectedProof.anchorId) return;
    setStep("minting");
    writeContract({
      address: DOTVERIFY_ADDRESS,
      abi: DOTVERIFY_ABI,
      functionName: "mintSBT",
      args: [selectedProof.anchorId as `0x${string}`, credentialType],
    });
  }

  if (isSuccess && step === "minting") {
    setStep("done");
  }

  const tokens = holderTokens as bigint[] | undefined;
  const style = getStyle(credentialType);

  return (
    <div className="space-y-6">
      {/* Existing credentials */}
      {tokens && tokens.length > 0 && (
        <div>
          <h3 className="text-xs font-bold mb-3">Your Credentials</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {tokens.map((tokenId) => (
              <CredentialNFT key={String(tokenId)} tokenId={Number(tokenId)} />
            ))}
          </div>
        </div>
      )}

      {/* Mint new */}
      {proofs.length > 0 && (
        <div className="border border-border rounded-xl p-5">
          <h3 className="text-sm font-bold mb-1">Mint Credential</h3>
          <p className="text-[10px] text-muted-foreground mb-4">
            Turn a verified proof into a soulbound credential token. Non-transferable — permanently linked to your wallet.
          </p>

          {step === "select" && (
            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-medium text-muted-foreground block mb-1">Select a proof to mint</label>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {proofs.filter((p: { anchorId?: string }) => !!p.anchorId).length === 0 && (
                    <p className="text-[10px] text-muted-foreground p-3 border border-dashed border-border rounded-xl">
                      No mintable proofs yet. Create a zkTLS proof first — only proofs with an on-chain anchor ID can be minted.
                    </p>
                  )}
                  {proofs.filter((p: { anchorId?: string }) => !!p.anchorId).map((p: { txHash: string; anchorId?: string; summary: string; type: string }, i: number) => (
                    <label
                      key={i}
                      className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-all ${
                        selectedProof?.anchorId === p.anchorId
                          ? "border-[#E6007A] bg-[#E6007A]/5"
                          : "border-border hover:border-[#E6007A]/30"
                      }`}
                    >
                      <input
                        type="radio"
                        name="proof"
                        checked={selectedProof?.anchorId === p.anchorId}
                        onChange={() => setSelectedProof(p)}
                        className="accent-[#E6007A]"
                      />
                      <span className="text-[11px] truncate">{p.summary}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-medium text-muted-foreground block mb-1">Credential type</label>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(CREDENTIAL_STYLES).filter(([k]) => k !== "default").map(([key, s]) => (
                    <button
                      key={key}
                      onClick={() => setCredentialType(key)}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-medium border transition-colors ${
                        credentialType === key
                          ? "border-[#E6007A] bg-[#E6007A]/5 text-[#E6007A]"
                          : "border-border hover:border-[#E6007A]/30"
                      }`}
                    >
                      {s.icon} {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Preview */}
              {selectedProof && (
                <div className={`bg-gradient-to-br ${style.gradient} rounded-2xl p-5 text-white`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <img src="/logo.png" alt="" className="w-5 h-5 rounded" />
                      <span className="text-xs font-bold opacity-90">PolkaProve</span>
                    </div>
                    <span className="text-[9px] bg-white/20 px-2 py-0.5 rounded-full">SOULBOUND</span>
                  </div>
                  <div className="text-3xl mb-2">{style.icon}</div>
                  <p className="text-lg font-bold mb-1">{style.label}</p>
                  <p className="text-xs opacity-75 mb-4">{selectedProof.summary}</p>
                  <div className="flex justify-between text-[9px] opacity-60">
                    <span>{address?.slice(0, 8)}...{address?.slice(-4)}</span>
                    <span>Polkadot Hub</span>
                  </div>
                </div>
              )}

              <button
                onClick={handleMint}
                disabled={!selectedProof || isPending || isConfirming}
                className="w-full px-4 py-2.5 bg-[#E6007A] text-white rounded-lg text-sm font-medium hover:bg-[#c40066] transition-colors disabled:opacity-50"
              >
                {isPending ? "Signing..." : isConfirming ? "Minting..." : "Mint Soulbound Credential"}
              </button>
            </div>
          )}

          {step === "done" && txHash && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
              <p className="text-sm font-medium text-green-700 mb-1">Credential Minted!</p>
              <a href={`https://blockscout-testnet.polkadot.io/tx/${txHash}`} target="_blank" rel="noopener noreferrer" className="font-mono text-[10px] text-green-600 underline hover:text-green-800 break-all block">Tx: {txHash}</a>
              <p className="text-[10px] text-muted-foreground mt-1">Your soulbound credential is permanently linked to your wallet.</p>
              <button onClick={() => { setStep("select"); setSelectedProof(null); }} className="mt-2 text-xs text-green-700 underline">Mint another</button>
            </div>
          )}
        </div>
      )}

      {proofs.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-4">Create a proof first, then mint it as a credential.</p>
      )}

      {/* Composite Proof */}
      {proofs.length >= 2 && (
        <CompositeProof proofs={proofs} address={address} />
      )}
    </div>
  );
}

function CompositeProof({ proofs, address }: { proofs: { txHash: string; summary: string; type?: string; privacyMode?: boolean }[]; address?: string }) {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [lastTx, setLastTx] = useState<string | null>(null);
  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  function toggle(i: number) {
    setSelected((prev) => { const n = new Set(prev); n.has(i) ? n.delete(i) : n.add(i); return n; });
  }

  function handleCombine() {
    if (!DOTVERIFY_ADDRESS || !address || selected.size < 2) return;
    const payload = JSON.stringify({
      type: "composite",
      proofs: Array.from(selected).map((i) => ({ type: proofs[i].type, txHash: proofs[i].txHash, summary: proofs[i].summary })),
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

  if (isSuccess && txHash && txHash !== lastTx && address) {
    setLastTx(txHash);
    setSelected(new Set());
    try {
      const key = `polkaprove-proofs-${address}`;
      const existing = JSON.parse(localStorage.getItem(key) || "[]");
      existing.push({ type: "composite", txHash, timestamp: Date.now(), summary: `Composite (${selected.size} combined)` });
      localStorage.setItem(key, JSON.stringify(existing));
    } catch {}
  }

  return (
    <div className="border border-[#E6007A]/20 bg-[#E6007A]/[0.03] rounded-xl p-5">
      <h3 className="text-sm font-bold mb-1">Composite Credential</h3>
      <p className="text-[10px] text-muted-foreground mb-3">Combine multiple proofs into one credential — e.g., "KYC verified AND active trader."</p>

      <div className="space-y-2 max-h-40 overflow-y-auto mb-3">
        {proofs.map((p: { txHash: string; summary: string; type?: string; privacyMode?: boolean }, i: number) => (
          <label key={i} className={`flex items-center gap-3 p-2.5 border rounded-lg cursor-pointer transition-all ${selected.has(i) ? "border-[#E6007A] bg-[#E6007A]/5" : "border-border hover:border-[#E6007A]/30"}`}>
            <input type="checkbox" checked={selected.has(i)} onChange={() => toggle(i)} className="w-3.5 h-3.5 accent-[#E6007A]" />
            <span className="text-[10px] truncate flex-1">{p.summary}</span>
            {p.privacyMode && <span className="text-[8px] bg-[#E6007A]/10 text-[#E6007A] px-1 py-0.5 rounded">PRIVATE</span>}
          </label>
        ))}
      </div>

      <button
        onClick={handleCombine}
        disabled={selected.size < 2 || isPending || isConfirming}
        className="w-full px-4 py-2 bg-[#E6007A] text-white rounded-lg text-xs font-medium hover:bg-[#c40066] transition-colors disabled:opacity-50"
      >
        {isPending ? "Signing..." : isConfirming ? "Anchoring..." : `Combine ${selected.size} Proofs`}
      </button>

      {isSuccess && txHash && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 mt-3">
          <p className="text-xs font-medium text-green-700">Composite Credential Anchored!</p>
          <a href={`https://blockscout-testnet.polkadot.io/tx/${txHash}`} target="_blank" rel="noopener noreferrer" className="font-mono text-[10px] text-green-600 underline break-all block">Tx: {txHash}</a>
        </div>
      )}
    </div>
  );
}

function CredentialNFT({ tokenId }: { tokenId: number }) {
  // In a full implementation, we'd read the SBT data from the contract
  // For now, show a styled card
  return (
    <div className="bg-gradient-to-br from-[#E6007A] to-purple-700 rounded-2xl p-4 text-white">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[9px] bg-white/20 px-2 py-0.5 rounded-full">#{tokenId}</span>
        <span className="text-[9px] bg-white/20 px-2 py-0.5 rounded-full">SOULBOUND</span>
      </div>
      <div className="text-2xl mb-1">◈</div>
      <p className="text-sm font-bold">Credential #{tokenId}</p>
      <p className="text-[10px] opacity-75 mt-1">Polkadot Hub Testnet</p>
    </div>
  );
}
