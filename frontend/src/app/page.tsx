"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { siteConfig } from "@/config/site";
import { Footer } from "@/components/footer";

export default function LandingPage() {
  const router = useRouter();
  const [verifyUid, setVerifyUid] = useState("");

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <header className="border-b border-border bg-white sticky top-0 z-50">
        <div className="flex items-center justify-between px-4 py-2.5 max-w-5xl mx-auto w-full">
          <div className="flex items-center gap-1.5 text-sm font-bold tracking-tight">
            <img src="/logo.png" alt="" className="w-5 h-5 rounded" />
            {siteConfig.name}
          </div>
          <Link
            href="/app"
            className="text-xs font-medium px-3 py-1.5 rounded-lg bg-[#E6007A] text-white hover:bg-[#c40066] transition-colors"
          >
            Launch App
          </Link>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="px-4 pt-16 sm:pt-24 pb-10 max-w-3xl mx-auto text-center">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight leading-tight mb-3">
            Verifiable Credentials.{" "}
            <span className="text-[#E6007A]">On-Chain.</span>
          </h1>
          <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
            Issue, verify, and share tamper-proof credentials on Polkadot.
          </p>

          <div className="max-w-lg mx-auto flex gap-2">
            <input
              type="text"
              value={verifyUid}
              onChange={(e) => setVerifyUid(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && verifyUid && router.push(`/verify/${verifyUid}`)}
              placeholder="Paste a credential ID to verify..."
              className="flex-1 border border-border rounded-lg px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#E6007A]/30 focus:border-[#E6007A]"
            />
            <button
              onClick={() => verifyUid && router.push(`/verify/${verifyUid}`)}
              disabled={!verifyUid}
              className="px-4 py-2.5 bg-[#E6007A] text-white rounded-lg text-sm font-medium hover:bg-[#c40066] transition-colors disabled:opacity-40"
            >
              Verify
            </button>
          </div>
          <p className="text-[10px] text-muted-foreground mt-2">No wallet needed to verify</p>
        </section>

        {/* Single CTA */}
        <section className="px-4 pb-16 max-w-5xl mx-auto text-center">
          <Link
            href="/app"
            className="inline-block px-8 py-3 bg-[#E6007A] text-white rounded-xl text-sm font-medium hover:bg-[#c40066] transition-colors shadow-sm"
          >
            Open App →
          </Link>
        </section>

        {/* What you can do */}
        <section className="px-4 pb-12 max-w-5xl mx-auto">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { icon: "🎓", label: "Diplomas" },
              { icon: "🏛", label: "DAO Membership" },
              { icon: "🚀", label: "Certifications" },
              { icon: "✓", label: "KYC" },
            ].map((uc) => (
              <div key={uc.label} className="border border-border rounded-lg p-3 text-center">
                <span className="text-lg block mb-1">{uc.icon}</span>
                <span className="text-[11px] font-medium">{uc.label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Stats */}
        <section className="px-4 pb-16 max-w-5xl mx-auto">
          <div className="border border-border rounded-xl p-5 bg-muted/10">
            <div className="grid grid-cols-4 gap-4 text-center">
              {[
                { value: "56", label: "Tests" },
                { value: "6", label: "PVM Precompiles" },
                { value: "3", label: "Resolvers" },
                { value: "11", label: "E2E Tests" },
              ].map((s) => (
                <div key={s.label}>
                  <p className="text-xl font-bold text-[#E6007A]">{s.value}</p>
                  <p className="text-[10px] text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
