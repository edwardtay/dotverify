"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useReadContract } from "wagmi";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { DOTVERIFY_ABI, DOTVERIFY_ADDRESS } from "@/config/contract";
import { useState } from "react";

function shorten(addr: string) {
  if (!addr || addr.length < 12) return addr;
  return addr.slice(0, 6) + "..." + addr.slice(-4);
}

function tryDecode(hex: string): string {
  try {
    const bytes = hex.startsWith("0x") ? hex.slice(2) : hex;
    if (!bytes) return "(empty)";
    const decoded = new TextDecoder().decode(
      new Uint8Array(bytes.match(/.{1,2}/g)!.map((b) => parseInt(b, 16)))
    );
    if (decoded.match(/^[\x20-\x7E\s]+$/)) {
      // Try to parse as JSON for pretty printing
      try {
        const parsed = JSON.parse(decoded);
        return JSON.stringify(parsed, null, 2);
      } catch {
        return decoded;
      }
    }
    return hex.slice(0, 40) + "...";
  } catch {
    return hex.slice(0, 40) + "...";
  }
}

function formatDate(ts: bigint): string {
  if (Number(ts) === 0) return "Never";
  return new Date(Number(ts) * 1000).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const ZERO_BYTES32 = "0x0000000000000000000000000000000000000000000000000000000000000000";

function getStatus(valid: boolean, att: { revoked: boolean; issuedAt: bigint; expiresAt: bigint }) {
  if (Number(att.issuedAt) === 0) return "NOT FOUND";
  if (att.revoked) return "REVOKED";
  if (!valid && Number(att.expiresAt) > 0) return "EXPIRED";
  if (valid) return "VALID";
  return "INVALID";
}

function StatusIcon({ status }: { status: string }) {
  if (status === "VALID") {
    return (
      <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
        <svg className="w-10 h-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
    );
  }
  return (
    <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
      <svg className="w-10 h-10 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </div>
  );
}

function statusColor(status: string) {
  switch (status) {
    case "VALID": return "text-green-700 bg-green-50 border-green-200";
    case "REVOKED": return "text-red-700 bg-red-50 border-red-200";
    case "EXPIRED": return "text-amber-700 bg-amber-50 border-amber-200";
    default: return "text-gray-700 bg-gray-50 border-gray-200";
  }
}

export default function VerifyPage() {
  const params = useParams();
  const uid = params.uid as string;
  const [copied, setCopied] = useState(false);

  const { data: result, isLoading, isError } = useReadContract({
    address: DOTVERIFY_ADDRESS,
    abi: DOTVERIFY_ABI,
    functionName: "verify",
    args: uid ? [uid as `0x${string}`] : undefined,
    query: { enabled: !!uid && !!DOTVERIFY_ADDRESS },
  });

  const verification = result as
    | [boolean, { uid: string; schemaUid: string; issuer: string; recipient: string; data: string; issuedAt: bigint; expiresAt: bigint; revoked: boolean; refUid: string }]
    | undefined;

  const valid = verification?.[0] ?? false;
  const att = verification?.[1];
  const status = att ? getStatus(valid, att) : null;

  function copyLink() {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <Navbar />
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-12">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold tracking-tight mb-1">Credential Verification</h1>
          <p className="text-muted-foreground text-xs">
            Public attestation verification on Polkadot Hub
          </p>
        </div>

        {/* UID Display */}
        <div className="text-center mb-8">
          <span className="text-[10px] text-muted-foreground block mb-1">Attestation UID</span>
          <code className="text-xs font-mono bg-muted/30 px-3 py-1.5 rounded-lg inline-block max-w-full overflow-hidden text-ellipsis">
            {uid}
          </code>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-16">
            <div className="w-8 h-8 border-2 border-[#E6007A] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Querying on-chain data...</p>
          </div>
        )}

        {/* Error / Not Configured */}
        {!DOTVERIFY_ADDRESS && (
          <div className="text-center py-16">
            <p className="text-sm text-amber-600">Contract not configured. Set NEXT_PUBLIC_DOTVERIFY_ADDRESS.</p>
          </div>
        )}

        {isError && (
          <div className="text-center py-16">
            <p className="text-sm text-red-600">Failed to query contract. The UID may be invalid.</p>
          </div>
        )}

        {/* Verification Card */}
        {!isLoading && att && status && (
          <div className="border border-border rounded-2xl shadow-lg overflow-hidden">
            {/* Status Header */}
            <div className={`px-6 py-8 text-center border-b ${statusColor(status)}`}>
              <StatusIcon status={status} />
              <span className="text-2xl font-bold tracking-tight block">{status}</span>
              <span className="text-xs mt-1 block opacity-75">
                {status === "VALID" && "This credential is active and verified on-chain"}
                {status === "REVOKED" && "This credential has been revoked by the issuer"}
                {status === "EXPIRED" && "This credential has passed its expiration date"}
                {status === "NOT FOUND" && "No attestation found with this UID"}
                {status === "INVALID" && "This credential failed verification"}
              </span>
            </div>

            {/* Details */}
            {Number(att.issuedAt) > 0 && (
              <div className="p-6 space-y-5">
                {/* Issuer & Recipient */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold block mb-1">
                      Issuer
                    </span>
                    <p className="font-mono text-sm" title={att.issuer}>
                      {shorten(att.issuer)}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold block mb-1">
                      Recipient
                    </span>
                    <p className="font-mono text-sm" title={att.recipient}>
                      {shorten(att.recipient)}
                    </p>
                  </div>
                </div>

                {/* Schema */}
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold block mb-1">
                    Schema UID
                  </span>
                  <Link
                    href={`/app`}
                    className="font-mono text-xs text-[#E6007A] hover:underline break-all"
                  >
                    {att.schemaUid}
                  </Link>
                </div>

                {/* Dates */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold block mb-1">
                      Issued
                    </span>
                    <p className="text-sm">{formatDate(att.issuedAt)}</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold block mb-1">
                      Expires
                    </span>
                    <p className="text-sm">{formatDate(att.expiresAt)}</p>
                  </div>
                </div>

                {/* Ref UID */}
                {att.refUid && att.refUid !== ZERO_BYTES32 && (
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold block mb-1">
                      Reference UID
                    </span>
                    <Link
                      href={`/verify/${att.refUid}`}
                      className="font-mono text-xs text-[#E6007A] hover:underline break-all"
                    >
                      {att.refUid}
                    </Link>
                  </div>
                )}

                {/* Data */}
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold block mb-1">
                    Data
                  </span>
                  <pre className="font-mono text-xs bg-muted/30 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap break-all">
                    {tryDecode(att.data)}
                  </pre>
                </div>

                {/* Actions */}
                <div className="pt-2 flex flex-col sm:flex-row gap-2">
                  <button
                    onClick={copyLink}
                    className="flex-1 px-4 py-2.5 border border-border rounded-lg text-sm font-medium hover:bg-muted/50 transition-colors text-center"
                  >
                    {copied ? "Copied!" : "Copy verification link"}
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

        {/* Footer note */}
        <p className="text-center text-[10px] text-muted-foreground mt-8">
          Verification data is read directly from the DotVerify contract on Polkadot Hub.
        </p>
      </main>
      <Footer />
    </div>
  );
}
