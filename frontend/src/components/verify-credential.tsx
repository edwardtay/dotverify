"use client";

import { useState } from "react";
import { useReadContract } from "wagmi";
import { DOTVERIFY_ABI, DOTVERIFY_ADDRESS } from "@/config/contract";

export function VerifyCredential() {
  const [uid, setUid] = useState("");
  const [queried, setQueried] = useState(false);

  const { data: result, isLoading } = useReadContract({
    address: DOTVERIFY_ADDRESS,
    abi: DOTVERIFY_ABI,
    functionName: "verify",
    args: uid ? [uid as `0x${string}`] : undefined,
    query: { enabled: queried && !!uid },
  });

  const verification = result as [boolean, { uid: string; schemaUid: string; issuer: string; recipient: string; data: string; issuedAt: bigint; expiresAt: bigint; revoked: boolean; refUid: string }] | undefined;

  const valid = verification?.[0];
  const att = verification?.[1];

  function tryDecode(hex: string): string {
    try {
      const bytes = hex.startsWith("0x") ? hex.slice(2) : hex;
      const decoded = new TextDecoder().decode(
        new Uint8Array(bytes.match(/.{1,2}/g)!.map((b) => parseInt(b, 16)))
      );
      // Check if it's valid JSON or printable text
      if (decoded.match(/^[\x20-\x7E\s]+$/)) return decoded;
      return hex.slice(0, 40) + "...";
    } catch {
      return hex.slice(0, 40) + "...";
    }
  }

  return (
    <div className="space-y-6">
      <div className="border border-border rounded-lg p-4">
        <h2 className="font-semibold text-sm mb-3">Verify Credential</h2>
        <div className="space-y-3">
          <div>
            <label className="text-[11px] font-medium text-muted-foreground block mb-1">
              Credential ID
            </label>
            <input
              type="text"
              value={uid}
              onChange={(e) => { setUid(e.target.value); setQueried(false); }}
              placeholder="0x..."
              className="w-full border border-border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-[#E6007A]"
            />
          </div>
          <button
            onClick={() => setQueried(true)}
            disabled={!uid || isLoading || !DOTVERIFY_ADDRESS}
            className="px-4 py-2 bg-[#E6007A] text-white rounded-lg text-sm font-medium hover:bg-[#c40066] transition-colors disabled:opacity-50"
          >
            {isLoading ? "Verifying..." : "Verify"}
          </button>
          {!DOTVERIFY_ADDRESS && (
            <p className="text-xs text-amber-600">Contract not configured.</p>
          )}
        </div>
      </div>

      {/* Verification Result */}
      {queried && att && (
        <div className={`border rounded-lg p-4 ${
          valid ? "border-green-300 bg-green-50" : "border-red-300 bg-red-50"
        }`}>
          <div className="flex items-center gap-2 mb-3">
            <span className={`text-lg ${valid ? "text-green-600" : "text-red-600"}`}>
              {valid ? "✓" : "✗"}
            </span>
            <span className={`font-bold text-sm ${valid ? "text-green-700" : "text-red-700"}`}>
              {valid ? "VALID" : att.revoked ? "REVOKED" : Number(att.issuedAt) === 0 ? "NOT FOUND" : "EXPIRED"}
            </span>
          </div>

          {Number(att.issuedAt) > 0 && (
            <div className="space-y-2 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-muted-foreground">Issuer</span>
                  <p className="font-mono text-[10px]">{att.issuer}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Recipient</span>
                  <p className="font-mono text-[10px]">{att.recipient}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-muted-foreground">Issued</span>
                  <p>{new Date(Number(att.issuedAt) * 1000).toLocaleString()}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Expires</span>
                  <p>{Number(att.expiresAt) === 0 ? "Never" : new Date(Number(att.expiresAt) * 1000).toLocaleString()}</p>
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">Schema UID</span>
                <p className="font-mono text-[10px]">{att.schemaUid}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Data</span>
                <p className="font-mono text-[10px] bg-white/50 rounded p-2 mt-0.5">
                  {tryDecode(att.data)}
                </p>
              </div>
              <div className="flex gap-2 mt-1">
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${att.revoked ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
                  {att.revoked ? "Revoked" : "Active"}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
