"use client";

import { useState } from "react";
import Link from "next/link";
import { useReadContract } from "wagmi";
import { DOTVERIFY_ABI, DOTVERIFY_ADDRESS } from "@/config/contract";

function shorten(s: string) {
  if (!s || s.length < 12) return s;
  return s.slice(0, 6) + "..." + s.slice(-4);
}

function StatusBadge({ uid }: { uid: string }) {
  const { data: result } = useReadContract({
    address: DOTVERIFY_ADDRESS,
    abi: DOTVERIFY_ABI,
    functionName: "verify",
    args: [uid as `0x${string}`],
    query: { enabled: !!DOTVERIFY_ADDRESS },
  });

  const verification = result as
    | [boolean, { revoked: boolean; issuedAt: bigint; expiresAt: bigint }]
    | undefined;

  if (!verification) {
    return <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">...</span>;
  }

  const [valid, att] = verification;
  if (att.revoked) {
    return <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-700">Revoked</span>;
  }
  if (valid) {
    return <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-100 text-green-700">Valid</span>;
  }
  return <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">Expired</span>;
}

function AttestationRow({ uid }: { uid: string }) {
  const { data: result } = useReadContract({
    address: DOTVERIFY_ADDRESS,
    abi: DOTVERIFY_ABI,
    functionName: "verify",
    args: [uid as `0x${string}`],
    query: { enabled: !!DOTVERIFY_ADDRESS },
  });

  const verification = result as
    | [boolean, { uid: string; issuer: string; recipient: string; issuedAt: bigint; revoked: boolean }]
    | undefined;

  const att = verification?.[1];

  return (
    <tr className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
      <td className="px-3 py-2">
        <Link href={`/verify/${uid}`} className="font-mono text-[10px] text-[#E6007A] hover:underline">
          {shorten(uid)}
        </Link>
      </td>
      <td className="px-3 py-2 font-mono text-[10px]">{att ? shorten(att.issuer) : "..."}</td>
      <td className="px-3 py-2 font-mono text-[10px]">{att ? shorten(att.recipient) : "..."}</td>
      <td className="px-3 py-2 text-[10px]">
        {att && Number(att.issuedAt) > 0
          ? new Date(Number(att.issuedAt) * 1000).toLocaleDateString()
          : "..."}
      </td>
      <td className="px-3 py-2">
        <StatusBadge uid={uid} />
      </td>
    </tr>
  );
}

function SchemaCard({ schemaUid }: { schemaUid: string }) {
  const [expanded, setExpanded] = useState(false);

  const { data: schema } = useReadContract({
    address: DOTVERIFY_ADDRESS,
    abi: DOTVERIFY_ABI,
    functionName: "getSchema",
    args: [schemaUid as `0x${string}`],
    query: { enabled: !!DOTVERIFY_ADDRESS },
  });

  const { data: attestationUids } = useReadContract({
    address: DOTVERIFY_ADDRESS,
    abi: DOTVERIFY_ABI,
    functionName: "getSchemaAttestations",
    args: [schemaUid as `0x${string}`],
    query: { enabled: !!DOTVERIFY_ADDRESS },
  });

  const s = schema as { uid: string; creator: string; name: string; definition: string; revocable: boolean; createdAt: bigint } | undefined;
  const uids = (attestationUids as string[]) || [];
  // Show only first 10 for performance
  const displayUids = uids.slice(0, 10);

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-muted/20 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-sm truncate">{s?.name || "Loading..."}</h3>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground shrink-0">
              {uids.length} attestation{uids.length !== 1 ? "s" : ""}
            </span>
            {s?.revocable && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 shrink-0">
                Revocable
              </span>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground font-mono mt-0.5 truncate">
            {s?.definition || "..."}
          </p>
        </div>
        <span className="text-muted-foreground ml-2 shrink-0">{expanded ? "-" : "+"}</span>
      </button>

      {expanded && (
        <div className="border-t border-border">
          {/* Schema details */}
          <div className="px-4 py-2 bg-muted/10 text-[10px] space-y-1">
            <div>
              <span className="text-muted-foreground">UID: </span>
              <span className="font-mono">{shorten(schemaUid)}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Creator: </span>
              <span className="font-mono">{s ? shorten(s.creator) : "..."}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Created: </span>
              <span>
                {s && Number(s.createdAt) > 0
                  ? new Date(Number(s.createdAt) * 1000).toLocaleDateString()
                  : "..."}
              </span>
            </div>
          </div>

          {/* Attestations table */}
          {uids.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-3 py-1.5 font-semibold">UID</th>
                    <th className="text-left px-3 py-1.5 font-semibold">Issuer</th>
                    <th className="text-left px-3 py-1.5 font-semibold">Recipient</th>
                    <th className="text-left px-3 py-1.5 font-semibold">Date</th>
                    <th className="text-left px-3 py-1.5 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {displayUids.map((aUid) => (
                    <AttestationRow key={aUid} uid={aUid} />
                  ))}
                </tbody>
              </table>
              {uids.length > 10 && (
                <div className="px-4 py-2 text-[10px] text-muted-foreground text-center border-t border-border">
                  Showing 10 of {uids.length} attestations
                </div>
              )}
            </div>
          ) : (
            <div className="px-4 py-4 text-xs text-muted-foreground text-center">
              No attestations under this schema yet.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function Explorer({ address }: { address?: `0x${string}` }) {
  const [filter, setFilter] = useState("");

  const { data: schemaCount } = useReadContract({
    address: DOTVERIFY_ADDRESS,
    abi: DOTVERIFY_ABI,
    functionName: "getSchemaCount",
    query: { enabled: !!DOTVERIFY_ADDRESS },
  });

  const { data: attestCount } = useReadContract({
    address: DOTVERIFY_ADDRESS,
    abi: DOTVERIFY_ABI,
    functionName: "attestationCount",
    query: { enabled: !!DOTVERIFY_ADDRESS },
  });

  const { data: schemaUids, isLoading } = useReadContract({
    address: DOTVERIFY_ADDRESS,
    abi: DOTVERIFY_ABI,
    functionName: "getAllSchemaUids",
    query: { enabled: !!DOTVERIFY_ADDRESS },
  });

  const uids = (schemaUids as string[]) || [];

  // Filter by address - search issued/received attestations
  const { data: filteredIssued } = useReadContract({
    address: DOTVERIFY_ADDRESS,
    abi: DOTVERIFY_ABI,
    functionName: "getIssuedAttestations",
    args: filter ? [filter as `0x${string}`] : undefined,
    query: { enabled: !!DOTVERIFY_ADDRESS && filter.length === 42 && filter.startsWith("0x") },
  });

  const { data: filteredReceived } = useReadContract({
    address: DOTVERIFY_ADDRESS,
    abi: DOTVERIFY_ABI,
    functionName: "getReceivedAttestations",
    args: filter ? [filter as `0x${string}`] : undefined,
    query: { enabled: !!DOTVERIFY_ADDRESS && filter.length === 42 && filter.startsWith("0x") },
  });

  const isAddressFilter = filter.length === 42 && filter.startsWith("0x");
  const filteredIssuedUids = (filteredIssued as string[]) || [];
  const filteredReceivedUids = (filteredReceived as string[]) || [];
  const combinedFilteredUids = [...new Set([...filteredIssuedUids, ...filteredReceivedUids])];

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="border border-border rounded-lg p-4 text-center">
          <span className="text-2xl font-bold block">
            {schemaCount !== undefined ? Number(schemaCount).toLocaleString() : "--"}
          </span>
          <span className="text-[10px] text-muted-foreground">Total Schemas</span>
        </div>
        <div className="border border-border rounded-lg p-4 text-center">
          <span className="text-2xl font-bold block">
            {attestCount !== undefined ? Number(attestCount).toLocaleString() : "--"}
          </span>
          <span className="text-[10px] text-muted-foreground">Total Attestations</span>
        </div>
      </div>

      {/* Search */}
      <div className="border border-border rounded-lg p-4">
        <label className="text-[11px] font-medium text-muted-foreground block mb-1">
          Filter by address (issuer or recipient)
        </label>
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="0x..."
          className="w-full border border-border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-[#E6007A]"
        />
      </div>

      {!DOTVERIFY_ADDRESS && (
        <p className="text-xs text-amber-600 text-center">Contract not configured.</p>
      )}

      {/* Address filter results */}
      {isAddressFilter && combinedFilteredUids.length > 0 && (
        <div className="border border-border rounded-lg overflow-hidden">
          <div className="px-4 py-2 bg-muted/30 border-b border-border">
            <h3 className="font-semibold text-sm">
              Attestations for {shorten(filter)}
              <span className="text-[10px] text-muted-foreground ml-2 font-normal">
                ({combinedFilteredUids.length} found)
              </span>
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/20">
                  <th className="text-left px-3 py-1.5 font-semibold">UID</th>
                  <th className="text-left px-3 py-1.5 font-semibold">Issuer</th>
                  <th className="text-left px-3 py-1.5 font-semibold">Recipient</th>
                  <th className="text-left px-3 py-1.5 font-semibold">Date</th>
                  <th className="text-left px-3 py-1.5 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {combinedFilteredUids.slice(0, 10).map((aUid) => (
                  <AttestationRow key={aUid} uid={aUid} />
                ))}
              </tbody>
            </table>
            {combinedFilteredUids.length > 10 && (
              <div className="px-4 py-2 text-[10px] text-muted-foreground text-center border-t border-border">
                Showing 10 of {combinedFilteredUids.length} attestations
              </div>
            )}
          </div>
        </div>
      )}

      {isAddressFilter && combinedFilteredUids.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-4">
          No attestations found for this address.
        </p>
      )}

      {/* Schema list */}
      {!isAddressFilter && (
        <>
          <div>
            <h2 className="font-semibold text-sm mb-3">
              All Schemas
              {uids.length > 0 && (
                <span className="text-muted-foreground font-normal ml-1">({uids.length})</span>
              )}
            </h2>

            {isLoading && (
              <div className="text-center py-8">
                <div className="w-6 h-6 border-2 border-[#E6007A] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">Loading schemas...</p>
              </div>
            )}

            <div className="space-y-2">
              {uids.map((uid) => (
                <SchemaCard key={uid} schemaUid={uid} />
              ))}
            </div>

            {!isLoading && uids.length === 0 && DOTVERIFY_ADDRESS && (
              <p className="text-xs text-muted-foreground text-center py-8">
                No schemas registered yet. Create one in the Schemas tab.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
