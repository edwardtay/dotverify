"use client";

import { useState } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { toHex } from "viem";
import { DOTVERIFY_ABI, DOTVERIFY_ADDRESS } from "@/config/contract";

// zkTLS runs client-side — the JS SDK opens browser popups for user auth
const APP_ID = "0x4f54bf97c50d2967a9ef769b94c858580d0234db";
const APP_SECRET = "0x7f013a5900a0c4725f862acc055aad66d3a9c3e3aee7d651eae7026d1730acdd";

type ZkTlsFlow = "idle" | "config" | "init" | "attesting" | "preview" | "anchoring" | "success" | "error";

const TEMPLATES = [
  {
    id: "164fbfdb-5796-4a01-94f6-597f18b6ee01",
    icon: "\u{1F3E6}",
    label: "Legion Investment",
    desc: "Prove your total invested amount",
    source: "app.legion.cc",
    conditionField: "totalInvested",
    conditionLabel: "total invested amount",
  },
  {
    id: "c25c9f6a-b816-4a67-86ab-7292eff209a3",
    icon: "\u{1F4CA}",
    label: "Binance Trade History",
    desc: "Prove your 30-day spot trading history",
    source: "binance.com",
    conditionField: "tradeCount",
    conditionLabel: "trade count",
  },
  {
    id: "555d729f-074a-4030-a188-469cd5fd8115",
    icon: "\u{1F536}",
    label: "OKX KYC Level",
    desc: "Prove your KYC verification status",
    source: "okx.com",
    conditionField: "kycLevel",
    conditionLabel: "KYC level",
  },
  {
    id: "6793c9e6-8412-4a22-b79e-6dda97930771",
    icon: "\u{1F3B5}",
    label: "TikTok Balance",
    desc: "Prove your coin balance on TikTok",
    source: "tiktok.com",
    conditionField: "coinBalance",
    conditionLabel: "coin balance",
  },
];

const CONDITION_OPS = [">", "<", ">=", "<=", "=="] as const;

export function ZkTlsProve() {
  const { address } = useAccount();
  const [flow, setFlow] = useState<ZkTlsFlow>("idle");
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [attestationResult, setAttestationResult] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  // Privacy mode state
  const [privacyMode, setPrivacyMode] = useState(false);
  const [conditionOp, setConditionOp] = useState<string>(">");
  const [conditionValue, setConditionValue] = useState("");

  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  function handleSelectTemplate(templateId: string) {
    if (!address) return;
    setSelectedTemplate(templateId);
    setPrivacyMode(false);
    setConditionOp(">");
    setConditionValue("");
    setFlow("config");
  }

  async function handleZkTlsAttest() {
    if (!address || !selectedTemplate) return;
    setFlow("init");
    setErrorMsg("");

    try {
      // Dynamic import — runs in browser
      const { PrimusZKTLS } = await import("@primuslabs/zktls-js-sdk");

      const primusZKTLS = new PrimusZKTLS();
      await primusZKTLS.init(APP_ID, APP_SECRET);
      setFlow("attesting");

      // Generate request from template
      const request = primusZKTLS.generateRequestParams(selectedTemplate, address);
      request.setAttMode({ algorithmType: "proxytls" });

      // Apply privacy mode conditions if enabled
      const tmpl = TEMPLATES.find((t) => t.id === selectedTemplate);
      if (privacyMode && conditionValue && tmpl) {
        request.setAttConditions([[{
          field: tmpl.conditionField,
          op: conditionOp,
          value: conditionValue,
        }]]);
      }

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

    const tmpl = TEMPLATES.find((t) => t.id === selectedTemplate);
    const payload = JSON.stringify({
      type: "zktls",
      template: selectedTemplate,
      attestation: JSON.parse(attestationResult),
      prover: address,
      timestamp: Math.floor(Date.now() / 1000),
      ...(privacyMode && conditionValue && tmpl
        ? {
            privacyMode: true,
            condition: {
              field: tmpl.conditionField,
              op: conditionOp,
              value: conditionValue,
            },
          }
        : {}),
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
      const tmpl = TEMPLATES.find((t) => t.id === selectedTemplate);
      const summaryParts = [`zkTLS: ${tmpl?.label || "Verified proof"}`];
      if (privacyMode && conditionValue && tmpl) {
        summaryParts.push(`(${tmpl.conditionField} ${conditionOp} ${conditionValue})`);
      }
      existing.push({
        type: `zktls-${selectedTemplate}`,
        txHash,
        timestamp: Date.now(),
        summary: summaryParts.join(" "),
        templateLabel: tmpl?.label,
        privacyMode: privacyMode && !!conditionValue,
      });
      localStorage.setItem(key, JSON.stringify(existing));
    } catch {}
  }

  const template = TEMPLATES.find((t) => t.id === selectedTemplate);

  return (
    <div className="border border-[#E6007A]/20 bg-[#E6007A]/5 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-sm">{"\u{1F510}"}</span>
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
              onClick={() => handleSelectTemplate(t.id)}
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

      {/* Privacy config step */}
      {flow === "config" && template && (
        <div className="space-y-4">
          <div className="bg-white border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">{template.icon}</span>
              <div>
                <p className="font-medium text-sm">{template.label}</p>
                <p className="text-[10px] text-muted-foreground">{template.source}</p>
              </div>
            </div>

            {/* Privacy mode toggle */}
            <div className="border border-[#E6007A]/15 bg-[#E6007A]/[0.03] rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm">{"\u{1F6E1}\u{FE0F}"}</span>
                  <div>
                    <p className="text-[11px] font-semibold">Privacy Mode</p>
                    <p className="text-[9px] text-muted-foreground">Prove a condition without revealing exact data</p>
                  </div>
                </div>
                <button
                  onClick={() => setPrivacyMode(!privacyMode)}
                  className={`relative w-10 h-5 rounded-full transition-colors ${
                    privacyMode ? "bg-[#E6007A]" : "bg-gray-200"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform shadow-sm ${
                      privacyMode ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {privacyMode && (
                <div className="mt-3 space-y-3">
                  <p className="text-[10px] text-muted-foreground">
                    Prove your {template.conditionLabel} meets a condition without revealing the exact value.
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono text-muted-foreground flex-shrink-0">
                      {template.conditionField}
                    </span>
                    <select
                      value={conditionOp}
                      onChange={(e) => setConditionOp(e.target.value)}
                      className="h-8 px-2 border border-border rounded-lg text-sm font-mono focus:outline-none focus:ring-1 focus:ring-[#E6007A] bg-white"
                    >
                      {CONDITION_OPS.map((op) => (
                        <option key={op} value={op}>{op}</option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={conditionValue}
                      onChange={(e) => setConditionValue(e.target.value)}
                      placeholder="e.g. 10000"
                      className="flex-1 h-8 px-3 border border-border rounded-lg text-sm font-mono focus:outline-none focus:ring-1 focus:ring-[#E6007A]"
                    />
                  </div>
                  {conditionValue && (
                    <div className="bg-white/60 border border-[#E6007A]/10 rounded-lg px-3 py-2">
                      <p className="text-[10px] text-[#E6007A] font-medium">
                        Will prove: {template.conditionField} {conditionOp} {conditionValue}
                      </p>
                      <p className="text-[9px] text-muted-foreground mt-0.5">
                        The verifier sees the condition result but not the actual value.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => { setFlow("idle"); setSelectedTemplate(null); }}
              className="flex-1 px-4 py-2.5 border border-border rounded-lg text-sm font-medium hover:bg-muted/50 transition-colors"
            >
              Back
            </button>
            <button
              onClick={handleZkTlsAttest}
              className="flex-1 px-4 py-2.5 bg-[#E6007A] text-white rounded-lg text-sm font-medium hover:bg-[#c40066] transition-colors"
            >
              Start Attestation
            </button>
          </div>
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
          {privacyMode && conditionValue && template && (
            <p className="text-[10px] text-[#E6007A] mt-2 font-medium">
              Privacy condition: {template.conditionField} {conditionOp} {conditionValue}
            </p>
          )}
        </div>
      )}

      {/* Preview */}
      {flow === "preview" && attestationResult && (
        <div className="space-y-3">
          <div className="bg-white border border-green-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-green-600">{"\u2713"}</span>
              <span className="text-xs font-bold text-green-700">zkTLS Verified</span>
              {privacyMode && conditionValue && (
                <span className="text-[9px] bg-[#E6007A]/10 text-[#E6007A] px-1.5 py-0.5 rounded font-medium">
                  PRIVACY MODE
                </span>
              )}
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
          {privacyMode && conditionValue && template && (
            <p className="text-[10px] text-[#E6007A] mt-1 font-medium">
              Selective disclosure: {template.conditionField} {conditionOp} {conditionValue}
            </p>
          )}
          <button onClick={() => { setFlow("idle"); setAttestationResult(null); setSelectedTemplate(null); setPrivacyMode(false); setConditionValue(""); }} className="mt-2 text-xs text-green-700 underline">Create another</button>
        </div>
      )}

      {!address && flow === "idle" && <p className="text-xs text-amber-600 mt-3">Connect wallet to create zkTLS proofs.</p>}
    </div>
  );
}
