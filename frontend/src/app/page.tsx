"use client";

import { useState } from "react";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";

const ROLES = [
  {
    id: "issuer",
    title: "I want to issue credentials",
    subtitle: "Universities, employers, DAOs, accelerators",
    desc: "Register as a trusted issuer, define credential schemas, and issue verifiable attestations to recipients.",
    steps: ["Register as issuer", "Create a schema", "Issue credentials", "Manage & revoke"],
    href: "/app?role=issuer",
    color: "#E6007A",
  },
  {
    id: "verifier",
    title: "I want to verify a credential",
    subtitle: "Employers, platforms, protocols, anyone",
    desc: "Paste a credential UID and instantly check if it's valid, expired, or revoked — no account needed.",
    steps: ["Paste credential UID", "See issuer & status", "Check data integrity", "Done"],
    href: "/app?role=verifier",
    color: "#2563eb",
  },
  {
    id: "holder",
    title: "I want to view my credentials",
    subtitle: "Students, employees, members, contributors",
    desc: "Connect your wallet to see all credentials issued to you. Share verification links with anyone.",
    steps: ["Connect wallet", "View credentials", "Copy share link", "Send to verifier"],
    href: "/app?role=holder",
    color: "#16a34a",
  },
];

const USE_CASES = [
  { title: "Academic Diplomas", desc: "Universities issue permanent, non-revocable degree attestations verified cross-chain", icon: "🎓" },
  { title: "DAO Membership", desc: "DAOs issue revocable membership credentials with on-chain audit trail", icon: "🏛" },
  { title: "Accelerator Cohorts", desc: "Programs issue completion certificates to participants with batch issuance", icon: "🚀" },
  { title: "Enterprise Certs", desc: "Consortiums issue partner certifications with resolver-gated access control", icon: "🔐" },
  { title: "Contributor Attestations", desc: "Projects attest to developer contributions with cross-chain portability", icon: "🛠" },
  { title: "KYC / Compliance", desc: "Verified once on Hub, portable to any parachain via XCM — no re-verification", icon: "✓" },
];

const WHY_DIFFERENT = [
  {
    title: "Cross-chain by default",
    problem: "EAS on Optimism can't verify a credential on Arbitrum.",
    solution: "XCM delivers attestation status to any of 50+ parachains. No bridges. No oracles.",
  },
  {
    title: "Two signature ecosystems",
    problem: "Every protocol only supports ECDSA (MetaMask).",
    solution: "sr25519 issuers (Polkadot.js) and ECDSA issuers (MetaMask) coexist natively.",
  },
  {
    title: "Substrate-native integrity",
    problem: "keccak256 hashes can't be verified by Substrate state proofs.",
    solution: "BLAKE2-256 UIDs are compatible with Polkadot's native storage and verification.",
  },
  {
    title: "Anti-proxy security",
    problem: "EAS can't prevent proxy contracts from issuing credentials on your behalf.",
    solution: "callerIsOrigin() guarantees only direct signers can issue secure attestations.",
  },
];

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-white">
      <Navbar />
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8">
        {/* Hero */}
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold tracking-tight mb-3">
            Verifiable Credentials.{" "}
            <span className="text-[#E6007A]">On-Chain.</span>
          </h1>
          <p className="text-muted-foreground text-sm max-w-xl mx-auto mb-2">
            Issue, verify, and share tamper-proof credentials across the Polkadot ecosystem.
          </p>
          <p className="text-muted-foreground text-xs max-w-lg mx-auto">
            Built for high-trust use cases: diplomas, certifications, DAO membership, contributor attestations.
          </p>
        </div>

        {/* Role-based entry */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-16">
          {ROLES.map((role) => (
            <Link
              key={role.id}
              href={role.href}
              className="border border-border rounded-xl p-5 hover:shadow-md transition-all group"
            >
              <h2 className="font-bold text-sm mb-0.5" style={{ color: role.color }}>
                {role.title}
              </h2>
              <p className="text-[10px] text-muted-foreground mb-3">{role.subtitle}</p>
              <p className="text-xs text-muted-foreground mb-4">{role.desc}</p>
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

        {/* Quick verify (no wallet needed) */}
        <div className="border border-border rounded-xl p-6 mb-16 bg-muted/10">
          <h2 className="font-bold text-sm mb-1">Quick Verify — No Wallet Needed</h2>
          <p className="text-[11px] text-muted-foreground mb-3">
            Anyone can verify a credential. Just paste the UID.
          </p>
          <QuickVerifyInput />
        </div>

        {/* Use cases */}
        <div className="mb-16">
          <h2 className="text-lg font-bold mb-4">Built For</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {USE_CASES.map((uc) => (
              <div key={uc.title} className="border border-border rounded-lg p-4">
                <span className="text-xl mb-2 block">{uc.icon}</span>
                <h3 className="font-semibold text-xs mb-1">{uc.title}</h3>
                <p className="text-[10px] text-muted-foreground">{uc.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Why different */}
        <div className="mb-16">
          <h2 className="text-lg font-bold mb-1">Why Not Just Use EAS?</h2>
          <p className="text-xs text-muted-foreground mb-4">
            EAS proved the attestation model. DotVerify deploys it where cross-chain is native.
          </p>
          <div className="space-y-3">
            {WHY_DIFFERENT.map((d) => (
              <div key={d.title} className="border border-border rounded-lg p-4">
                <h3 className="font-semibold text-xs mb-2">{d.title}</h3>
                <div className="grid grid-cols-2 gap-3 text-[11px]">
                  <div>
                    <span className="text-red-500 font-medium block mb-0.5">Problem (EVM)</span>
                    <span className="text-muted-foreground">{d.problem}</span>
                  </div>
                  <div>
                    <span className="text-green-600 font-medium block mb-0.5">DotVerify (PVM)</span>
                    <span>{d.solution}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="border border-border rounded-xl p-6 text-center mb-8">
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: "Precompiles Used", value: "6" },
              { label: "Unit Tests", value: "51" },
              { label: "E2E Tests", value: "11" },
              { label: "Lines of Solidity", value: "480+" },
            ].map((s) => (
              <div key={s.label}>
                <p className="text-2xl font-bold text-[#E6007A]">{s.value}</p>
                <p className="text-[10px] text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

function QuickVerifyInput() {
  const [uid, setUid] = useState("");

  return (
    <div className="flex gap-2">
      <input
        type="text"
        value={uid}
        onChange={(e) => setUid(e.target.value)}
        placeholder="Paste attestation UID (0x...)"
        className="flex-1 border border-border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-[#E6007A]"
      />
      <Link
        href={uid ? `/verify/${uid}` : "#"}
        className={`px-4 py-2 bg-[#E6007A] text-white rounded-lg text-sm font-medium hover:bg-[#c40066] transition-colors ${!uid ? "opacity-50 pointer-events-none" : ""}`}
      >
        Verify
      </Link>
    </div>
  );
}

