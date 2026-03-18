"use client";

import { useState } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { toHex } from "viem";
import { DOTVERIFY_ABI, DOTVERIFY_ADDRESS } from "@/config/contract";

const PARACHAINS = [
  { id: 1000, name: "Asset Hub", desc: "Polkadot's system parachain for assets" },
  { id: 2004, name: "Moonbeam", desc: "EVM-compatible parachain" },
  { id: 2006, name: "Astar", desc: "Multi-VM smart contract hub" },
  { id: 2030, name: "Bifrost", desc: "Liquid staking parachain" },
  { id: 2034, name: "HydraDX", desc: "Cross-chain liquidity protocol" },
];

export function XcmVerify() {
  const { address } = useAccount();
  const [attestationUid, setAttestationUid] = useState("");
  const [selectedParachain, setSelectedParachain] = useState<number>(1000);
  const [showDetails, setShowDetails] = useState(false);

  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  // Get the attestation status to show what we're sending
  const { data: verifyResult } = useReadContract({
    address: DOTVERIFY_ADDRESS,
    abi: DOTVERIFY_ABI,
    functionName: "verify",
    args: attestationUid ? [attestationUid as `0x${string}`] : undefined,
    query: { enabled: !!attestationUid && attestationUid.length === 66 },
  });

  // XCM weight estimation
  const { data: weightEstimate } = useReadContract({
    address: DOTVERIFY_ADDRESS,
    abi: DOTVERIFY_ABI,
    functionName: "estimateXcmWeight",
    args: [toHex(new TextEncoder().encode("verify")) as `0x${string}`],
    query: { enabled: !!DOTVERIFY_ADDRESS },
  });

  const verification = verifyResult as [boolean, { uid: string; issuer: string; recipient: string; issuedAt: bigint; revoked: boolean }] | undefined;
  const isValid = verification?.[0];
  const att = verification?.[1];

  function buildXcmDestination(parachainId: number): `0x${string}` {
    // SCALE-encoded XCM MultiLocation: { parents: 1, interior: X1(Parachain(id)) }
    // Simplified — in production this would use proper SCALE encoding
    const hex = toHex(new TextEncoder().encode(
      JSON.stringify({ parents: 1, interior: { X1: { Parachain: parachainId } } })
    ));
    return hex as `0x${string}`;
  }

  function buildXcmMessage(uid: string, valid: boolean): `0x${string}` {
    // SCALE-encoded XCM message with attestation verification result
    // In production: proper XCM Transact or ReportHolding instruction
    const payload = JSON.stringify({
      type: "PolkaProve:attestation_status",
      uid: uid,
      valid: valid,
      timestamp: Math.floor(Date.now() / 1000),
      source_chain: 420420417,
    });
    return toHex(new TextEncoder().encode(payload)) as `0x${string}`;
  }

  function handleSendXcm() {
    if (!attestationUid || !DOTVERIFY_ADDRESS) return;

    const destination = buildXcmDestination(selectedParachain);
    const message = buildXcmMessage(attestationUid, isValid || false);

    writeContract({
      address: DOTVERIFY_ADDRESS,
      abi: DOTVERIFY_ABI,
      functionName: "sendAttestationXcm",
      args: [
        attestationUid as `0x${string}`,
        destination,
        message,
      ],
    });
  }

  const para = PARACHAINS.find((p) => p.id === selectedParachain);
  const weight = weightEstimate as { refTime: bigint; proofSize: bigint } | undefined;

  return (
    <div className="space-y-6">
      <div className="border border-border rounded-lg p-4">
        <h2 className="font-semibold text-sm mb-1 flex items-center gap-2">
          <span>⇄</span>
          XCM Cross-Chain Attestation Verification
        </h2>
        <p className="text-[10px] text-muted-foreground mb-4">
          Send attestation verification status to any Polkadot parachain via XCM messaging.
          Uses IXcm precompile at 0xA0000. Destination/message encoding is simplified for demo — production
          would use proper SCALE-encoded XCM instructions.
        </p>

        <div className="space-y-3">
          {/* Attestation UID */}
          <div>
            <label className="text-[11px] font-medium text-muted-foreground block mb-1">Attestation UID</label>
            <input
              type="text"
              value={attestationUid}
              onChange={(e) => setAttestationUid(e.target.value)}
              placeholder="0x..."
              className="w-full border border-border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-[#E6007A]"
            />
          </div>

          {/* Attestation preview */}
          {att && Number(att.issuedAt) > 0 && (
            <div className={`border rounded-lg p-3 ${isValid ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}>
              <div className="flex items-center gap-2 mb-1">
                <span className={isValid ? "text-green-600" : "text-red-600"}>{isValid ? "✓" : "✗"}</span>
                <span className={`text-xs font-bold ${isValid ? "text-green-700" : "text-red-700"}`}>
                  {isValid ? "VALID" : att.revoked ? "REVOKED" : "INVALID"}
                </span>
              </div>
              <div className="text-[10px] grid grid-cols-2 gap-1">
                <div><span className="text-muted-foreground">Issuer:</span> <span className="font-mono">{att.issuer.slice(0, 8)}...{att.issuer.slice(-4)}</span></div>
                <div><span className="text-muted-foreground">Recipient:</span> <span className="font-mono">{att.recipient.slice(0, 8)}...{att.recipient.slice(-4)}</span></div>
              </div>
            </div>
          )}

          {/* Parachain selector */}
          <div>
            <label className="text-[11px] font-medium text-muted-foreground block mb-1">Destination Parachain</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {PARACHAINS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedParachain(p.id)}
                  className={`text-left border rounded-lg p-2 transition-colors text-[11px] ${
                    selectedParachain === p.id
                      ? "border-[#E6007A] bg-[#E6007A]/5"
                      : "border-border hover:bg-muted/30"
                  }`}
                >
                  <span className="font-medium">{p.name}</span>
                  <span className="block text-[9px] text-muted-foreground">{p.desc}</span>
                  <span className="block text-[9px] font-mono mt-0.5">Para ID: {p.id}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Weight estimate */}
          {weight && (
            <div className="text-[10px] text-muted-foreground bg-muted/20 rounded-lg p-2">
              <span className="font-medium">XCM Weight Estimate:</span>{" "}
              refTime: {Number(weight.refTime).toLocaleString()} | proofSize: {Number(weight.proofSize).toLocaleString()}
              <span className="block mt-0.5">Estimated via weighMessage() — PVM&apos;s 2D weight system (not single-dimensional EVM gas)</span>
            </div>
          )}

          {/* XCM message preview */}
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-[10px] text-[#E6007A] hover:underline"
          >
            {showDetails ? "Hide" : "Show"} XCM message details
          </button>

          {showDetails && attestationUid && (
            <div className="bg-muted/20 rounded-lg p-3 font-mono text-[9px] break-all">
              <p className="font-medium text-[10px] mb-1">XCM Destination:</p>
              <p className="mb-2">{`{ parents: 1, interior: X1(Parachain(${selectedParachain})) }`}</p>
              <p className="font-medium text-[10px] mb-1">XCM Payload:</p>
              <p>{`{ type: "PolkaProve:attestation_status", uid: "${attestationUid.slice(0, 18)}...", valid: ${isValid ?? "unknown"}, source_chain: 420420417 }`}</p>
              <p className="mt-2 font-medium text-[10px]">Precompile:</p>
              <p>IXcm(0xA0000).send(destination, message)</p>
            </div>
          )}

          {/* Send button */}
          <button
            onClick={handleSendXcm}
            disabled={!attestationUid || !address || isPending || isConfirming || !DOTVERIFY_ADDRESS}
            className="w-full px-4 py-2 bg-[#E6007A] text-white rounded-lg text-sm font-medium hover:bg-[#c40066] transition-colors disabled:opacity-50"
          >
            {isPending ? "Signing..." : isConfirming ? "Sending via XCM..." : `Send Verification to ${para?.name || "Parachain"}`}
          </button>

          {isSuccess && txHash && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-xs font-medium text-green-700">XCM Message Sent!</p>
              <p className="font-mono text-[10px] text-green-600 mt-1">Tx: {txHash}</p>
              <p className="text-[10px] text-green-600 mt-1">
                Attestation verification status sent to {para?.name} (Para ID: {selectedParachain}) via IXcm.send().
                The destination parachain can now verify this credential without bridges or oracles.
              </p>
            </div>
          )}

          {!address && <p className="text-xs text-amber-600">Connect wallet to send XCM messages.</p>}
        </div>
      </div>

      {/* How it works */}
      <div className="border border-border rounded-lg p-4">
        <h3 className="font-semibold text-xs mb-2">How XCM Attestation Verification Works</h3>
        <div className="text-[10px] text-muted-foreground space-y-1">
          <p>1. <strong>Check attestation</strong> — verify() confirms the credential is valid on Polkadot Hub</p>
          <p>2. <strong>Build XCM message</strong> — encode the verification result as an XCM payload</p>
          <p>3. <strong>Estimate weight</strong> — weighMessage() returns 2D weight (refTime + proofSize)</p>
          <p>4. <strong>Send via XCM</strong> — IXcm(0xA0000).send() dispatches to the destination parachain</p>
          <p>5. <strong>Remote verification</strong> — the destination parachain receives and processes the attestation status</p>
          <p className="text-[#E6007A] font-medium mt-2">XCM is Polkadot-native cross-consensus messaging. No bridges, no oracles, no trust assumptions.</p>
        </div>
      </div>
    </div>
  );
}
