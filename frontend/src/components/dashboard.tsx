"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ProveTab } from "./prove-tab";
import { MyProofsTab } from "./my-proofs-tab";
import { SbtCredential } from "./sbt-credential";
import { VerifyTab } from "./verify-tab";

const TABS = [
  { id: "Prove", label: "Prove", icon: "◈" },
  { id: "MyProofs", label: "My Proofs", icon: "◎" },
  { id: "Credentials", label: "Credentials", icon: "◆" },
  { id: "Verify", label: "Verify", icon: "✓" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function Dashboard() {
  const [activeTab, setActiveTab] = useState<TabId>("Prove");

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
          {activeTab === "Prove" && <ProveTab />}
          {activeTab === "MyProofs" && <MyProofsTab />}
          {activeTab === "Credentials" && <SbtCredential />}
          {activeTab === "Verify" && <VerifyTab />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
