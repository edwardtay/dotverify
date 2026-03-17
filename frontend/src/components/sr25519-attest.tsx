"use client";

import { useState } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useChainId } from "wagmi";
import { toHex, encodePacked, type Hex } from "viem";
import { usePolkadotWallet } from "@/hooks/use-polkadot-wallet";
import { DOTVERIFY_ABI, DOTVERIFY_ADDRESS } from "@/config/contract";

export function Sr25519Attest() {
  const { address: evmAddress } = useAccount();
  const chainId = useChainId();
  const { selectedAccount, signRaw, connect } = usePolkadotWallet();

  const [schemaUid, setSchemaUid] = useState("");
  const [recipient, setRecipient] = useState("");
  const [dataFields, setDataFields] = useState<Record<string, string>>({});
  const [signedData, setSignedData] = useState<{ signature: string; pubKeyHex: string } | null>(null);
  const [step, setStep] = useState<"configure" | "sign" | "submit" | "done">("configure");

  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  const { data: schemaUids } = useReadContract({
    address: DOTVERIFY_ADDRESS,
    abi: DOTVERIFY_ABI,
    functionName: "getAllSchemaUids",
  });

  const { data: selectedSchema } = useReadContract({
    address: DOTVERIFY_ADDRESS,
    abi: DOTVERIFY_ABI,
    functionName: "getSchema",
    args: schemaUid ? [schemaUid as `0x${string}`] : undefined,
    query: { enabled: !!schemaUid },
  });

  const schema = selectedSchema as { name: string; definition: string } | undefined;

  const fields = schema?.definition
    ? schema.definition.split(",").map((f) => {
        const [name, type] = f.split(":");
        return { name: name.trim(), type: type?.trim() || "string" };
      })
    : [];

  async function handleSign() {
    if (!selectedAccount || !schemaUid || !recipient || !evmAddress) return;

    const dataStr = JSON.stringify(dataFields);
    const dataHex = toHex(new TextEncoder().encode(dataStr));

    // Construct the message that the contract expects:
    // abi.encodePacked("DotVerify:attest:", block.chainid, msg.sender, schemaUid, recipient, data, expiresAt)
    const message = [
      "DotVerify:attest:",
      chainId.toString(),
      evmAddress.toLowerCase(),
      schemaUid,
      recipient.toLowerCase(),
      dataHex,
      "0", // expiresAt
    ].join("");

    // Convert to hex for signRaw
    const messageHex = toHex(new TextEncoder().encode(message));

    const result = await signRaw(messageHex);
    if (!result) return;

    // The signature from polkadot.js is 0x-prefixed hex, 130 chars (65 bytes with 0x01 prefix for sr25519)
    // We need the raw 64-byte signature
    let sigHex = result.signature;
    if (sigHex.startsWith("0x")) sigHex = sigHex.slice(2);
    // sr25519 sigs from polkadot-js are 64 bytes (128 hex chars), sometimes with a 0x01 prefix byte
    if (sigHex.length === 130) sigHex = sigHex.slice(2); // remove prefix byte

    // Get the public key from the SS58 address
    // For now, we pass the address as-is and the contract converts via decodeAddress
    // The contract expects a bytes32 public key — SS58 decode gives us this
    const { decodeAddress } = await import("@polkadot/util-crypto");
    const pubKeyBytes = decodeAddress(selectedAccount.address);
    const pubKeyHex = "0x" + Buffer.from(pubKeyBytes).toString("hex");

    setSignedData({ signature: "0x" + sigHex, pubKeyHex });
    setStep("submit");
  }

  function handleSubmit() {
    if (!signedData || !DOTVERIFY_ADDRESS || !evmAddress) return;

    const dataStr = JSON.stringify(dataFields);
    const dataHex = toHex(new TextEncoder().encode(dataStr));

    // Convert signature to uint8[64] array
    const sigBytes = signedData.signature.startsWith("0x")
      ? signedData.signature.slice(2)
      : signedData.signature;

    // Pack into fixed-size array
    const sig: number[] = [];
    for (let i = 0; i < 128; i += 2) {
      sig.push(parseInt(sigBytes.slice(i, i + 2), 16));
    }

    writeContract({
      address: DOTVERIFY_ADDRESS,
      abi: DOTVERIFY_ABI,
      functionName: "attestWithSr25519",
      args: [
        sig as unknown as readonly [number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number],
        signedData.pubKeyHex as `0x${string}`,
        schemaUid as `0x${string}`,
        recipient as `0x${string}`,
        dataHex as `0x${string}`,
        BigInt(0),
      ],
    });
    setStep("done");
  }

  return (
    <div className="space-y-6">
      <div className="border border-[#E6007A]/30 rounded-lg p-4 bg-[#E6007A]/5">
        <h2 className="font-semibold text-sm mb-1 flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#E6007A]" />
          sr25519 Attestation (PVM-Exclusive)
        </h2>
        <p className="text-[10px] text-muted-foreground mb-3">
          Issue attestations using your Polkadot wallet&apos;s native sr25519 signature.
          The contract verifies the signature on-chain via the ISystem precompile at 0x900.
          This is <strong>impossible on any standard EVM chain</strong>.
        </p>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-4 text-[10px]">
          {["1. Configure", "2. Sign (sr25519)", "3. Submit (EVM)"].map((s, i) => {
            const stepIdx = i === 0 ? "configure" : i === 1 ? "sign" : "submit";
            const active = step === stepIdx || (step === "done" && i === 2);
            return (
              <span key={s} className={`px-2 py-1 rounded ${active ? "bg-[#E6007A] text-white" : "bg-muted/50"}`}>
                {s}
              </span>
            );
          })}
        </div>

        {/* Wallet status */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="border border-border rounded-lg p-2">
            <p className="text-[10px] text-muted-foreground">Polkadot Wallet (sr25519 signer)</p>
            {selectedAccount ? (
              <p className="font-mono text-[11px]">{selectedAccount.name || selectedAccount.address.slice(0, 12) + "..."}</p>
            ) : (
              <button onClick={connect} className="text-[11px] text-[#E6007A] hover:underline">Connect Polkadot wallet</button>
            )}
          </div>
          <div className="border border-border rounded-lg p-2">
            <p className="text-[10px] text-muted-foreground">EVM Wallet (tx relayer)</p>
            {evmAddress ? (
              <p className="font-mono text-[11px]">{evmAddress.slice(0, 8)}...{evmAddress.slice(-4)}</p>
            ) : (
              <p className="text-[11px] text-amber-600">Connect MetaMask</p>
            )}
          </div>
        </div>

        {/* Form */}
        <div className="space-y-3">
          <div>
            <label className="text-[11px] font-medium text-muted-foreground block mb-1">Schema</label>
            <select
              value={schemaUid}
              onChange={(e) => { setSchemaUid(e.target.value); setDataFields({}); }}
              className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#E6007A]"
            >
              <option value="">Select a schema...</option>
              {schemaUids && (schemaUids as `0x${string}`[]).map((uid) => (
                <option key={uid} value={uid}>{uid.slice(0, 18)}...</option>
              ))}
            </select>
            {schema && <p className="text-[10px] text-muted-foreground mt-1">{schema.name}</p>}
          </div>

          <div>
            <label className="text-[11px] font-medium text-muted-foreground block mb-1">Recipient</label>
            <input
              type="text"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="0x..."
              className="w-full border border-border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-[#E6007A]"
            />
          </div>

          {fields.map((f) => (
            <div key={f.name}>
              <label className="text-[10px] text-muted-foreground">{f.name} ({f.type})</label>
              <input
                type="text"
                value={dataFields[f.name] || ""}
                onChange={(e) => setDataFields({ ...dataFields, [f.name]: e.target.value })}
                placeholder={f.name}
                className="w-full border border-border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#E6007A]"
              />
            </div>
          ))}

          {/* Action buttons based on step */}
          {step === "configure" && (
            <button
              onClick={() => setStep("sign")}
              disabled={!schemaUid || !recipient || !selectedAccount || !evmAddress}
              className="w-full px-4 py-2 bg-[#E6007A] text-white rounded-lg text-sm font-medium hover:bg-[#c40066] transition-colors disabled:opacity-50"
            >
              Next: Sign with Polkadot Wallet
            </button>
          )}

          {step === "sign" && (
            <div className="space-y-2">
              <p className="text-[10px] text-muted-foreground">
                Your Polkadot wallet will prompt you to sign the attestation message with sr25519.
                This signature will be verified on-chain by the PVM&apos;s sr25519Verify precompile.
              </p>
              <button
                onClick={handleSign}
                className="w-full px-4 py-2 bg-[#E6007A] text-white rounded-lg text-sm font-medium hover:bg-[#c40066] transition-colors"
              >
                Sign with sr25519
              </button>
            </div>
          )}

          {step === "submit" && signedData && (
            <div className="space-y-2">
              <div className="bg-green-50 border border-green-200 rounded-lg p-2">
                <p className="text-[10px] font-medium text-green-700">sr25519 signature obtained</p>
                <p className="font-mono text-[9px] text-green-600 break-all">{signedData.signature.slice(0, 40)}...</p>
                <p className="font-mono text-[9px] text-green-600">pubKey: {signedData.pubKeyHex.slice(0, 20)}...</p>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Now submit the EVM transaction. The contract will call sr25519Verify() on-chain
                to verify your Polkadot wallet signature, then issue the attestation.
              </p>
              <button
                onClick={handleSubmit}
                disabled={isPending || isConfirming}
                className="w-full px-4 py-2 bg-[#E6007A] text-white rounded-lg text-sm font-medium hover:bg-[#c40066] transition-colors disabled:opacity-50"
              >
                {isPending ? "Signing EVM tx..." : isConfirming ? "Confirming..." : "Submit to Chain (attestWithSr25519)"}
              </button>
            </div>
          )}

          {isSuccess && txHash && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-xs font-medium text-green-700">sr25519 Attestation Issued!</p>
              <p className="font-mono text-[10px] text-green-600 mt-1">Tx: {txHash}</p>
              <p className="text-[10px] text-green-600 mt-1">
                The on-chain sr25519Verify precompile confirmed your Polkadot wallet signature.
                Replay protection enforced via BLAKE2 signature hashing.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* How it works */}
      <div className="border border-border rounded-lg p-4">
        <h3 className="font-semibold text-xs mb-2">How sr25519 Attestation Works</h3>
        <div className="text-[10px] text-muted-foreground space-y-1">
          <p>1. <strong>Configure</strong> — choose schema, recipient, fill data fields</p>
          <p>2. <strong>Sign (sr25519)</strong> — Polkadot wallet signs the attestation message using native sr25519 (Schnorr/Ristretto)</p>
          <p>3. <strong>Submit (EVM)</strong> — MetaMask relays the tx to the contract, which calls <code>ISystem(0x900).sr25519Verify()</code> to verify the signature on-chain</p>
          <p>4. <strong>Replay protection</strong> — signature hash stored via <code>BLAKE2-256</code> to prevent reuse</p>
          <p className="text-[#E6007A] font-medium mt-2">This entire flow is impossible on Ethereum, Arbitrum, Optimism, or any standard EVM chain.</p>
        </div>
      </div>
    </div>
  );
}
