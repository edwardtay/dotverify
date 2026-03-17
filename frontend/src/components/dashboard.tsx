"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { motion, AnimatePresence } from "framer-motion";
import { SchemaRegistry } from "./schema-registry";
import { IssueAttestation } from "./issue-attestation";
import { VerifyCredential } from "./verify-credential";
import { MyAttestations } from "./my-attestations";
import { Explorer } from "./explorer";
import { IssuerDashboard } from "./issuer-dashboard";
import { BatchAttestation } from "./batch-attestation";
import { Sr25519Attest } from "./sr25519-attest";
import { XcmVerify } from "./xcm-verify";
import { PvmExplorer } from "./pvm-explorer";
import { AiChat } from "./ai-chat";

const TABS = [
  { id: "Schemas", label: "Schemas", icon: "◈" },
  { id: "Issue", label: "Issue", icon: "✦" },
  { id: "sr25519", label: "sr25519", icon: "🔑" },
  { id: "XCM", label: "XCM", icon: "⇄" },
  { id: "Verify", label: "Verify", icon: "✓" },
  { id: "My Creds", label: "My Creds", icon: "◎" },
  { id: "Explorer", label: "Explorer", icon: "🔍" },
  { id: "Issuers", label: "Issuers", icon: "🏛" },
  { id: "Batch", label: "Batch", icon: "📋" },
  { id: "PVM", label: "PVM", icon: "⬡" },
  { id: "AI", label: "AI", icon: "●" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function Dashboard({ defaultTab }: { defaultTab?: string }) {
  const [activeTab, setActiveTab] = useState<TabId>(
    (defaultTab && TABS.some((t) => t.id === defaultTab) ? defaultTab : "Schemas") as TabId
  );
  const { address } = useAccount();

  return (
    <div>
      {/* Tab Navigation */}
      <div className="flex items-center gap-0.5 border-b border-border mb-4 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? "border-[#E6007A] text-[#E6007A]"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"
            }`}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.15 }}
        >
          {activeTab === "Schemas" && <SchemaRegistry />}
          {activeTab === "Issue" && <IssueAttestation address={address} />}
          {activeTab === "sr25519" && <Sr25519Attest />}
          {activeTab === "XCM" && <XcmVerify />}
          {activeTab === "Verify" && <VerifyCredential />}
          {activeTab === "My Creds" && <MyAttestations address={address} />}
          {activeTab === "Explorer" && <Explorer />}
          {activeTab === "Issuers" && <IssuerDashboard />}
          {activeTab === "Batch" && <BatchAttestation address={address} />}
          {activeTab === "PVM" && <PvmExplorer />}
          {activeTab === "AI" && <AiChat address={address} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
