"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useReadContract } from "wagmi";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { CredentialCard } from "@/components/credential-card";
import { DOTVERIFY_ABI, DOTVERIFY_ADDRESS } from "@/config/contract";
import { useState } from "react";

function tryDecode(hex: string): string {
  try {
    const bytes = hex.startsWith("0x") ? hex.slice(2) : hex;
    if (!bytes) return "{}";
    const decoded = new TextDecoder().decode(
      new Uint8Array(bytes.match(/.{1,2}/g)!.map((b) => parseInt(b, 16)))
    );
    if (decoded.match(/^[\x20-\x7E\s]+$/)) return decoded;
    return "{}";
  } catch {
    return "{}";
  }
}

function formatDate(ts: bigint): string {
  if (Number(ts) === 0) return "Never";
  return new Date(Number(ts) * 1000).toLocaleString(undefined, {
    year: "numeric", month: "short", day: "numeric",
  });
}

function getStatus(valid: boolean, att: { revoked: boolean; issuedAt: bigint; expiresAt: bigint }): "VALID" | "REVOKED" | "EXPIRED" | "INVALID" {
  if (Number(att.issuedAt) === 0) return "INVALID";
  if (att.revoked) return "REVOKED";
  if (!valid && Number(att.expiresAt) > 0) return "EXPIRED";
  if (valid) return "VALID";
  return "INVALID";
}

export default function VerifyPage() {
  const params = useParams();
  const uid = params.uid as string;
  const [view, setView] = useState<"details" | "card">("details");

  const { data: result, isLoading, isError } = useReadContract({
    address: DOTVERIFY_ADDRESS,
    abi: DOTVERIFY_ABI,
    functionName: "verify",
    args: uid ? [uid as `0x${string}`] : undefined,
    query: { enabled: !!uid && !!DOTVERIFY_ADDRESS },
  });

  // Get schema name
  const schemaUid = (result as unknown as [boolean, { schemaUid: string }])?.[1]?.schemaUid;
  const { data: schemaData } = useReadContract({
    address: DOTVERIFY_ADDRESS,
    abi: DOTVERIFY_ABI,
    functionName: "getSchema",
    args: schemaUid ? [schemaUid as `0x${string}`] : undefined,
    query: { enabled: !!schemaUid && schemaUid !== "0x" + "0".repeat(64) },
  });

  const schema = schemaData as { name: string } | undefined;

  const verification = result as
    | [boolean, { uid: string; schemaUid: string; issuer: string; recipient: string; data: string; dataHash: string; issuedAt: bigint; expiresAt: bigint; revoked: boolean; refUid: string }]
    | undefined;

  const valid = verification?.[0] ?? false;
  const att = verification?.[1];
  const status = att ? getStatus(valid, att) : null;
  const decodedData = att ? tryDecode(att.data) : "{}";
  const verifyUrl = typeof window !== "undefined" ? window.location.href : "";

  const statusColors: Record<string, { bg: string; text: string; border: string }> = {
    VALID: { bg: "bg-green-50", text: "text-green-700", border: "border-green-200" },
    REVOKED: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
    EXPIRED: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
    INVALID: { bg: "bg-gray-50", text: "text-gray-700", border: "border-gray-200" },
  };

  const sc = status ? statusColors[status] : statusColors.INVALID;

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <Navbar />
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-8 sm:py-12">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight mb-1">Credential Verification</h1>
          <code className="text-[10px] font-mono text-muted-foreground break-all">{uid}</code>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="text-center py-16">
            <div className="w-8 h-8 border-2 border-[#E6007A] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Querying on-chain data...</p>
          </div>
        )}

        {!DOTVERIFY_ADDRESS && (
          <div className="text-center py-16">
            <p className="text-sm text-amber-600">Contract not configured.</p>
          </div>
        )}

        {isError && (
          <div className="text-center py-16">
            <p className="text-sm text-red-600">Failed to query contract.</p>
          </div>
        )}

        {/* Result */}
        {!isLoading && att && status && (
          <>
            {/* View toggle */}
            <div className="flex justify-center gap-2 mb-6">
              <button
                onClick={() => setView("details")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  view === "details" ? "border-[#E6007A] bg-[#E6007A]/5 text-[#E6007A]" : "border-border"
                }`}
              >
                Details
              </button>
              <button
                onClick={() => setView("card")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  view === "card" ? "border-[#E6007A] bg-[#E6007A]/5 text-[#E6007A]" : "border-border"
                }`}
              >
                Credential Card
              </button>
            </div>

            {view === "card" ? (
              <CredentialCard
                uid={uid}
                issuer={att.issuer}
                recipient={att.recipient}
                schemaName={schema?.name || "Credential"}
                data={decodedData}
                issuedAt={formatDate(att.issuedAt)}
                expiresAt={formatDate(att.expiresAt)}
                status={status}
                verifyUrl={verifyUrl}
              />
            ) : (
              <div className={`border-2 rounded-2xl overflow-hidden shadow-sm ${sc.border}`}>
                {/* Status banner */}
                <div className={`px-6 py-6 text-center ${sc.bg}`}>
                  <div className="w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ backgroundColor: status === "VALID" ? "#dcfce7" : "#fee2e2" }}>
                    {status === "VALID" ? (
                      <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )}
                  </div>
                  <span className={`text-xl font-bold ${sc.text}`}>{status}</span>
                  <p className="text-xs mt-1 opacity-75">
                    {status === "VALID" && "This credential is active and verified on-chain"}
                    {status === "REVOKED" && "This credential has been revoked by the issuer"}
                    {status === "EXPIRED" && "This credential has expired"}
                    {status === "INVALID" && "No valid attestation found"}
                  </p>
                </div>

                {Number(att.issuedAt) > 0 && (
                  <div className="p-6 space-y-4">
                    {/* Schema */}
                    {schema && (
                      <div>
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold block mb-1">Schema</span>
                        <p className="text-sm font-medium">{schema.name}</p>
                      </div>
                    )}

                    {/* Issuer & Recipient */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold block mb-1">Issuer</span>
                        <p className="font-mono text-xs" title={att.issuer}>{att.issuer}</p>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold block mb-1">Recipient</span>
                        <p className="font-mono text-xs" title={att.recipient}>{att.recipient}</p>
                      </div>
                    </div>

                    {/* Dates */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold block mb-1">Issued</span>
                        <p className="text-sm">{formatDate(att.issuedAt)}</p>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold block mb-1">Expires</span>
                        <p className="text-sm">{formatDate(att.expiresAt)}</p>
                      </div>
                    </div>

                    {/* Data */}
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold block mb-1">Credential Data</span>
                      <pre className="font-mono text-xs bg-muted/30 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap break-all">
                        {decodedData}
                      </pre>
                    </div>

                    {/* Data hash */}
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold block mb-1">Data Integrity (BLAKE2-256)</span>
                      <p className="font-mono text-[10px] text-muted-foreground break-all">{att.dataHash}</p>
                    </div>

                    {/* Actions */}
                    <div className="pt-2 flex flex-col sm:flex-row gap-2">
                      <button
                        onClick={() => navigator.clipboard.writeText(window.location.href)}
                        className="flex-1 px-4 py-2.5 border border-border rounded-lg text-sm font-medium hover:bg-muted/50 transition-colors text-center"
                      >
                        Copy link
                      </button>
                      <button
                        onClick={() => setView("card")}
                        className="flex-1 px-4 py-2.5 border border-border rounded-lg text-sm font-medium hover:bg-muted/50 transition-colors text-center"
                      >
                        Download card
                      </button>
                      <Link
                        href="/app"
                        className="flex-1 px-4 py-2.5 bg-[#E6007A] text-white rounded-lg text-sm font-medium hover:bg-[#c40066] transition-colors text-center"
                      >
                        Open App
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            )}

            <p className="text-center text-[10px] text-muted-foreground mt-6">
              Read directly from DotVerify contract on Polkadot Hub Testnet.
              No wallet connection required.
            </p>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
