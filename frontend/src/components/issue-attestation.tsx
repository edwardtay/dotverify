"use client";

import { useState } from "react";
import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { toHex } from "viem";
import { DOTVERIFY_ABI, DOTVERIFY_ADDRESS } from "@/config/contract";
import { SchemaSelector } from "./schema-selector";

type IssueMode = "standard" | "secure" | "delegated";

export function IssueAttestation({ address }: { address?: `0x${string}` }) {
  const [schemaUid, setSchemaUid] = useState("");
  const [recipient, setRecipient] = useState("");
  const [dataFields, setDataFields] = useState<Record<string, string>>({});
  const [expiresAt, setExpiresAt] = useState("");
  const [mode, setMode] = useState<IssueMode>("standard");
  const [delegateFor, setDelegateFor] = useState("");

  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  const { data: selectedSchema } = useReadContract({
    address: DOTVERIFY_ADDRESS,
    abi: DOTVERIFY_ABI,
    functionName: "getSchema",
    args: schemaUid ? [schemaUid as `0x${string}`] : undefined,
    query: { enabled: !!schemaUid },
  });

  const schema = selectedSchema as { name: string; definition: string; revocable: boolean; resolver: string } | undefined;

  const fields = schema?.definition
    ? schema.definition.split(",").map((f) => {
        const [name, type] = f.split(":");
        return { name: name.trim(), type: type?.trim() || "string" };
      })
    : [];

  function handleIssue() {
    if (!schemaUid || !recipient || !DOTVERIFY_ADDRESS) return;

    const dataStr = JSON.stringify(dataFields);
    const data = toHex(new TextEncoder().encode(dataStr));

    const expiry = expiresAt
      ? BigInt(Math.floor(new Date(expiresAt).getTime() / 1000))
      : BigInt(0);

    const zeroRef = "0x0000000000000000000000000000000000000000000000000000000000000000" as `0x${string}`;

    if (mode === "secure") {
      writeContract({
        address: DOTVERIFY_ADDRESS,
        abi: DOTVERIFY_ABI,
        functionName: "attestSecure",
        args: [schemaUid as `0x${string}`, recipient as `0x${string}`, data, expiry, zeroRef],
      });
    } else if (mode === "delegated" && delegateFor) {
      writeContract({
        address: DOTVERIFY_ADDRESS,
        abi: DOTVERIFY_ABI,
        functionName: "attestDelegated",
        args: [delegateFor as `0x${string}`, schemaUid as `0x${string}`, recipient as `0x${string}`, data, expiry, zeroRef],
      });
    } else {
      writeContract({
        address: DOTVERIFY_ADDRESS,
        abi: DOTVERIFY_ABI,
        functionName: "attest",
        args: [schemaUid as `0x${string}`, recipient as `0x${string}`, data, expiry, zeroRef],
      });
    }
  }

  return (
    <div className="space-y-6">
      {/* Issuance Mode */}
      <div className="border border-border rounded-lg p-4">
        <h2 className="font-semibold text-sm mb-3">Issuance Mode</h2>
        <div className="flex gap-1 flex-wrap">
          {([
            { id: "standard" as IssueMode, label: "Standard", desc: "Issue a credential directly" },
            { id: "secure" as IssueMode, label: "Secure", desc: "Extra protection against impersonation" },
            { id: "delegated" as IssueMode, label: "On Behalf Of", desc: "Issue for another organization" },
          ]).map((m) => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={`px-3 py-2 rounded-lg text-xs border transition-colors ${
                mode === m.id
                  ? "border-[#E6007A] bg-[#E6007A]/5 text-[#E6007A]"
                  : "border-border hover:bg-muted/30"
              }`}
            >
              <span className="font-medium">{m.label}</span>
              <span className="block text-[10px] text-muted-foreground mt-0.5">{m.desc}</span>
            </button>
          ))}
        </div>
        {mode === "secure" && (
          <p className="text-[10px] text-[#E6007A] mt-2">
            Secure mode verifies you are directly signing the transaction, preventing anyone from issuing credentials on your behalf without permission.
          </p>
        )}
        {mode === "delegated" && (
          <div className="mt-2">
            <label className="text-[11px] font-medium text-muted-foreground block mb-1">Issuer address (you must be their delegate)</label>
            <input
              type="text"
              value={delegateFor}
              onChange={(e) => setDelegateFor(e.target.value)}
              placeholder="0x... (the issuer who authorized you)"
              className="w-full border border-border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-[#E6007A]"
            />
          </div>
        )}
      </div>

      {/* Attestation Form */}
      <div className="border border-border rounded-lg p-4">
        <h2 className="font-semibold text-sm mb-3">Issue Attestation</h2>

        {!address && (
          <p className="text-xs text-amber-600 mb-3">Connect your wallet to issue attestations.</p>
        )}

        <div className="space-y-4">
          {/* Schema selector */}
          <SchemaSelector
            value={schemaUid}
            onChange={(uid) => {
              setSchemaUid(uid);
              setDataFields({});
            }}
          />

          {/* Recipient */}
          <div>
            <label className="text-[11px] font-medium text-muted-foreground block mb-1">Who is this credential for?</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="Wallet address (0x...)"
                className="flex-1 border border-border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-[#E6007A]"
              />
              {address && (
                <button
                  onClick={() => setRecipient(address)}
                  className={`px-3 py-2 border rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                    recipient === address ? "border-[#E6007A] bg-[#E6007A]/5 text-[#E6007A]" : "border-border hover:bg-muted/30"
                  }`}
                >
                  Myself
                </button>
              )}
            </div>
          </div>

          {/* Dynamic fields based on schema */}
          {fields.length > 0 && (
            <div>
              <label className="text-[11px] font-medium text-muted-foreground block mb-1">Attestation Data</label>
              <div className="space-y-2">
                {fields.map((f) => (
                  <div key={f.name}>
                    <label className="text-[10px] text-muted-foreground">{f.name} ({f.type})</label>
                    <input
                      type={f.type === "uint256" ? "number" : f.type === "bool" ? "text" : "text"}
                      value={dataFields[f.name] || ""}
                      onChange={(e) => setDataFields({ ...dataFields, [f.name]: e.target.value })}
                      placeholder={f.type === "bool" ? "true / false" : f.name}
                      className="w-full border border-border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#E6007A]"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Expiration */}
          <div>
            <label className="text-[11px] font-medium text-muted-foreground block mb-1">
              Expiration (optional)
            </label>
            <input
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#E6007A]"
            />
          </div>

          <button
            onClick={handleIssue}
            disabled={isPending || isConfirming || !address || !schemaUid || !recipient || !DOTVERIFY_ADDRESS}
            className="px-4 py-2 bg-[#E6007A] text-white rounded-lg text-sm font-medium hover:bg-[#c40066] transition-colors disabled:opacity-50"
          >
            {isPending ? "Signing..." : isConfirming ? "Confirming..." : `Issue ${mode === "secure" ? "(Secure) " : mode === "delegated" ? "(Delegated) " : ""}Attestation`}
          </button>

          {isSuccess && txHash && (
            <div className="text-xs text-green-600 border border-green-200 bg-green-50 rounded-lg p-4">
              <p className="font-semibold text-sm mb-2">Credential Issued</p>
              <p className="font-mono text-[10px]">Tx: {txHash}</p>
              <p className="text-[10px] mt-1 text-green-700">
                {mode === "secure" && "Issued with secure mode — direct signer verification."}
                {mode === "delegated" && `Issued on behalf of ${delegateFor?.slice(0, 8)}...`}
                {mode === "standard" && "Credential issued and stored on-chain."}
              </p>
              <p className="text-[10px] mt-2 text-muted-foreground">
                The recipient can share their credential via the verification link.
                Check the Browse tab to find and share the credential.
              </p>
            </div>
          )}

          {!DOTVERIFY_ADDRESS && (
            <p className="text-xs text-amber-600">Contract not configured.</p>
          )}
        </div>
      </div>

      {/* PVM Info */}
      <div className="border border-border rounded-lg p-3 bg-muted/10">
        <p className="text-[10px] text-muted-foreground">
          Credentials are stored permanently on Polkadot Hub with tamper-proof integrity hashing.
          {mode === "secure" && " Secure mode adds extra identity verification."}
          {" "}Credentials can be verified across chains.
        </p>
      </div>
    </div>
  );
}
