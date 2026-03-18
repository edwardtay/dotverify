"use client";

import { useState } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { toHex } from "viem";
import { DOTVERIFY_ABI, DOTVERIFY_ADDRESS } from "@/config/contract";

// zkTLS runs client-side — the JS SDK opens browser popups for user auth
const APP_ID = "0x4f54bf97c50d2967a9ef769b94c858580d0234db";
const APP_SECRET = "0x7f013a5900a0c4725f862acc055aad66d3a9c3e3aee7d651eae7026d1730acdd";

type ZkTlsFlow = "idle" | "init" | "attesting" | "preview" | "anchoring" | "success" | "error";

const TEMPLATES = [
  {
    id: "164fbfdb-5796-4a01-94f6-597f18b6ee01",
    icon: "🏦",
    label: "Legion Investment",
    desc: "Prove your total invested amount on Legion",
    source: "app.legion.cc",
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
    setFlow("init");
    setErrorMsg("");

    try {
      // Dynamic import — runs in browser
      const { PrimusZKTLS } = await import("@primuslabs/zktls-js-sdk");

      const primusZKTLS = new PrimusZKTLS();
      await primusZKTLS.init(APP_ID, APP_SECRET);
      setFlow("attesting");

      // Generate request from template
      const request = primusZKTLS.generateRequestParams(templateId, address);
      request.setAttMode({ algorithmType: "proxytls" });

      // Sign the request
      const requestStr = request.toJsonString();
      const signedRequestStr = await primusZKTLS.sign(requestStr);

      // Start attestation — this opens a browser flow for user to auth with the data source
      const attestation = await primusZKTLS.startAttestation(signedRequestStr);

      // Verify the attestation signature
      const verified = await primusZKTLS.verifyAttestation(attestation);

      if (!verified) {
        throw new Error("Attestation signature verification failed");
      }

      setAttestationResult(JSON.stringify(attestation, null, 2));
      setFlow("preview");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
      setFlow("error");
    }
  }

  function handleAnchor() {
    if (!attestationResult || !DOTVERIFY_ADDRESS) return;
    setFlow("anchoring");

    const payload = JSON.stringify({
      type: "zktls",
      template: selectedTemplate,
      attestation: JSON.parse(attestationResult),
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
    try {
      const key = `polkaprove-proofs-${address}`;
      const existing = JSON.parse(localStorage.getItem(key) || "[]");
      const template = TEMPLATES.find((t) => t.id === selectedTemplate);
      existing.push({
        type: `zktls-${selectedTemplate}`,
        txHash,
        timestamp: Date.now(),
        summary: `zkTLS: ${template?.label || "Verified proof"}`,
      });
      localStorage.setItem(key, JSON.stringify(existing));
    } catch {}
  }

  const template = TEMPLATES.find((t) => t.id === selectedTemplate);

  return (
    <div className="border border-[#E6007A]/20 bg-[#E6007A]/5 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-sm">🔐</span>
        <h2 className="font-semibold text-sm">zkTLS Verified Proofs</h2>
        <span className="text-[9px] bg-[#E6007A] text-white px-1.5 py-0.5 rounded">LIVE</span>
      </div>
      <p className="text-[10px] text-muted-foreground mb-4">
        Cryptographically prove data from real websites. A Primus attestor verifies the TLS session — no way to fake it.
      </p>

      {/* Template picker */}
      {flow === "idle" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {TEMPLATES.map((t) => (
            <button
              key={t.id}
              onClick={() => handleZkTlsAttest(t.id)}
              disabled={!address}
              className="border border-border bg-white rounded-xl p-4 text-left hover:border-[#E6007A]/40 hover:shadow-sm transition-all disabled:opacity-40"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">{t.icon}</span>
                <span className="font-medium text-xs">{t.label}</span>
              </div>
              <p className="text-[10px] text-muted-foreground">{t.desc}</p>
              <p className="text-[9px] font-mono text-muted-foreground mt-1">{t.source}</p>
            </button>
          ))}
        </div>
      )}

      {/* Initializing */}
      {flow === "init" && (
        <div className="bg-white rounded-xl p-6 text-center">
          <div className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-[#E6007A] border-t-transparent mb-2" />
          <p className="text-sm text-muted-foreground">Initializing zkTLS...</p>
        </div>
      )}

      {/* Attesting */}
      {flow === "attesting" && (
        <div className="bg-white rounded-xl p-6 text-center">
          <div className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-[#E6007A] border-t-transparent mb-2" />
          <p className="text-sm font-medium mb-1">zkTLS attestation in progress...</p>
          <p className="text-[10px] text-muted-foreground">
            You may be prompted to authenticate with {template?.source}. The Primus attestor verifies the TLS session.
          </p>
        </div>
      )}

      {/* Preview */}
      {flow === "preview" && attestationResult && (
        <div className="space-y-3">
          <div className="bg-white border border-green-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-green-600">✓</span>
              <span className="text-xs font-bold text-green-700">zkTLS Verified</span>
            </div>
            <pre className="text-[9px] font-mono bg-green-50 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap max-h-40 overflow-y-auto">
              {attestationResult}
            </pre>
          </div>
          <button
            onClick={handleAnchor}
            disabled={isPending || isConfirming}
            className="w-full px-4 py-2.5 bg-[#E6007A] text-white rounded-lg text-sm font-medium hover:bg-[#c40066] transition-colors disabled:opacity-50"
          >
            {isPending ? "Signing..." : isConfirming ? "Anchoring..." : "Anchor on Polkadot Hub"}
          </button>
          <button onClick={() => { setFlow("idle"); setAttestationResult(null); }} className="w-full text-xs text-muted-foreground hover:text-foreground">Cancel</button>
        </div>
      )}

      {/* Error */}
      {flow === "error" && (
        <div className="bg-white border border-amber-200 rounded-xl p-4">
          <p className="text-xs font-medium text-amber-700 mb-1">zkTLS attestation needs authentication</p>
          <p className="text-[10px] text-amber-600 mb-2">{errorMsg}</p>
          <button onClick={() => setFlow("idle")} className="text-xs text-[#E6007A] hover:underline">Try again</button>
        </div>
      )}

      {/* Success */}
      {flow === "success" && txHash && (
        <div className="bg-white border border-green-200 rounded-xl p-4">
          <p className="text-sm font-medium text-green-700 mb-1">zkTLS Proof Anchored!</p>
          <p className="font-mono text-[10px] text-green-600">Tx: {txHash}</p>
          <p className="text-[10px] text-muted-foreground mt-1">Verified by Primus attestor, anchored with BLAKE2-256 on Polkadot Hub.</p>
          <button onClick={() => { setFlow("idle"); setAttestationResult(null); setSelectedTemplate(null); }} className="mt-2 text-xs text-green-700 underline">Create another</button>
        </div>
      )}

      {!address && flow === "idle" && <p className="text-xs text-amber-600 mt-3">Connect wallet to create zkTLS proofs.</p>}
    </div>
  );
}
