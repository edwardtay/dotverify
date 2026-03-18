"use client";

import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Dashboard } from "@/components/dashboard";

export default function AppPage() {
  return (
    <div className="flex flex-col min-h-screen bg-white">
      <Navbar />
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-4">
        <Dashboard />
      </main>
      <Footer />
    </div>
  );
}
