"use client";

import { useState, useCallback } from "react";
import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { toHex } from "viem";
import { DOTVERIFY_ABI, DOTVERIFY_ADDRESS } from "@/config/contract";

interface ParsedRow {
  recipient: string;
  fields: Record<string, string>;
}

export function BatchAttestation({ address }: { address?: `0x${string}` }) {
  const [schemaUid, setSchemaUid] = useState("");
  const [csvInput, setCsvInput] = useState("");
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [parseError, setParseError] = useState("");
  const [expiresAt, setExpiresAt] = useState("");

  const { writeContract, data: txHash, isPending, error: writeError } = useWriteContract();
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

  const schema = selectedSchema as { name: string; definition: string; revocable: boolean } | undefined;

  const fields = schema?.definition
    ? schema.definition.split(",").map((f) => {
        const [name, type] = f.split(":");
        return { name: name.trim(), type: type?.trim() || "string" };
      })
    : [];

  const handleParse = useCallback(() => {
    setParseError("");
    setParsedRows([]);

    const lines = csvInput.trim().split("\n").filter((l) => l.trim());
    if (lines.length < 2) {
      setParseError("CSV must have a header row and at least one data row.");
      return;
    }

    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
    const recipientIdx = headers.indexOf("recipient");
    if (recipientIdx === -1) {
      setParseError("CSV must have a 'recipient' column with 0x addresses.");
      return;
    }

    const dataHeaders = headers.filter((h) => h !== "recipient");
    const rows: ParsedRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",").map((v) => v.trim());
      if (values.length !== headers.length) {
        setParseError(`Row ${i + 1} has ${values.length} columns, expected ${headers.length}.`);
        return;
      }

      const recipient = values[recipientIdx];
      if (!recipient.startsWith("0x") || recipient.length !== 42) {
        setParseError(`Row ${i + 1}: invalid recipient address "${recipient}".`);
        return;
      }

      const fieldData: Record<string, string> = {};
      headers.forEach((h, idx) => {
        if (h !== "recipient") {
          fieldData[h] = values[idx];
        }
      });

      rows.push({ recipient, fields: fieldData });
    }

    setParsedRows(rows);
  }, [csvInput]);

  function handleIssueAll() {
    if (!schemaUid || parsedRows.length === 0 || !DOTVERIFY_ADDRESS) return;

    const expiry = expiresAt
      ? BigInt(Math.floor(new Date(expiresAt).getTime() / 1000))
      : BigInt(0);

    const zeroRef = "0x0000000000000000000000000000000000000000000000000000000000000000" as `0x${string}`;

    const requests = parsedRows.map((row) => {
      const dataStr = JSON.stringify(row.fields);
      const data = toHex(new TextEncoder().encode(dataStr));
      return {
        schemaUid: schemaUid as `0x${string}`,
        recipient: row.recipient as `0x${string}`,
        data,
        expiresAt: expiry,
        refUid: zeroRef,
      };
    });

    writeContract({
      address: DOTVERIFY_ADDRESS,
      abi: DOTVERIFY_ABI,
      functionName: "multiAttest",
      args: [requests],
    });
  }

  const statusText = isPending
    ? `Signing batch of ${parsedRows.length} attestations...`
    : isConfirming
    ? `Confirming ${parsedRows.length} attestations on-chain...`
    : "";

  return (
    <div className="space-y-6">
      <div className="border border-border rounded-lg p-4">
        <h2 className="font-semibold text-sm mb-3">Batch Issue Attestations</h2>

        {!address && (
          <p className="text-xs text-amber-600 mb-3">Connect your wallet to issue batch attestations.</p>
        )}

        <div className="space-y-3">
          {/* Schema selector */}
          <div>
            <label className="text-[11px] font-medium text-muted-foreground block mb-1">Schema</label>
            <select
              value={schemaUid}
              onChange={(e) => {
                setSchemaUid(e.target.value);
                setParsedRows([]);
              }}
              className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#E6007A]"
            >
              <option value="">Select a schema...</option>
              {schemaUids &&
                (schemaUids as `0x${string}`[]).map((uid) => (
                  <option key={uid} value={uid}>
                    {uid.slice(0, 18)}...
                  </option>
                ))}
            </select>
            {schema && (
              <p className="text-[10px] text-muted-foreground mt-1">
                {schema.name} &mdash; {schema.revocable ? "Revocable" : "Permanent"}
                {fields.length > 0 && (
                  <span className="font-mono"> ({fields.map((f) => f.name).join(", ")})</span>
                )}
              </p>
            )}
          </div>

          {/* CSV Input */}
          <div>
            <label className="text-[11px] font-medium text-muted-foreground block mb-1">
              CSV Data (first column must be &ldquo;recipient&rdquo;)
            </label>
            <textarea
              value={csvInput}
              onChange={(e) => {
                setCsvInput(e.target.value);
                setParsedRows([]);
                setParseError("");
              }}
              placeholder={`recipient,name,email,verified\n0xABC...1234,Alice,alice@test.com,true\n0xDEF...5678,Bob,bob@test.com,false`}
              rows={6}
              className="w-full border border-border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-[#E6007A]"
            />
          </div>

          {/* Expiration */}
          <div>
            <label className="text-[11px] font-medium text-muted-foreground block mb-1">
              Expiration for all (optional)
            </label>
            <input
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#E6007A]"
            />
          </div>

          {/* Parse button */}
          <button
            onClick={handleParse}
            disabled={!csvInput.trim() || !schemaUid}
            className="px-4 py-2 border border-[#E6007A] text-[#E6007A] rounded-lg text-sm font-medium hover:bg-[#E6007A]/5 transition-colors disabled:opacity-50"
          >
            Parse &amp; Preview
          </button>

          {parseError && (
            <p className="text-xs text-red-600">{parseError}</p>
          )}
        </div>
      </div>

      {/* Preview Table */}
      {parsedRows.length > 0 && (
        <div className="border border-border rounded-lg p-4">
          <h2 className="font-semibold text-sm mb-3">
            Preview ({parsedRows.length} attestation{parsedRows.length > 1 ? "s" : ""})
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-2 text-[11px] font-medium text-muted-foreground">#</th>
                  <th className="text-left py-2 px-2 text-[11px] font-medium text-muted-foreground">Recipient</th>
                  {Object.keys(parsedRows[0].fields).map((key) => (
                    <th key={key} className="text-left py-2 px-2 text-[11px] font-medium text-muted-foreground">{key}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {parsedRows.map((row, i) => (
                  <tr key={i} className="border-b border-border/50">
                    <td className="py-1.5 px-2 text-muted-foreground">{i + 1}</td>
                    <td className="py-1.5 px-2 font-mono">{row.recipient.slice(0, 8)}...{row.recipient.slice(-4)}</td>
                    {Object.values(row.fields).map((val, j) => (
                      <td key={j} className="py-1.5 px-2">{val}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-3 space-y-2">
            <button
              onClick={handleIssueAll}
              disabled={isPending || isConfirming || !address || !DOTVERIFY_ADDRESS}
              className="px-4 py-2 bg-[#E6007A] text-white rounded-lg text-sm font-medium hover:bg-[#c40066] transition-colors disabled:opacity-50"
            >
              {isPending || isConfirming
                ? statusText
                : `Issue All (${parsedRows.length} attestation${parsedRows.length > 1 ? "s" : ""})`}
            </button>

            {isSuccess && txHash && (
              <div className="text-xs text-green-600 space-y-1">
                <p>All {parsedRows.length} attestations issued successfully!</p>
                <p className="font-mono text-[10px]">Tx: {txHash.slice(0, 18)}...{txHash.slice(-4)}</p>
              </div>
            )}

            {writeError && (
              <p className="text-xs text-red-600">
                Error: {writeError.message.slice(0, 120)}
                {writeError.message.length > 120 ? "..." : ""}
              </p>
            )}

            {!DOTVERIFY_ADDRESS && (
              <p className="text-xs text-amber-600">Contract not configured.</p>
            )}
          </div>
        </div>
      )}

      {/* CSV Templates */}
      <div className="border border-border rounded-lg p-4">
        <h2 className="font-semibold text-sm mb-3">CSV Templates</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {[
            {
              label: "Basic Identity",
              csv: "recipient,name,email,verified\n0x0000000000000000000000000000000000000001,Alice,alice@example.com,true\n0x0000000000000000000000000000000000000002,Bob,bob@example.com,false",
            },
            {
              label: "Academic Diploma",
              csv: "recipient,name,institution,degree,graduationDate,gpa\n0x0000000000000000000000000000000000000001,Alice Smith,MIT,Computer Science,1717200000,3.9\n0x0000000000000000000000000000000000000002,Bob Jones,Stanford,Physics,1717200000,3.7",
            },
          ].map((t) => (
            <button
              key={t.label}
              onClick={() => {
                setCsvInput(t.csv);
                setParsedRows([]);
                setParseError("");
              }}
              className="text-left border border-border rounded-lg p-3 hover:bg-muted/30 transition-colors"
            >
              <p className="font-medium text-xs">{t.label}</p>
              <p className="text-[10px] text-muted-foreground font-mono mt-1 whitespace-pre-line">{t.csv.split("\n")[0]}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
