"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { motion, AnimatePresence } from "framer-motion";
import { SchemaRegistry } from "./schema-registry";
import { IssuePage } from "./issue-page";
import { VerifyPage } from "./verify-page";
import { Explorer } from "./explorer";
import { IssuerDashboard } from "./issuer-dashboard";
import { PvmExplorer } from "./pvm-explorer";
import { AiChat } from "./ai-chat";

const TABS = [
  { id: "Schemas", label: "Templates", icon: "◈" },
  { id: "Issue", label: "Issue", icon: "✦" },
  { id: "Verify", label: "Verify", icon: "✓" },
  { id: "Explorer", label: "Browse", icon: "◎" },
  { id: "Issuers", label: "Issuers", icon: "⇄" },
  { id: "PVM", label: "Tech", icon: "⬡" },
  { id: "AI", label: "AI", icon: "●" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function Dashboard() {
  const [activeTab, setActiveTab] = useState<TabId>("Schemas");
  const { address } = useAccount();

  return (
    <div>
      <div className="flex items-center gap-0.5 border-b border-border mb-4 overflow-x-auto scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
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

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.15 }}
        >
          {activeTab === "Schemas" && <SchemaRegistry />}
          {activeTab === "Issue" && <IssuePage address={address} />}
          {activeTab === "Verify" && <VerifyPage />}
          {activeTab === "Explorer" && <Explorer address={address} />}
          {activeTab === "Issuers" && <IssuerDashboard />}
          {activeTab === "PVM" && <PvmExplorer />}
          {activeTab === "AI" && <AiChat address={address} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
