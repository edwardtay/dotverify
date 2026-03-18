"use client";

import { useAccount } from "wagmi";
import { ZkTlsProve } from "./zktls-prove";

export function ProveTab() {
  const { address } = useAccount();

  return (
    <div className="space-y-6">
      {!address && (
        <div className="border border-amber-200 bg-amber-50 rounded-xl p-4 text-center">
          <p className="text-sm text-amber-700">Connect your wallet to create proofs.</p>
        </div>
      )}
      <ZkTlsProve />
    </div>
  );
}
