"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { siteConfig } from "@/config/site";
import { Footer } from "@/components/footer";

const ROLES = [
  {
    id: "issuer",
    title: "Issue Credentials",
    subtitle: "For universities, employers, DAOs",
    desc: "Register your organization, define credential types, and issue verifiable credentials to recipients.",
    steps: ["Register your organization", "Choose a credential template", "Issue credentials", "Manage & revoke"],
    href: "/app?role=issuer",
    color: "#E6007A",
    bg: "bg-[#E6007A]/5",
    border: "border-[#E6007A]/20",
  },
  {
    id: "verifier",
    title: "Verify a Credential",
    subtitle: "For anyone — no wallet needed",
    desc: "Paste a credential ID and instantly check if it's authentic, who issued it, and whether it's still valid.",
    steps: ["Paste credential ID", "See who issued it", "Check if it's valid", "Done"],
    href: "/app?role=verifier",
    color: "#2563eb",
    bg: "bg-blue-50",
    border: "border-blue-200",
  },
  {
    id: "holder",
    title: "View My Credentials",
    subtitle: "For credential recipients",
    desc: "Connect your wallet to see all credentials issued to you and share verification links.",
    steps: ["Connect wallet", "View credentials", "Copy share link", "Send to verifier"],
    href: "/app?role=holder",
    color: "#16a34a",
    bg: "bg-green-50",
    border: "border-green-200",
  },
];

const USE_CASES = [
  { title: "Academic Diplomas", desc: "Permanent, non-revocable degree attestations", icon: "🎓" },
  { title: "DAO Membership", desc: "Revocable credentials with audit trail", icon: "🏛" },
  { title: "Accelerator Cohorts", desc: "Batch-issued completion certificates", icon: "🚀" },
  { title: "KYC / Compliance", desc: "Verify once, portable cross-chain via XCM", icon: "✓" },
];

const CAPABILITIES = [
  { title: "Verify across chains", desc: "Credentials issued on Polkadot Hub can be verified on any connected chain — no bridges needed." },
  { title: "Both wallet ecosystems", desc: "Issue from MetaMask or Polkadot wallets. Recipients don't need a wallet to verify." },
  { title: "Tamper-proof", desc: "Every credential has a unique fingerprint stored on-chain. Any modification is instantly detectable." },
  { title: "Secure issuance", desc: "Extra protection ensures only authorized signers can issue credentials — no impersonation possible." },
  { title: "Access controls", desc: "Control who can issue credentials: payment-gated, token-gated, or invitation-only." },
  { title: "Bulk issuance", desc: "Issue hundreds of credentials at once via CSV upload." },
];

export default function LandingPage() {
  const router = useRouter();
  const [verifyUid, setVerifyUid] = useState("");

  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* Navbar */}
      <header className="border-b border-border bg-white sticky top-0 z-50">
        <div className="flex items-center justify-between px-4 py-2.5 max-w-5xl mx-auto w-full">
          <div className="flex items-center gap-1.5 text-sm font-bold tracking-tight">
            <span className="w-2.5 h-2.5 rounded-full bg-[#E6007A]" />
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
        <section className="px-4 pt-16 sm:pt-20 pb-8 max-w-3xl mx-auto text-center space-y-4">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight leading-tight">
            Verifiable Credentials.{" "}
            <span className="text-[#E6007A]">On-Chain.</span>
          </h1>
          <p className="text-sm text-muted-foreground max-w-lg mx-auto">
            Issue, verify, and share tamper-proof credentials across the Polkadot ecosystem.
            Built for DAOs, accelerators, and organizations where transparency matters.
          </p>

          {/* Quick verify */}
          <div className="max-w-lg mx-auto flex gap-2 pt-2">
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
          <p className="text-[10px] text-muted-foreground">No wallet needed to verify</p>
        </section>

        {/* Role cards */}
        <section className="px-4 pb-16 max-w-5xl mx-auto">
          <h2 className="text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-6">
            What would you like to do?
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {ROLES.map((role) => (
              <Link
                key={role.id}
                href={role.href}
                className={`${role.bg} border ${role.border} rounded-xl p-5 hover:shadow-md transition-all group`}
              >
                <h3 className="font-bold text-sm mb-0.5" style={{ color: role.color }}>
                  {role.title}
                </h3>
                <p className="text-[10px] text-muted-foreground mb-3">{role.subtitle}</p>
                <p className="text-[11px] text-muted-foreground mb-4 leading-relaxed">{role.desc}</p>
                <div className="space-y-1.5">
                  {role.steps.map((step, i) => (
                    <div key={step} className="flex items-center gap-2 text-[11px]">
                      <span
                        className="w-4 h-4 rounded-full text-white text-[9px] font-bold flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: role.color }}
                      >
                        {i + 1}
                      </span>
                      {step}
                    </div>
                  ))}
                </div>
                <div className="mt-4 text-xs font-medium group-hover:underline" style={{ color: role.color }}>
                  Get started →
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Use cases */}
        <section className="px-4 pb-16 max-w-5xl mx-auto">
          <h2 className="text-lg font-bold mb-4">Built For</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {USE_CASES.map((uc) => (
              <div key={uc.title} className="border border-border rounded-lg p-4">
                <span className="text-xl mb-2 block">{uc.icon}</span>
                <h3 className="font-semibold text-xs mb-1">{uc.title}</h3>
                <p className="text-[10px] text-muted-foreground leading-relaxed">{uc.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Capabilities */}
        <section className="px-4 pb-16 max-w-5xl mx-auto">
          <h2 className="text-lg font-bold mb-1">Why Polkadot Hub</h2>
          <p className="text-xs text-muted-foreground mb-4">
            Built on Polkadot&apos;s smart contract platform with capabilities not available on other chains.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {CAPABILITIES.map((c) => (
              <div key={c.title} className="border border-border rounded-lg p-4">
                <h3 className="font-semibold text-xs mb-1">{c.title}</h3>
                <p className="text-[10px] text-muted-foreground leading-relaxed">{c.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Stats */}
        <section className="px-4 pb-16 max-w-5xl mx-auto">
          <div className="border border-border rounded-xl p-6 bg-muted/10">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              {[
                { label: "PVM Precompiles", value: "6" },
                { label: "Unit + Fuzz Tests", value: "51" },
                { label: "E2E Tests", value: "11" },
                { label: "Schema Resolvers", value: "3" },
              ].map((s) => (
                <div key={s.label}>
                  <p className="text-xl sm:text-2xl font-bold text-[#E6007A]">{s.value}</p>
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
