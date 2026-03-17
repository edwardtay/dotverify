"use client";

import { useState } from "react";
import { IssueAttestation } from "./issue-attestation";
import { Sr25519Attest } from "./sr25519-attest";
import { BatchAttestation } from "./batch-attestation";

type Mode = "standard" | "sr25519" | "batch";

export function IssuePage({ address }: { address?: `0x${string}` }) {
  const [mode, setMode] = useState<Mode>("standard");

  return (
    <div className="space-y-4">
      {/* Mode selector */}
      <div className="flex gap-2">
        {([
          { id: "standard" as Mode, label: "Single Credential" },
          { id: "sr25519" as Mode, label: "Polkadot Wallet" },
          { id: "batch" as Mode, label: "Bulk Issue (CSV)" },
        ]).map((m) => (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              mode === m.id
                ? "border-[#E6007A] bg-[#E6007A]/5 text-[#E6007A]"
                : "border-border text-muted-foreground hover:bg-muted/30"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {mode === "standard" && <IssueAttestation address={address} />}
      {mode === "sr25519" && <Sr25519Attest />}
      {mode === "batch" && <BatchAttestation address={address} />}
    </div>
  );
}
