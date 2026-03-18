"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useReadContract } from "wagmi";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { DOTVERIFY_ABI, DOTVERIFY_ADDRESS } from "@/config/contract";

function isBytes32(uid: string): boolean {
  return uid.startsWith("0x") && uid.length === 66;
}

export default function VerifyPage() {
  const params = useParams();
  const uid = params.uid as string;

  const isTxHash = uid.startsWith("0x") && uid.length === 66;
  const blockscoutUrl = `https://blockscout-testnet.polkadot.io/tx/${uid}`;

  // Try to check anchor on-chain if it looks like a bytes32 uid
  const { data: anchorResult, isLoading: isChecking } = useReadContract(
    isBytes32(uid)
      ? {
          address: DOTVERIFY_ADDRESS,
          abi: DOTVERIFY_ABI,
          functionName: "verifyOffchain",
          args: [uid as `0x${string}`, "0x" as `0x${string}`],
        }
      : undefined
  );

  const anchorValid = anchorResult ? (anchorResult as [boolean, boolean])[0] : null;

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <Navbar />
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-8 sm:py-12">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-full bg-[#E6007A] flex items-center justify-center">
              <span className="text-white text-sm font-bold">P</span>
            </div>
            <span className="text-lg font-bold tracking-tight">PolkaProve</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight mb-1">Proof Verification</h1>
          <p className="text-[11px] text-muted-foreground">
            Independently verify on-chain proof anchored on Polkadot Hub
          </p>
        </div>

        {/* Proof details card */}
        <div className="border border-border rounded-xl p-5 sm:p-6 space-y-5">
          {/* Anchor status badge */}
          {isBytes32(uid) && (
            <div className="flex justify-center">
              {isChecking ? (
                <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-full">
                  <div className="h-3 w-3 animate-spin rounded-full border-2 border-[#E6007A] border-t-transparent" />
                  <span className="text-[11px] font-medium text-muted-foreground">Checking on-chain anchor...</span>
                </div>
              ) : anchorValid === true ? (
                <div className="flex items-center gap-2 px-5 py-2.5 bg-green-50 border border-green-200 rounded-full">
                  <span className="w-3 h-3 rounded-full bg-green-500 flex items-center justify-center">
                    <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                  <span className="text-[11px] font-bold text-green-700 uppercase tracking-wide">
                    Anchored on Polkadot Hub
                  </span>
                </div>
              ) : anchorValid === false ? (
                <div className="flex items-center gap-2 px-5 py-2.5 bg-red-50 border border-red-200 rounded-full">
                  <span className="w-3 h-3 rounded-full bg-red-500" />
                  <span className="text-[11px] font-bold text-red-700 uppercase tracking-wide">
                    Anchor Not Found
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-5 py-2.5 bg-amber-50 border border-amber-200 rounded-full">
                  <span className="w-3 h-3 rounded-full bg-amber-500" />
                  <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wide">
                    Unable to Verify
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Proof info rows */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
              <span className="text-[11px] font-medium text-muted-foreground w-24 flex-shrink-0">Proof ID</span>
              <code className="text-[10px] font-mono text-foreground break-all bg-muted/30 px-2 py-1 rounded">
                {uid}
              </code>
            </div>

            {isTxHash && (
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                <span className="text-[11px] font-medium text-muted-foreground w-24 flex-shrink-0">Type</span>
                <span className="text-[11px]">Transaction Hash (bytes32)</span>
              </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
              <span className="text-[11px] font-medium text-muted-foreground w-24 flex-shrink-0">Network</span>
              <span className="text-[11px]">Polkadot Hub Testnet (Chain ID: 420420417)</span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
              <span className="text-[11px] font-medium text-muted-foreground w-24 flex-shrink-0">Integrity</span>
              <span className="text-[11px]">BLAKE2-256 hash anchored on-chain</span>
            </div>
          </div>

          {/* Blockscout button */}
          <div className="pt-2">
            <a
              href={blockscoutUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full px-6 py-3 bg-[#E6007A] text-white rounded-xl text-sm font-medium hover:bg-[#c40066] transition-colors"
            >
              View on Blockscout
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>

          <p className="text-[10px] text-center text-muted-foreground">
            The BLAKE2-256 hash of the proof data is permanently stored on Polkadot Hub Testnet. Anyone can verify it.
          </p>
        </div>

        {/* CTA */}
        <div className="mt-8 text-center">
          <Link
            href="/app"
            className="inline-flex items-center gap-2 px-6 py-2.5 border border-[#E6007A] text-[#E6007A] rounded-xl text-sm font-medium hover:bg-[#E6007A]/5 transition-colors"
          >
            Create Your Own Proof
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
          <p className="text-[10px] text-muted-foreground mt-2">
            Anchor verifiable proofs on Polkadot Hub with zkTLS
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
