"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Dashboard } from "@/components/dashboard";

function AppContent() {
  const searchParams = useSearchParams();
  const role = searchParams.get("role");

  // Map roles to default tabs
  const defaultTab = role === "issuer"
    ? "Issuers"
    : role === "verifier"
      ? "Verify"
      : role === "holder"
        ? "My Creds"
        : undefined;

  return <Dashboard defaultTab={defaultTab} />;
}

export default function AppPage() {
  return (
    <div className="flex flex-col min-h-screen bg-white">
      <Navbar />
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-4">
        <Suspense fallback={<div className="text-center py-12 text-sm text-muted-foreground">Loading...</div>}>
          <AppContent />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
