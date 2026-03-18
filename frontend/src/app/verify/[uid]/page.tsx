"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useReadContract } from "wagmi";
import { toHex } from "viem";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { DOTVERIFY_ABI, DOTVERIFY_ADDRESS } from "@/config/contract";

function isBytes32(uid: string): boolean {
  return uid.startsWith("0x") && uid.length === 66;
}

export default function VerifyPage() {
  const params = useParams();
  const uid = params.uid as string;
  const [verifyData, setVerifyData] = useState("");
  const [checking, setChecking] = useState(false);

  // Check anchor existence
  const { data: existsResult, isLoading: isChecking } = useReadContract(
    isBytes32(uid)
      ? {
          address: DOTVERIFY_ADDRESS,
          abi: DOTVERIFY_ABI,
          functionName: "verifyOffchain",
          args: [uid as `0x${string}`, "0x" as `0x${string}`],
        }
      : undefined
  );

  // Full data verification
  const { data: fullResult } = useReadContract(
    isBytes32(uid) && checking && verifyData
      ? {
          address: DOTVERIFY_ADDRESS,
          abi: DOTVERIFY_ABI,
          functionName: "verifyOffchain",
          args: [uid as `0x${string}`, toHex(new TextEncoder().encode(verifyData)) as `0x${string}`],
        }
      : undefined
  );

  const anchorExists = existsResult ? (existsResult as [boolean, boolean])[0] : null;
  const dataVerified = fullResult ? (fullResult as [boolean, boolean]) : null;

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <Navbar />
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-8 sm:py-12">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <img src="/logo.png" alt="" className="w-7 h-7 rounded" />
            <span className="text-lg font-bold tracking-tight">PolkaProve</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight mb-1">Verify Proof</h1>
        </div>

        <div className="border border-border rounded-xl p-5 sm:p-6 space-y-5">
          {/* Anchor status */}
          {isBytes32(uid) && (
            <div className="flex justify-center">
              {isChecking ? (
                <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-full">
                  <div className="h-3 w-3 animate-spin rounded-full border-2 border-[#E6007A] border-t-transparent" />
                  <span className="text-[11px] text-muted-foreground">Checking...</span>
                </div>
              ) : anchorExists ? (
                <div className="flex items-center gap-2 px-5 py-2.5 bg-green-50 border border-green-200 rounded-full">
                  <span className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="text-[11px] font-bold text-green-700 uppercase tracking-wide">Anchor Exists</span>
                </div>
              ) : anchorExists === false ? (
                <div className="flex items-center gap-2 px-5 py-2.5 bg-red-50 border border-red-200 rounded-full">
                  <span className="w-3 h-3 rounded-full bg-red-500" />
                  <span className="text-[11px] font-bold text-red-700 uppercase tracking-wide">Not Found</span>
                </div>
              ) : null}
            </div>
          )}

          {/* Anchor ID */}
          <div>
            <span className="text-[11px] font-medium text-muted-foreground">Anchor ID</span>
            <code className="text-[10px] font-mono break-all block mt-1 bg-muted/30 px-2 py-1 rounded">{uid}</code>
          </div>

          {/* Data verification — the real check */}
          {anchorExists && (
            <div className="border-t border-border pt-4">
              <h3 className="text-xs font-bold mb-1">Verify Original Data</h3>
              <p className="text-[10px] text-muted-foreground mb-3">
                Paste the original proof data to check it matches the on-chain BLAKE2 hash.
              </p>
              <textarea
                value={verifyData}
                onChange={(e) => { setVerifyData(e.target.value); setChecking(false); }}
                placeholder="Paste the original proof data..."
                rows={3}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-[#E6007A] mb-3"
              />
              <button
                onClick={() => setChecking(true)}
                disabled={!verifyData}
                className="w-full px-4 py-2.5 bg-[#E6007A] text-white rounded-lg text-sm font-medium hover:bg-[#c40066] transition-colors disabled:opacity-50"
              >
                Verify Data
              </button>

              {checking && dataVerified && (
                <div className={`mt-3 rounded-xl p-4 ${
                  dataVerified[0] && dataVerified[1]
                    ? "bg-green-50 border border-green-200"
                    : "bg-red-50 border border-red-200"
                }`}>
                  <div className="flex items-center gap-2">
                    <span className={dataVerified[0] && dataVerified[1] ? "text-green-600 text-lg" : "text-red-600 text-lg"}>
                      {dataVerified[0] && dataVerified[1] ? "✓" : "✗"}
                    </span>
                    <span className={`text-sm font-bold ${dataVerified[0] && dataVerified[1] ? "text-green-700" : "text-red-700"}`}>
                      {dataVerified[0] && dataVerified[1] ? "Data matches — proof is authentic" : "Data does NOT match"}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Blockscout link */}
          <a
            href={`https://blockscout-testnet.polkadot.io/tx/${uid}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full px-4 py-2.5 border border-border rounded-xl text-sm hover:bg-muted/30 transition-colors"
          >
            View on Blockscout →
          </a>
        </div>

        <div className="mt-6 text-center">
          <Link href="/app" className="text-xs text-[#E6007A] hover:underline">Create your own proof →</Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
