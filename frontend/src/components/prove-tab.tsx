"use client";

import { useState, useCallback, useEffect } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { toHex } from "viem";
import { DOTVERIFY_ABI, DOTVERIFY_ADDRESS } from "@/config/contract";
import { ZkTlsProve } from "./zktls-prove";

const BLOCKSCOUT_API = "https://blockscout-testnet.polkadot.io/api/v2";

type FetchProofType = "balance" | "tokens" | "transactions" | "contracts";
type ProofFlow = "idle" | "fetching" | "preview" | "anchoring" | "success" | "error";

interface FetchedProof {
  type: FetchProofType;
  label: string;
  rawData: Record<string, unknown>;
  summary: string;
  detail: string;
}

const PROOF_TYPES: { id: FetchProofType; icon: string; label: string; description: string }[] = [
  { id: "balance", icon: "\u{1FA99}", label: "Native Balance", description: "PAS balance on Polkadot Hub Testnet" },
  { id: "tokens", icon: "\u{1FA99}", label: "Token Balances", description: "ERC-20 / PSP-22 token holdings" },
  { id: "transactions", icon: "\u{1F4CA}", label: "Transaction History", description: "Proves on-chain activity" },
  { id: "contracts", icon: "\u{1F517}", label: "Contract Interactions", description: "Internal txns & contract calls" },
];

function formatWei(wei: string): string {
  try {
    const val = BigInt(wei);
    const whole = val / BigInt(10 ** 18);
    const frac = val % BigInt(10 ** 18);
    const fracStr = frac.toString().padStart(18, "0").slice(0, 2);
    return `${whole.toLocaleString()}.${fracStr}`;
  } catch {
    return "0";
  }
}

export function ProveTab() {
  const { address } = useAccount();
  const [selectedProof, setSelectedProof] = useState<FetchProofType | null>(null);
  const [flow, setFlow] = useState<ProofFlow>("idle");
  const [fetchedProof, setFetchedProof] = useState<FetchedProof | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [lastTxHash, setLastTxHash] = useState<string | null>(null);
  const [customData, setCustomData] = useState("");
  const [customExpanded, setCustomExpanded] = useState(false);

  // Contract calls
  const {
    writeContract,
    data: txHash,
    isPending,
    reset: resetTx,
  } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  // Trustless on-chain proof states
  const [onchainType, setOnchainType] = useState<"balance" | "fullState" | null>(null);

  // ---------- Fetch real data from Blockscout ----------

  const fetchProofData = useCallback(
    async (type: FetchProofType) => {
      if (!address) return;
      setSelectedProof(type);
      setFlow("fetching");
      setErrorMsg("");
      setFetchedProof(null);
      resetTx();

      try {
        let rawData: Record<string, unknown> = {};
        let summary = "";
        let detail = "";

        if (type === "balance") {
          const res = await fetch(`${BLOCKSCOUT_API}/addresses/${address}`);
          if (!res.ok) throw new Error(`API returned ${res.status}`);
          const data = await res.json();
          const bal = data.coin_balance || "0";
          const formatted = formatWei(bal);
          const rate = data.exchange_rate ? parseFloat(data.exchange_rate) : null;
          rawData = { coin_balance: bal, exchange_rate: data.exchange_rate, address };
          summary = `Balance: ${formatted} PAS`;
          detail = rate ? `${formatted} PAS (~$${(parseFloat(formatted.replace(/,/g, "")) * rate).toFixed(2)} USD)` : `${formatted} PAS (Polkadot Hub Testnet)`;
        } else if (type === "tokens") {
          const res = await fetch(`${BLOCKSCOUT_API}/addresses/${address}/tokens`);
          if (!res.ok) throw new Error(`API returned ${res.status}`);
          const data = await res.json();
          const items = data.items || [];
          rawData = { token_count: items.length, tokens: items.slice(0, 10) };
          if (items.length === 0) {
            summary = "No token balances found";
            detail = "This address holds no ERC-20/PSP-22 tokens on Polkadot Hub Testnet.";
          } else {
            const lines = items.slice(0, 5).map((item: { token: { symbol: string; name: string }; value: string }) => {
              const sym = item.token?.symbol || "???";
              const name = item.token?.name || "Unknown";
              const val = item.value ? formatWei(item.value) : "0";
              return `${val} ${sym} (${name})`;
            });
            summary = `${items.length} token(s) found`;
            detail = lines.join("\n");
          }
        } else if (type === "transactions") {
          const res = await fetch(`${BLOCKSCOUT_API}/addresses/${address}/transactions`);
          if (!res.ok) throw new Error(`API returned ${res.status}`);
          const data = await res.json();
          const items = data.items || [];
          rawData = { tx_count: items.length, transactions: items.slice(0, 10) };
          if (items.length === 0) {
            summary = "No transactions found";
            detail = "No on-chain activity yet.";
          } else {
            const lines = items.slice(0, 5).map((tx: { hash: string; timestamp: string; value: string; method: string }) => {
              const date = tx.timestamp ? new Date(tx.timestamp).toLocaleDateString() : "?";
              const val = tx.value ? formatWei(tx.value) : "0";
              return `${date} | ${tx.method || "transfer"} | ${val} PAS | ${tx.hash?.slice(0, 10)}...`;
            });
            summary = `${items.length} transaction(s)`;
            detail = lines.join("\n");
          }
        } else if (type === "contracts") {
          const res = await fetch(`${BLOCKSCOUT_API}/addresses/${address}/internal-transactions`);
          if (!res.ok) throw new Error(`API returned ${res.status}`);
          const data = await res.json();
          const items = data.items || [];
          rawData = { internal_tx_count: items.length, internal_transactions: items.slice(0, 10) };
          if (items.length === 0) {
            summary = "No contract interactions";
            detail = "No internal transactions found for this address.";
          } else {
            const lines = items.slice(0, 5).map((tx: { type: string; timestamp: string; value: string; to: { hash: string } }) => {
              const date = tx.timestamp ? new Date(tx.timestamp).toLocaleDateString() : "?";
              const val = tx.value ? formatWei(tx.value) : "0";
              return `${date} | ${tx.type || "call"} | ${val} PAS | to: ${tx.to?.hash?.slice(0, 10) || "?"}...`;
            });
            summary = `${items.length} internal txn(s)`;
            detail = lines.join("\n");
          }
        }

        const label = PROOF_TYPES.find((p) => p.id === type)?.label || type;
        setFetchedProof({ type, label, rawData, summary, detail });
        setFlow("preview");
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : "Failed to fetch data");
        setFlow("error");
      }
    },
    [address, resetTx],
  );

  // ---------- Anchor fetched data on-chain ----------

  function handleAnchorFetched() {
    if (!DOTVERIFY_ADDRESS || !fetchedProof) return;
    setFlow("anchoring");
    const payload = JSON.stringify({
      type: fetchedProof.type,
      label: fetchedProof.label,
      data: fetchedProof.rawData,
      prover: address,
      timestamp: Math.floor(Date.now() / 1000),
    });
    writeContract({
      address: DOTVERIFY_ADDRESS,
      abi: DOTVERIFY_ABI,
      functionName: "anchorOffchain",
      args: [toHex(new TextEncoder().encode(payload)) as `0x${string}`],
    });
  }

  // ---------- Anchor custom data on-chain ----------

  function handleAnchorCustom() {
    if (!DOTVERIFY_ADDRESS || !customData) return;
    const payload = JSON.stringify({
      type: "custom",
      data: customData,
      prover: address,
      timestamp: Math.floor(Date.now() / 1000),
    });
    writeContract({
      address: DOTVERIFY_ADDRESS,
      abi: DOTVERIFY_ABI,
      functionName: "anchorOffchain",
      args: [toHex(new TextEncoder().encode(payload)) as `0x${string}`],
    });
  }

  // ---------- Trustless on-chain proofs ----------

  function handleProveBalance() {
    if (!DOTVERIFY_ADDRESS) return;
    setOnchainType("balance");
    writeContract({ address: DOTVERIFY_ADDRESS, abi: DOTVERIFY_ABI, functionName: "proveBalance" });
  }

  function handleProveFullState() {
    if (!DOTVERIFY_ADDRESS) return;
    setOnchainType("fullState");
    writeContract({ address: DOTVERIFY_ADDRESS, abi: DOTVERIFY_ABI, functionName: "proveFullState" });
  }

  // ---------- Save to localStorage on success ----------

  useEffect(() => {
    if (isSuccess && txHash && txHash !== lastTxHash && address) {
      setLastTxHash(txHash);
      if (flow === "anchoring" && fetchedProof) {
        setFlow("success");
      }
      try {
        const key = `polkaprove-proofs-${address}`;
        const existing = JSON.parse(localStorage.getItem(key) || "[]");
        let summary = "";
        if (fetchedProof && flow === "anchoring") {
          summary = `${fetchedProof.label}: ${fetchedProof.summary}`;
        } else if (onchainType === "balance") {
          summary = "On-chain balance proof (trustless)";
        } else if (onchainType === "fullState") {
          summary = "Full PVM state proof (trustless)";
        } else {
          summary = "Custom data anchor";
        }
        existing.push({
          type: fetchedProof?.type || onchainType || "custom",
          txHash,
          timestamp: Date.now(),
          summary,
        });
        localStorage.setItem(key, JSON.stringify(existing));
      } catch {
        // localStorage errors are non-fatal
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuccess, txHash]);

  // ---------- Render ----------

  return (
    <div className="space-y-6">
      {!address && (
        <div className="border border-amber-200 bg-amber-50 rounded-xl p-4 text-center">
          <p className="text-sm text-amber-700">Connect your wallet to create proofs.</p>
        </div>
      )}

      {/* SECTION 0: zkTLS Verified Proofs */}
      <ZkTlsProve />

      {/* SECTION 1: Auto-Fetch Polkadot Data */}
      <div>
        <h2 className="text-sm font-bold mb-1">Prove Polkadot Hub Data</h2>
        <p className="text-[10px] text-muted-foreground mb-4">
          Fetch real data from Blockscout, preview it, then anchor a tamper-proof BLAKE2 hash on-chain.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
          {PROOF_TYPES.map((p) => (
            <button
              key={p.id}
              disabled={!address}
              onClick={() => fetchProofData(p.id)}
              className={`border rounded-xl p-3 text-center transition-all disabled:opacity-40 ${
                selectedProof === p.id
                  ? "border-[#E6007A] bg-[#E6007A]/5"
                  : "border-border hover:border-[#E6007A]/30"
              }`}
            >
              <span className="text-lg block mb-1">{p.icon}</span>
              <span className="text-[10px] font-medium block">{p.label}</span>
              <span className="text-[9px] text-muted-foreground">{p.description}</span>
            </button>
          ))}
        </div>

        {/* Fetching spinner */}
        {flow === "fetching" && (
          <div className="border border-border rounded-xl p-6 text-center">
            <div className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-[#E6007A] border-t-transparent mb-2" />
            <p className="text-sm text-muted-foreground">Fetching from Polkadot Hub...</p>
          </div>
        )}

        {/* Error */}
        {flow === "error" && (
          <div className="border border-red-200 bg-red-50 rounded-xl p-4">
            <p className="text-sm font-medium text-red-700 mb-1">Failed to fetch data</p>
            <p className="text-[10px] text-red-600 font-mono">{errorMsg}</p>
            <button
              onClick={() => { setFlow("idle"); setSelectedProof(null); }}
              className="mt-2 text-xs text-red-700 underline"
            >
              Try again
            </button>
          </div>
        )}

        {/* Preview fetched data */}
        {(flow === "preview" || flow === "anchoring") && fetchedProof && (
          <div className="border border-[#E6007A]/30 bg-[#E6007A]/5 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold">{fetchedProof.label}</p>
                <p className="text-[11px] text-muted-foreground">{fetchedProof.summary}</p>
              </div>
              <span className="text-[9px] font-mono text-muted-foreground bg-white/60 px-2 py-0.5 rounded">
                LIVE DATA
              </span>
            </div>

            <pre className="text-[10px] font-mono bg-white/80 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap max-h-40 overflow-y-auto border border-border">
              {fetchedProof.detail}
            </pre>

            <button
              onClick={handleAnchorFetched}
              disabled={isPending || isConfirming}
              className="w-full px-4 py-2.5 bg-[#E6007A] text-white rounded-lg text-sm font-medium hover:bg-[#c40066] transition-colors disabled:opacity-50"
            >
              {isPending ? "Sign in Wallet..." : isConfirming ? "Anchoring on-chain..." : "Anchor This Proof"}
            </button>

            <button
              onClick={() => { setFlow("idle"); setSelectedProof(null); setFetchedProof(null); resetTx(); }}
              className="w-full text-xs text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Success */}
        {flow === "success" && txHash && fetchedProof && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <p className="text-sm font-medium text-green-700 mb-1">Proof anchored!</p>
            <p className="text-[10px] text-green-600 mb-1">{fetchedProof.label}: {fetchedProof.summary}</p>
            <p className="font-mono text-[10px] text-green-600">Tx: {txHash}</p>
            <p className="text-[10px] text-green-600 mt-1">
              BLAKE2-256 fingerprint stored on Polkadot Hub. Check My Proofs tab to share.
            </p>
            <button
              onClick={() => { setFlow("idle"); setSelectedProof(null); setFetchedProof(null); resetTx(); }}
              className="mt-2 text-xs text-green-700 underline"
            >
              Create another proof
            </button>
          </div>
        )}
      </div>

      {/* SECTION 2: Trustless On-Chain Proofs */}
      <div className="border-t border-border pt-6">
        <h2 className="text-sm font-bold mb-1">Trustless On-Chain Proofs</h2>
        <p className="text-[10px] text-muted-foreground mb-3">
          The contract reads your on-chain state directly — no user input, fully verifiable.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            onClick={handleProveBalance}
            disabled={!address || isPending || isConfirming}
            className="text-left border border-border rounded-xl p-4 hover:border-[#E6007A]/30 transition-all disabled:opacity-50"
          >
            <span className="font-medium text-xs">Balance Proof</span>
            <p className="text-[10px] text-muted-foreground mt-1">Contract reads msg.sender.balance + Substrate AccountId</p>
          </button>
          <button
            onClick={handleProveFullState}
            disabled={!address || isPending || isConfirming}
            className="text-left border border-border rounded-xl p-4 hover:border-[#E6007A]/30 transition-all disabled:opacity-50"
          >
            <span className="font-medium text-xs">Full PVM State</span>
            <p className="text-[10px] text-muted-foreground mt-1">Balance + existential deposit + weight + code hash</p>
          </button>
        </div>

        {/* On-chain proof success (when not in fetched-proof flow) */}
        {isSuccess && txHash && flow !== "success" && flow !== "anchoring" && !fetchedProof && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mt-3">
            <p className="text-sm font-medium text-green-700 mb-1">
              {onchainType === "balance" ? "Balance proof" : "Full state proof"} created!
            </p>
            <p className="font-mono text-[10px] text-green-600">Tx: {txHash}</p>
          </div>
        )}
      </div>

      {/* SECTION 3: Custom Data (collapsed by default) */}
      <div className="border-t border-border pt-4">
        <button
          onClick={() => setCustomExpanded(!customExpanded)}
          className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <span className={`transition-transform ${customExpanded ? "rotate-90" : ""}`}>&#9654;</span>
          <span className="font-medium">Custom Data Anchor</span>
          <span className="text-[9px]">(paste arbitrary data)</span>
        </button>

        {customExpanded && (
          <div className="mt-3 space-y-3">
            <textarea
              value={customData}
              onChange={(e) => setCustomData(e.target.value)}
              placeholder="Paste any JSON or text data to anchor on-chain..."
              rows={3}
              className="w-full border border-border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-[#E6007A]"
            />
            <button
              onClick={handleAnchorCustom}
              disabled={!address || !customData || isPending || isConfirming}
              className="w-full px-4 py-2 bg-[#E6007A] text-white rounded-lg text-xs font-medium hover:bg-[#c40066] transition-colors disabled:opacity-50"
            >
              {isPending ? "Signing..." : isConfirming ? "Anchoring..." : "Anchor Custom Data"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
