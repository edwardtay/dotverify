"use client";

import { useState } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { DOTVERIFY_ABI, DOTVERIFY_ADDRESS } from "@/config/contract";

export function IssuerDashboard() {
  const { address } = useAccount();

  return (
    <div className="space-y-6">
      <RegisterIssuer address={address} />
      {address && <IssuerProfile address={address} />}
      {address && <ManageDelegates address={address} />}
      {address && <IssuerStats address={address} />}
    </div>
  );
}

// ─── Register as Issuer ─────────────────────────────────────────────────────

function RegisterIssuer({ address }: { address?: `0x${string}` }) {
  const [name, setName] = useState("");

  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  const { data: issuer } = useReadContract({
    address: DOTVERIFY_ADDRESS,
    abi: DOTVERIFY_ABI,
    functionName: "getIssuer",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const issuerData = issuer as {
    registered: boolean;
    name: string;
    substrateAccountId: string;
    codeHashAtRegistration: string;
    attestationsMade: bigint;
    registeredAt: bigint;
  } | undefined;

  const isRegistered = issuerData?.registered ?? false;

  function handleRegister() {
    if (!name || !DOTVERIFY_ADDRESS) return;
    writeContract({
      address: DOTVERIFY_ADDRESS,
      abi: DOTVERIFY_ABI,
      functionName: "registerIssuer",
      args: [name],
    });
  }

  if (isRegistered) return null;

  return (
    <div className="border border-border rounded-lg p-4">
      <h2 className="font-semibold text-sm mb-3">Register as Issuer</h2>

      {!address && (
        <p className="text-xs text-amber-600 mb-3">Connect your wallet to register as an issuer.</p>
      )}

      <div className="space-y-3">
        <div>
          <label className="text-[11px] font-medium text-muted-foreground block mb-1">Issuer Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Polkadot University"
            className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#E6007A]"
          />
        </div>

        <button
          onClick={handleRegister}
          disabled={isPending || isConfirming || !address || !name || !DOTVERIFY_ADDRESS}
          className="px-4 py-2 bg-[#E6007A] text-white rounded-lg text-sm font-medium hover:bg-[#c40066] transition-colors disabled:opacity-50"
        >
          {isPending ? "Signing..." : isConfirming ? "Confirming..." : "Register as Issuer"}
        </button>

        {isSuccess && (
          <p className="text-xs text-green-600">Successfully registered as an issuer!</p>
        )}

        {!DOTVERIFY_ADDRESS && (
          <p className="text-xs text-amber-600">Contract not configured. Set NEXT_PUBLIC_DOTVERIFY_ADDRESS in .env.local</p>
        )}
      </div>
    </div>
  );
}

// ─── Issuer Profile ─────────────────────────────────────────────────────────

function IssuerProfile({ address }: { address: `0x${string}` }) {
  const { data: issuer } = useReadContract({
    address: DOTVERIFY_ADDRESS,
    abi: DOTVERIFY_ABI,
    functionName: "getIssuer",
    args: [address],
  });

  const issuerData = issuer as {
    registered: boolean;
    name: string;
    substrateAccountId: string;
    codeHashAtRegistration: string;
    attestationsMade: bigint;
    registeredAt: bigint;
  } | undefined;

  if (!issuerData?.registered) return null;

  return (
    <div className="border border-border rounded-lg p-4">
      <h2 className="font-semibold text-sm mb-3">My Issuer Profile</h2>
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-[11px] font-medium text-muted-foreground">Name</span>
          <span className="text-sm font-medium">{issuerData.name}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-[11px] font-medium text-muted-foreground">EVM Address</span>
          <span className="text-sm font-mono">{address.slice(0, 6)}...{address.slice(-4)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-[11px] font-medium text-muted-foreground">Substrate Account ID</span>
          <span className="text-sm font-mono">{issuerData.substrateAccountId.slice(0, 10)}...{issuerData.substrateAccountId.slice(-4)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-[11px] font-medium text-muted-foreground">Attestations Made</span>
          <span className="text-sm font-medium">{Number(issuerData.attestationsMade)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-[11px] font-medium text-muted-foreground">Registered</span>
          <span className="text-sm">{new Date(Number(issuerData.registeredAt) * 1000).toLocaleDateString()}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-[11px] font-medium text-muted-foreground">Code Hash at Registration</span>
          <span className="text-[10px] font-mono text-muted-foreground">{issuerData.codeHashAtRegistration.slice(0, 18)}...</span>
        </div>
      </div>
    </div>
  );
}

// ─── Manage Delegates ───────────────────────────────────────────────────────

function ManageDelegates({ address }: { address: `0x${string}` }) {
  const [newDelegate, setNewDelegate] = useState("");
  const [checkDelegate, setCheckDelegate] = useState("");

  // Persist delegate list in localStorage (contract has no list getter, only delegates(a,b) check)
  const storageKey = `dotverify-delegates-${address}`;
  const [managedDelegates, setManagedDelegates] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      return JSON.parse(localStorage.getItem(storageKey) || "[]");
    } catch { return []; }
  });

  function updateDelegates(fn: (prev: string[]) => string[]) {
    setManagedDelegates((prev) => {
      const next = fn(prev);
      if (typeof window !== "undefined") localStorage.setItem(storageKey, JSON.stringify(next));
      return next;
    });
  }

  const { data: issuer } = useReadContract({
    address: DOTVERIFY_ADDRESS,
    abi: DOTVERIFY_ABI,
    functionName: "getIssuer",
    args: [address],
  });

  const issuerData = issuer as { registered: boolean } | undefined;

  const {
    writeContract: writeAdd,
    data: addTxHash,
    isPending: isAddPending,
  } = useWriteContract();
  const { isLoading: isAddConfirming, isSuccess: isAddSuccess } = useWaitForTransactionReceipt({ hash: addTxHash });

  const {
    writeContract: writeRemove,
    data: removeTxHash,
    isPending: isRemovePending,
  } = useWriteContract();
  const { isLoading: isRemoveConfirming, isSuccess: isRemoveSuccess } = useWaitForTransactionReceipt({ hash: removeTxHash });

  // Check if a specific address is a delegate
  const { data: isDelegateResult } = useReadContract({
    address: DOTVERIFY_ADDRESS,
    abi: DOTVERIFY_ABI,
    functionName: "delegates",
    args: checkDelegate ? [address, checkDelegate as `0x${string}`] : undefined,
    query: { enabled: !!checkDelegate && checkDelegate.startsWith("0x") && checkDelegate.length === 42 },
  });

  function handleAdd() {
    if (!newDelegate || !DOTVERIFY_ADDRESS) return;
    writeAdd({
      address: DOTVERIFY_ADDRESS,
      abi: DOTVERIFY_ABI,
      functionName: "addDelegate",
      args: [newDelegate as `0x${string}`],
    });
    if (!managedDelegates.includes(newDelegate)) {
      updateDelegates((prev) => [...prev, newDelegate]);
    }
  }

  function handleRemove(delegate: string) {
    if (!DOTVERIFY_ADDRESS) return;
    writeRemove({
      address: DOTVERIFY_ADDRESS,
      abi: DOTVERIFY_ABI,
      functionName: "removeDelegate",
      args: [delegate as `0x${string}`],
    });
    updateDelegates((prev) => prev.filter((d) => d !== delegate));
  }

  if (!issuerData?.registered) return null;

  return (
    <div className="border border-border rounded-lg p-4">
      <h2 className="font-semibold text-sm mb-3">Manage Delegates</h2>
      <div className="space-y-4">
        {/* Add delegate */}
        <div className="space-y-2">
          <label className="text-[11px] font-medium text-muted-foreground block">Add Delegate</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={newDelegate}
              onChange={(e) => setNewDelegate(e.target.value)}
              placeholder="0x... delegate address"
              className="flex-1 border border-border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-[#E6007A]"
            />
            <button
              onClick={handleAdd}
              disabled={isAddPending || isAddConfirming || !newDelegate || !DOTVERIFY_ADDRESS}
              className="px-4 py-2 bg-[#E6007A] text-white rounded-lg text-sm font-medium hover:bg-[#c40066] transition-colors disabled:opacity-50 whitespace-nowrap"
            >
              {isAddPending ? "Signing..." : isAddConfirming ? "Confirming..." : "Add"}
            </button>
          </div>
          {isAddSuccess && (
            <p className="text-xs text-green-600">Delegate added successfully!</p>
          )}
        </div>

        {/* Tracked delegates (persisted locally, verified on-chain via Check below) */}
        {managedDelegates.length > 0 && (
          <div className="space-y-2">
            <label className="text-[11px] font-medium text-muted-foreground block">
              Known Delegates
              <span className="text-[9px] ml-1">(use Check below to verify on-chain status)</span>
            </label>
            {managedDelegates.map((delegate) => (
              <div key={delegate} className="flex items-center justify-between border border-border rounded-lg px-3 py-2">
                <span className="text-sm font-mono">{delegate.slice(0, 10)}...{delegate.slice(-4)}</span>
                <button
                  onClick={() => handleRemove(delegate)}
                  disabled={isRemovePending || isRemoveConfirming}
                  className="text-xs text-red-600 hover:text-red-800 transition-colors disabled:opacity-50"
                >
                  {isRemovePending ? "..." : "Remove"}
                </button>
              </div>
            ))}
            {isRemoveSuccess && (
              <p className="text-xs text-green-600">Delegate removed successfully!</p>
            )}
          </div>
        )}

        {/* Check delegate status */}
        <div className="space-y-2">
          <label className="text-[11px] font-medium text-muted-foreground block">Check Delegate Status</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={checkDelegate}
              onChange={(e) => setCheckDelegate(e.target.value)}
              placeholder="0x... address to check"
              className="flex-1 border border-border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-[#E6007A]"
            />
          </div>
          {checkDelegate && checkDelegate.length === 42 && isDelegateResult !== undefined && (
            <p className={`text-xs ${isDelegateResult ? "text-green-600" : "text-muted-foreground"}`}>
              {checkDelegate.slice(0, 10)}...{checkDelegate.slice(-4)} is {isDelegateResult ? "an active delegate" : "not a delegate"}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Issuer Stats ───────────────────────────────────────────────────────────

function IssuerStats({ address }: { address: `0x${string}` }) {
  const { data: issuer } = useReadContract({
    address: DOTVERIFY_ADDRESS,
    abi: DOTVERIFY_ABI,
    functionName: "getIssuer",
    args: [address],
  });

  const { data: issuedUids } = useReadContract({
    address: DOTVERIFY_ADDRESS,
    abi: DOTVERIFY_ABI,
    functionName: "getIssuedAttestations",
    args: [address],
  });

  const { data: issuerCount } = useReadContract({
    address: DOTVERIFY_ADDRESS,
    abi: DOTVERIFY_ABI,
    functionName: "getIssuerCount",
  });

  const issuerData = issuer as {
    registered: boolean;
    attestationsMade: bigint;
  } | undefined;

  const issued = issuedUids as `0x${string}`[] | undefined;

  return (
    <div className="border border-border rounded-lg p-4">
      <h2 className="font-semibold text-sm mb-3">Issuer Stats</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="border border-border rounded-lg p-3 text-center">
          <p className="text-[11px] text-muted-foreground mb-1">Total Issuers</p>
          <p className="text-lg font-semibold">{issuerCount !== undefined ? Number(issuerCount) : "-"}</p>
        </div>
        <div className="border border-border rounded-lg p-3 text-center">
          <p className="text-[11px] text-muted-foreground mb-1">My Attestations (contract)</p>
          <p className="text-lg font-semibold">{issuerData?.registered ? Number(issuerData.attestationsMade) : "-"}</p>
        </div>
        <div className="border border-border rounded-lg p-3 text-center">
          <p className="text-[11px] text-muted-foreground mb-1">Issued UIDs</p>
          <p className="text-lg font-semibold">{issued ? issued.length : "-"}</p>
        </div>
      </div>
      {issued && issued.length > 0 && (
        <div className="mt-3 space-y-1">
          <p className="text-[11px] font-medium text-muted-foreground">Recent Attestation UIDs</p>
          {issued.slice(-5).reverse().map((uid) => (
            <p key={uid} className="text-[10px] font-mono text-muted-foreground">{uid.slice(0, 18)}...{uid.slice(-4)}</p>
          ))}
        </div>
      )}
    </div>
  );
}
