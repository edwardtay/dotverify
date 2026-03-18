"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { siteConfig } from "@/config/site";
import { Footer } from "@/components/footer";

export default function LandingPage() {
  const router = useRouter();
  const [verifyId, setVerifyId] = useState("");

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
        <section className="px-4 pt-16 sm:pt-24 pb-10 max-w-3xl mx-auto text-center">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight leading-tight mb-3">
            Prove Web2 Facts.{" "}
            <span className="text-[#E6007A]">On Polkadot.</span>
          </h1>
          <p className="text-sm text-muted-foreground max-w-md mx-auto mb-8">
            Privately prove things about yourself on-chain — your finances, identity, and credentials — without exposing sensitive data.
          </p>

          <Link
            href="/app"
            className="inline-block px-8 py-3 bg-[#E6007A] text-white rounded-xl text-sm font-medium hover:bg-[#c40066] transition-colors shadow-sm"
          >
            Get Started →
          </Link>
        </section>

        <section className="px-4 pb-12 max-w-5xl mx-auto">
          <h2 className="text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">What can you prove?</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { icon: "🏦", label: "Bank Balance", desc: "Prove assets without sharing login" },
              { icon: "🎓", label: "Credentials", desc: "Degrees, certs, course completions" },
              { icon: "👤", label: "Identity", desc: "KYC status, social accounts, age" },
              { icon: "💼", label: "Employment", desc: "Job title, company, tenure" },
            ].map((uc) => (
              <div key={uc.label} className="border border-border rounded-xl p-4 text-center">
                <span className="text-xl block mb-1.5">{uc.icon}</span>
                <span className="text-[11px] font-medium block">{uc.label}</span>
                <span className="text-[10px] text-muted-foreground">{uc.desc}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="px-4 pb-12 max-w-3xl mx-auto">
          <h2 className="text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">How it works</h2>
          <div className="grid grid-cols-3 gap-4 text-center">
            {[
              { step: "1", title: "Connect & prove", desc: "Fetch data from any website. A zkTLS attestor verifies it came from the real source." },
              { step: "2", title: "Anchor on-chain", desc: "Only a BLAKE2-256 fingerprint is stored on Polkadot Hub. Your data stays private." },
              { step: "3", title: "Share & verify", desc: "Anyone can verify your proof with a link. No wallet, no login, no trust." },
            ].map((s) => (
              <div key={s.step}>
                <span className="inline-block w-7 h-7 rounded-full bg-[#E6007A] text-white text-xs font-bold leading-7 mb-2">{s.step}</span>
                <p className="text-xs font-medium mb-1">{s.title}</p>
                <p className="text-[10px] text-muted-foreground leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </section>

      </main>

      <Footer />
    </div>
  );
}
