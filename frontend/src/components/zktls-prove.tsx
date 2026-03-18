"use client";

import { useState } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { toHex } from "viem";
import { DOTVERIFY_ABI, DOTVERIFY_ADDRESS } from "@/config/contract";

// zkTLS attestation runs server-side via /api/zktls

type ZkTlsFlow = "idle" | "attesting" | "preview" | "anchoring" | "success" | "error";

const PROOF_TEMPLATES = [
  {
    id: "x-profile",
    icon: "𝕏",
    label: "X (Twitter) Profile",
    desc: "Prove your username and follower count",
    request: {
      url: "https://api.x.com/2/users/me?user.fields=public_metrics",
      method: "GET",
      header: { Authorization: "Bearer {{USER_TOKEN}}" },
    },
    responseResolves: [
      { keyName: "username", parsePath: "$.data.username" },
      { keyName: "followers", parsePath: "$.data.public_metrics.followers_count" },
    ],
  },
  {
    id: "binance-kyc",
    icon: "🔶",
    label: "Binance KYC",
    desc: "Prove your KYC verification level",
    request: {
      url: "https://www.binance.com/bapi/accounts/v1/private/account/user/base-detail",
      method: "GET",
      header: {},
    },
    responseResolves: [
      { keyName: "kycLevel", parsePath: "$.data.kycLevel" },
    ],
  },
  {
    id: "spotify",
    icon: "🎵",
    label: "Spotify Account",
    desc: "Prove your Spotify account ownership",
    request: {
      url: "https://api.spotify.com/v1/me",
      method: "GET",
      header: { Authorization: "Bearer {{USER_TOKEN}}" },
    },
    responseResolves: [
      { keyName: "display_name", parsePath: "$.display_name" },
      { keyName: "id", parsePath: "$.id" },
    ],
  },
  {
    id: "github",
    icon: "🐙",
    label: "GitHub Profile",
    desc: "Prove your repos, followers, account age",
    request: {
      url: "https://api.github.com/user",
      method: "GET",
      header: { Authorization: "Bearer {{USER_TOKEN}}" },
    },
    responseResolves: [
      { keyName: "login", parsePath: "$.login" },
      { keyName: "public_repos", parsePath: "$.public_repos" },
      { keyName: "followers", parsePath: "$.followers" },
      { keyName: "created_at", parsePath: "$.created_at" },
    ],
  },
];

export function ZkTlsProve() {
  const { address } = useAccount();
  const [flow, setFlow] = useState<ZkTlsFlow>("idle");
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [attestationResult, setAttestationResult] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  async function handleZkTlsAttest(templateId: string) {
    if (!address) return;
    setSelectedTemplate(templateId);
    setFlow("attesting");
    setErrorMsg("");

    try {
      const template = PROOF_TEMPLATES.find((t) => t.id === templateId);
      if (!template) throw new Error("Template not found");

      const res = await fetch("/api/zktls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId,
          userAddress: address,
          request: template.request,
          responseResolves: template.responseResolves,
        }),
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setAttestationResult(JSON.stringify(data.attestation, null, 2));
      setFlow("preview");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(msg);
      setFlow("error");
    }
  }

  function handleAnchor() {
    if (!attestationResult || !DOTVERIFY_ADDRESS) return;
    setFlow("anchoring");

    const payload = JSON.stringify({
      type: "zktls",
      template: selectedTemplate,
      attestation: attestationResult,
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

  if (isSuccess && flow === "anchoring") {
    setFlow("success");
    // Save to localStorage
    try {
      const key = `polkaprove-proofs-${address}`;
      const existing = JSON.parse(localStorage.getItem(key) || "[]");
      existing.push({
        type: `zktls-${selectedTemplate}`,
        txHash,
        timestamp: Date.now(),
        summary: `zkTLS: ${PROOF_TEMPLATES.find((t) => t.id === selectedTemplate)?.label}`,
      });
      localStorage.setItem(key, JSON.stringify(existing));
    } catch {}
  }

  const template = PROOF_TEMPLATES.find((t) => t.id === selectedTemplate);

  return (
    <div className="border border-[#E6007A]/20 bg-[#E6007A]/5 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-sm">🔐</span>
        <h2 className="font-semibold text-sm">zkTLS Verified Proofs</h2>
        <span className="text-[9px] bg-[#E6007A] text-white px-1.5 py-0.5 rounded">LIVE</span>
      </div>
      <p className="text-[10px] text-muted-foreground mb-4">
        Prove data from real websites. A zkTLS attestor cryptographically verifies the data came from the source — no way to fake it.
      </p>

      {/* Template picker */}
      {flow === "idle" && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {PROOF_TEMPLATES.map((t) => (
            <button
              key={t.id}
              onClick={() => handleZkTlsAttest(t.id)}
              disabled={!address}
              className="border border-border bg-white rounded-xl p-3 text-center hover:border-[#E6007A]/40 hover:shadow-sm transition-all disabled:opacity-40"
            >
              <span className="text-lg block mb-1">{t.icon}</span>
              <span className="text-[10px] font-medium block">{t.label}</span>
              <span className="text-[9px] text-muted-foreground">{t.desc}</span>
            </button>
          ))}
        </div>
      )}

      {/* Attesting */}
      {flow === "attesting" && (
        <div className="bg-white rounded-xl p-6 text-center">
          <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-[#E6007A] border-t-transparent mb-3" />
          <p className="text-sm font-medium mb-1">Running zkTLS attestation...</p>
          <p className="text-[10px] text-muted-foreground">
            The Primus attestor is verifying data from {template?.label}. You may be prompted to authorize access.
          </p>
        </div>
      )}

      {/* Preview */}
      {flow === "preview" && attestationResult && (
        <div className="space-y-3">
          <div className="bg-white border border-green-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-green-600">✓</span>
              <span className="text-xs font-bold text-green-700">zkTLS Attestation Verified</span>
              <span className="text-[9px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded">CRYPTOGRAPHIC PROOF</span>
            </div>
            <pre className="text-[9px] font-mono bg-green-50 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap max-h-40 overflow-y-auto">
              {attestationResult}
            </pre>
          </div>

          <p className="text-[10px] text-muted-foreground">
            This proof is cryptographically signed by a Primus attestor. Anchor it on Polkadot Hub to make it permanently verifiable.
          </p>

          <button
            onClick={handleAnchor}
            disabled={isPending || isConfirming}
            className="w-full px-4 py-2.5 bg-[#E6007A] text-white rounded-lg text-sm font-medium hover:bg-[#c40066] transition-colors disabled:opacity-50"
          >
            {isPending ? "Signing..." : isConfirming ? "Anchoring..." : "Anchor on Polkadot Hub"}
          </button>

          <button
            onClick={() => { setFlow("idle"); setAttestationResult(null); }}
            className="w-full text-xs text-muted-foreground hover:text-foreground"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Error */}
      {flow === "error" && (
        <div className="bg-white border border-amber-200 rounded-xl p-4">
          <p className="text-xs font-medium text-amber-700 mb-1">zkTLS attestation requires access</p>
          <p className="text-[10px] text-amber-600 mb-2">{errorMsg}</p>
          <p className="text-[10px] text-muted-foreground mb-3">
            The zkTLS flow requires you to authenticate with the data source (e.g., log into X).
            The Primus attestor verifies the TLS session without seeing your credentials.
          </p>
          <button
            onClick={() => setFlow("idle")}
            className="text-xs text-[#E6007A] hover:underline"
          >
            Try another proof type
          </button>
        </div>
      )}

      {/* Success */}
      {flow === "success" && txHash && (
        <div className="bg-white border border-green-200 rounded-xl p-4">
          <p className="text-sm font-medium text-green-700 mb-1">zkTLS Proof Anchored!</p>
          <p className="text-[10px] text-green-600 mb-1">{template?.label} — verified by Primus attestor</p>
          <p className="font-mono text-[10px] text-green-600">Tx: {txHash}</p>
          <p className="text-[10px] text-muted-foreground mt-2">
            The zkTLS attestation is now permanently anchored on Polkadot Hub with BLAKE2-256 hashing.
          </p>
          <button
            onClick={() => { setFlow("idle"); setAttestationResult(null); setSelectedTemplate(null); }}
            className="mt-2 text-xs text-green-700 underline"
          >
            Create another proof
          </button>
        </div>
      )}

      {!address && flow === "idle" && (
        <p className="text-xs text-amber-600 mt-3">Connect wallet to create zkTLS proofs.</p>
      )}
    </div>
  );
}
