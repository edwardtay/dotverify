import { encodeFunctionData, decodeFunctionResult, type Hex } from "viem";
import { DOTVERIFY_ABI } from "@/config/contract";
import type { ToolDef } from "./types";

const RPC_URL = "https://eth-rpc-testnet.polkadot.io";
const CONTRACT =
  process.env.NEXT_PUBLIC_DOTVERIFY_ADDRESS ||
  "0xC3B8399Cd69EC199eD663Ee281d2094dbA48EF7d";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function ethCall(data: string): Promise<string> {
  const res = await fetch(RPC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "eth_call",
      params: [{ to: CONTRACT, data }, "latest"],
    }),
  });
  const json = await res.json();
  if (json.error) throw new Error(json.error.message ?? JSON.stringify(json.error));
  return json.result || "0x";
}

function shortAddr(addr: string): string {
  if (!addr || addr === "0x0000000000000000000000000000000000000000") return "0x0...0 (none)";
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function shortBytes32(b: string): string {
  if (!b || b === "0x" + "0".repeat(64)) return "(none)";
  return `${b.slice(0, 10)}...${b.slice(-6)}`;
}

function tsToDate(ts: bigint): string {
  if (ts === 0n) return "never";
  return new Date(Number(ts) * 1000).toUTCString();
}

function tryDecodeDataAsText(hex: string): string {
  if (!hex || hex === "0x") return "(empty)";
  try {
    // Try to decode as UTF-8 text after stripping the 0x prefix
    const bytes = Buffer.from(hex.replace("0x", ""), "hex");
    // Check if it looks like ABI-encoded string (starts with offset + length)
    // A single ABI-encoded string: 0x + 32-byte offset + 32-byte length + data
    if (bytes.length >= 64) {
      const offset = parseInt(hex.slice(2, 66), 16);
      if (offset === 32 && bytes.length >= 96) {
        const len = parseInt(hex.slice(66, 130), 16);
        if (len > 0 && len <= bytes.length - 64) {
          const text = bytes.subarray(64, 64 + len).toString("utf-8");
          if (/^[\x20-\x7E\n\r\t]+$/.test(text)) return text;
        }
      }
    }
    // Otherwise try raw UTF-8
    const raw = bytes.toString("utf-8").replace(/\0/g, "").trim();
    if (raw.length > 0 && /^[\x20-\x7E\n\r\t]+$/.test(raw)) return raw;
    // Fallback: show hex abbreviated
    return hex.length > 42 ? `${hex.slice(0, 20)}...${hex.slice(-8)} (${(hex.length - 2) / 2} bytes)` : hex;
  } catch {
    return hex.length > 42 ? `${hex.slice(0, 20)}...${hex.slice(-8)}` : hex;
  }
}

// ---------------------------------------------------------------------------
// On-chain call wrappers
// ---------------------------------------------------------------------------

async function callVerify(uid: Hex) {
  const data = encodeFunctionData({ abi: DOTVERIFY_ABI, functionName: "verify", args: [uid] });
  const raw = await ethCall(data);
  const result = decodeFunctionResult({ abi: DOTVERIFY_ABI, functionName: "verify", data: raw as Hex });
  return result as unknown as [boolean, {
    uid: Hex; schemaUid: Hex; issuer: Hex; recipient: Hex;
    data: Hex; issuedAt: bigint; expiresAt: bigint; revoked: boolean; refUid: Hex;
  }];
}

async function callGetSchemaCount(): Promise<bigint> {
  const data = encodeFunctionData({ abi: DOTVERIFY_ABI, functionName: "getSchemaCount" });
  const raw = await ethCall(data);
  return decodeFunctionResult({ abi: DOTVERIFY_ABI, functionName: "getSchemaCount", data: raw as Hex }) as bigint;
}

async function callAttestationCount(): Promise<bigint> {
  const data = encodeFunctionData({ abi: DOTVERIFY_ABI, functionName: "attestationCount" });
  const raw = await ethCall(data);
  return decodeFunctionResult({ abi: DOTVERIFY_ABI, functionName: "attestationCount", data: raw as Hex }) as bigint;
}

async function callGetAllSchemaUids(): Promise<readonly Hex[]> {
  const data = encodeFunctionData({ abi: DOTVERIFY_ABI, functionName: "getAllSchemaUids" });
  const raw = await ethCall(data);
  return decodeFunctionResult({ abi: DOTVERIFY_ABI, functionName: "getAllSchemaUids", data: raw as Hex }) as readonly Hex[];
}

async function callGetSchema(uid: Hex) {
  const data = encodeFunctionData({ abi: DOTVERIFY_ABI, functionName: "getSchema", args: [uid] });
  const raw = await ethCall(data);
  return decodeFunctionResult({ abi: DOTVERIFY_ABI, functionName: "getSchema", data: raw as Hex }) as unknown as {
    uid: Hex; creator: Hex; name: string; definition: string; revocable: boolean; createdAt: bigint;
  };
}

async function callGetReceivedAttestations(address: Hex): Promise<readonly Hex[]> {
  const data = encodeFunctionData({ abi: DOTVERIFY_ABI, functionName: "getReceivedAttestations", args: [address] });
  const raw = await ethCall(data);
  return decodeFunctionResult({ abi: DOTVERIFY_ABI, functionName: "getReceivedAttestations", data: raw as Hex }) as readonly Hex[];
}

async function callGetIssuedAttestations(address: Hex): Promise<readonly Hex[]> {
  const data = encodeFunctionData({ abi: DOTVERIFY_ABI, functionName: "getIssuedAttestations", args: [address] });
  const raw = await ethCall(data);
  return decodeFunctionResult({ abi: DOTVERIFY_ABI, functionName: "getIssuedAttestations", data: raw as Hex }) as readonly Hex[];
}

// ---------------------------------------------------------------------------
// Tool definitions
// ---------------------------------------------------------------------------

export const definitions: ToolDef[] = [
  {
    name: "verify_attestation",
    description:
      "Verify an on-chain attestation by its UID. Performs a real contract call and returns issuer, recipient, schema, timestamps, revoked status, and decoded data.",
    input_schema: {
      type: "object",
      properties: {
        uid: { type: "string", description: "The bytes32 attestation UID to verify (hex string)" },
      },
      required: ["uid"],
    },
  },
  {
    name: "get_attestation_stats",
    description:
      "Get real-time on-chain statistics about the DotVerify protocol — number of registered schemas and total attestations.",
    input_schema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "list_schemas",
    description:
      "List all registered attestation schemas on-chain with their names, definitions, creators, and creation dates.",
    input_schema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "get_user_attestations",
    description:
      "Get all attestations received and issued by a given Ethereum address. Verifies each attestation and returns full details including validity and revocation status.",
    input_schema: {
      type: "object",
      properties: {
        address: {
          type: "string",
          description: "The Ethereum address to look up (0x...)",
        },
      },
      required: ["address"],
    },
  },
  {
    name: "explain_pvm_features",
    description:
      "Explain how DotVerify uses PVM precompiles that are impossible on standard EVM chains.",
    input_schema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "suggest_schema",
    description:
      "Suggest an attestation schema definition for a given use case (e.g., education, employment, identity).",
    input_schema: {
      type: "object",
      properties: {
        use_case: {
          type: "string",
          description:
            "The use case for the schema, e.g. 'academic diploma', 'job certification', 'identity verification'",
        },
      },
      required: ["use_case"],
    },
  },
  {
    name: "analyze_document",
    description:
      "Analyze a document or text to extract fields that could be turned into an on-chain attestation.",
    input_schema: {
      type: "object",
      properties: {
        text: { type: "string", description: "The document text to analyze" },
      },
      required: ["text"],
    },
  },
];

// ---------------------------------------------------------------------------
// Tool execution
// ---------------------------------------------------------------------------

export async function execute(
  name: string,
  input: Record<string, unknown>,
): Promise<string> {
  switch (name) {
    // ------------------------------------------------------------------
    // verify_attestation — real on-chain verify(bytes32)
    // ------------------------------------------------------------------
    case "verify_attestation": {
      const uid = input.uid as string;
      if (!uid) return "Error: uid is required.";
      try {
        const uidHex = (uid.startsWith("0x") ? uid : `0x${uid}`) as Hex;
        const [valid, a] = await callVerify(uidHex);

        const statusLabel = a.revoked
          ? "REVOKED"
          : a.expiresAt > 0n && a.expiresAt < BigInt(Math.floor(Date.now() / 1000))
            ? "EXPIRED"
            : valid
              ? "VALID"
              : "INVALID";

        const decodedData = tryDecodeDataAsText(a.data);

        return [
          `## Attestation Verification`,
          ``,
          `| Field | Value |`,
          `|-------|-------|`,
          `| **Status** | ${statusLabel} |`,
          `| **UID** | \`${shortBytes32(a.uid)}\` |`,
          `| **Schema** | \`${shortBytes32(a.schemaUid)}\` |`,
          `| **Issuer** | \`${shortAddr(a.issuer)}\` |`,
          `| **Recipient** | \`${shortAddr(a.recipient)}\` |`,
          `| **Issued At** | ${tsToDate(a.issuedAt)} |`,
          `| **Expires At** | ${tsToDate(a.expiresAt)} |`,
          `| **Revoked** | ${a.revoked ? "Yes" : "No"} |`,
          `| **Ref UID** | \`${shortBytes32(a.refUid)}\` |`,
          `| **Data** | ${decodedData} |`,
          ``,
          `*Contract: \`${shortAddr(CONTRACT)}\` on Polkadot Hub Testnet*`,
        ].join("\n");
      } catch (err) {
        return `Error verifying attestation \`${uid}\`: ${err instanceof Error ? err.message : String(err)}`;
      }
    }

    // ------------------------------------------------------------------
    // get_attestation_stats — real on-chain getSchemaCount + attestationCount
    // ------------------------------------------------------------------
    case "get_attestation_stats": {
      try {
        const [schemaCount, attCount] = await Promise.all([
          callGetSchemaCount(),
          callAttestationCount(),
        ]);

        return [
          `## DotVerify Protocol Stats`,
          ``,
          `| Metric | Value |`,
          `|--------|-------|`,
          `| **Contract** | \`${shortAddr(CONTRACT)}\` |`,
          `| **Chain** | Polkadot Hub Testnet (420420417) |`,
          `| **Total Schemas** | ${schemaCount.toString()} |`,
          `| **Total Attestations** | ${attCount.toString()} |`,
          ``,
          `*Queried live from RPC: ${RPC_URL}*`,
        ].join("\n");
      } catch (err) {
        return `Error querying stats: ${err instanceof Error ? err.message : String(err)}`;
      }
    }

    // ------------------------------------------------------------------
    // list_schemas — real on-chain getAllSchemaUids + getSchema for each
    // ------------------------------------------------------------------
    case "list_schemas": {
      try {
        const uids = await callGetAllSchemaUids();

        if (uids.length === 0) {
          return "No schemas registered on-chain yet.";
        }

        const schemas = await Promise.all(uids.map((uid) => callGetSchema(uid)));

        const lines = [
          `## Registered Schemas (${schemas.length})`,
          ``,
        ];

        for (const s of schemas) {
          lines.push(
            `### ${s.name || "(unnamed)"}`,
            `- **UID**: \`${shortBytes32(s.uid)}\``,
            `- **Definition**: \`${s.definition}\``,
            `- **Creator**: \`${shortAddr(s.creator)}\``,
            `- **Revocable**: ${s.revocable ? "Yes" : "No"}`,
            `- **Created At**: ${tsToDate(s.createdAt)}`,
            ``,
          );
        }

        lines.push(`*Contract: \`${shortAddr(CONTRACT)}\` on Polkadot Hub Testnet*`);
        return lines.join("\n");
      } catch (err) {
        return `Error listing schemas: ${err instanceof Error ? err.message : String(err)}`;
      }
    }

    // ------------------------------------------------------------------
    // get_user_attestations — real on-chain received + issued
    // ------------------------------------------------------------------
    case "get_user_attestations": {
      const address = input.address as string;
      if (!address) return "Error: address is required.";
      try {
        const addrHex = address as Hex;

        const [receivedUids, issuedUids] = await Promise.all([
          callGetReceivedAttestations(addrHex),
          callGetIssuedAttestations(addrHex),
        ]);

        const lines = [
          `## Attestations for \`${shortAddr(address)}\``,
          ``,
        ];

        // Received
        lines.push(`### Received (${receivedUids.length})`);
        if (receivedUids.length === 0) {
          lines.push("_No attestations received._", "");
        } else {
          for (const uid of receivedUids) {
            try {
              const [valid, a] = await callVerify(uid);
              const status = a.revoked
                ? "REVOKED"
                : a.expiresAt > 0n && a.expiresAt < BigInt(Math.floor(Date.now() / 1000))
                  ? "EXPIRED"
                  : valid
                    ? "VALID"
                    : "INVALID";
              lines.push(
                `- \`${shortBytes32(uid)}\` — **${status}** | from \`${shortAddr(a.issuer)}\` | issued ${tsToDate(a.issuedAt)}`,
              );
            } catch {
              lines.push(`- \`${shortBytes32(uid)}\` — _failed to verify_`);
            }
          }
          lines.push("");
        }

        // Issued
        lines.push(`### Issued (${issuedUids.length})`);
        if (issuedUids.length === 0) {
          lines.push("_No attestations issued._", "");
        } else {
          for (const uid of issuedUids) {
            try {
              const [valid, a] = await callVerify(uid);
              const status = a.revoked
                ? "REVOKED"
                : a.expiresAt > 0n && a.expiresAt < BigInt(Math.floor(Date.now() / 1000))
                  ? "EXPIRED"
                  : valid
                    ? "VALID"
                    : "INVALID";
              lines.push(
                `- \`${shortBytes32(uid)}\` — **${status}** | to \`${shortAddr(a.recipient)}\` | issued ${tsToDate(a.issuedAt)}`,
              );
            } catch {
              lines.push(`- \`${shortBytes32(uid)}\` — _failed to verify_`);
            }
          }
          lines.push("");
        }

        lines.push(`*Contract: \`${shortAddr(CONTRACT)}\` on Polkadot Hub Testnet*`);
        return lines.join("\n");
      } catch (err) {
        return `Error querying attestations for ${address}: ${err instanceof Error ? err.message : String(err)}`;
      }
    }

    // ------------------------------------------------------------------
    // explain_pvm_features — static (no on-chain needed)
    // ------------------------------------------------------------------
    case "explain_pvm_features": {
      return `DotVerify uses 6 PVM-exclusive precompiles that are IMPOSSIBLE on standard EVM:

1. **BLAKE2-256 Attestation Hashing** (ISystem 0x900)
   All attestation and schema UIDs use Polkadot-native BLAKE2-256 instead of keccak256. This ensures compatibility with Substrate's native hashing and provides attestation integrity verification.

2. **sr25519 Issuer Authentication** (ISystem 0x900)
   Substrate wallet users (Polkadot.js, Talisman, SubWallet) can authorize attestations using their native sr25519 (Schnorr/Ristretto) signatures via attestWithSr25519(). The sr25519 signature is verified on-chain by the PVM precompile, while an EVM wallet relays the transaction. Replay attack prevention via BLAKE2 signature hashing.

3. **XCM Cross-Chain Attestation Queries** (IXcm 0xA0000)
   Attestation status can be sent to any Polkadot parachain via XCM. A credential issued on Hub can be verified on Moonbeam, Astar, or any other parachain without bridges.

4. **ecdsaToEthAddress Identity Resolution** (ISystem 0x900)
   Convert ECDSA public keys to Ethereum addresses for cross-ecosystem issuer identity mapping. Bridges the EVM/Substrate divide.

5. **callerIsOrigin Anti-Proxy Protection** (ISystem 0x900)
   attestSecure() uses callerIsOrigin() to block proxy/relay/meta-tx attacks on credential issuance. Only direct transaction signers can issue secure attestations.

6. **2D Weight Metering** (ISystem 0x900)
   PVM exposes both refTime (computation) and proofSize (storage proof) independently. This is fundamentally different from EVM's single-dimensional gas model.

None of these exist on Ethereum, Arbitrum, Optimism, Base, or any standard EVM L2.`;
    }

    // ------------------------------------------------------------------
    // suggest_schema — AI-powered (no on-chain needed)
    // ------------------------------------------------------------------
    case "suggest_schema": {
      const useCase = (input.use_case as string).toLowerCase();
      const suggestions: Record<
        string,
        { name: string; definition: string; revocable: boolean }
      > = {
        diploma: {
          name: "AcademicDiploma",
          definition:
            "name:string,institution:string,degree:string,graduationDate:uint256,gpa:string",
          revocable: false,
        },
        education: {
          name: "AcademicDiploma",
          definition:
            "name:string,institution:string,degree:string,graduationDate:uint256,gpa:string",
          revocable: false,
        },
        employment: {
          name: "EmploymentRecord",
          definition:
            "employee:string,company:string,role:string,startDate:uint256,endDate:uint256",
          revocable: true,
        },
        job: {
          name: "EmploymentRecord",
          definition:
            "employee:string,company:string,role:string,startDate:uint256,endDate:uint256",
          revocable: true,
        },
        identity: {
          name: "BasicIdentity",
          definition: "name:string,email:string,country:string,verified:bool",
          revocable: true,
        },
        kyc: {
          name: "KYCVerification",
          definition:
            "name:string,documentType:string,documentHash:bytes32,verifiedAt:uint256,verifier:string",
          revocable: true,
        },
        certification: {
          name: "ProfessionalCert",
          definition:
            "name:string,certName:string,issuerOrg:string,issueDate:uint256,expiryDate:uint256,level:string",
          revocable: true,
        },
        audit: {
          name: "SecurityAudit",
          definition:
            "contractAddress:address,auditor:string,findings:string,severity:string,auditDate:uint256,passed:bool",
          revocable: false,
        },
        membership: {
          name: "DAOMembership",
          definition:
            "member:string,daoName:string,role:string,joinDate:uint256,votingPower:uint256",
          revocable: true,
        },
      };

      const match = Object.entries(suggestions).find(([key]) =>
        useCase.includes(key),
      );
      if (match) {
        const [, s] = match;
        return `Suggested schema for "${input.use_case}":\n\n- **Name**: ${s.name}\n- **Definition**: ${s.definition}\n- **Revocable**: ${s.revocable}\n\nYou can create this schema in the Schemas tab.`;
      }

      return `For "${input.use_case}", I'd suggest a schema like:\n\n- **Name**: Custom${useCase.charAt(0).toUpperCase() + useCase.slice(1)}\n- **Definition**: name:string,description:string,issuedAt:uint256,metadata:string\n- **Revocable**: true\n\nCustomize the fields based on your specific needs.`;
    }

    // ------------------------------------------------------------------
    // analyze_document — AI-powered (no on-chain needed)
    // ------------------------------------------------------------------
    case "analyze_document": {
      const text = input.text as string;
      const fields: string[] = [];

      if (/name|full\s*name/i.test(text)) fields.push("name:string");
      if (/email/i.test(text)) fields.push("email:string");
      if (/university|college|institution|school/i.test(text))
        fields.push("institution:string");
      if (/degree|diploma|certificate/i.test(text))
        fields.push("degree:string");
      if (/date|issued|graduated/i.test(text)) fields.push("date:uint256");
      if (/company|employer|organization/i.test(text))
        fields.push("company:string");
      if (/role|position|title/i.test(text)) fields.push("role:string");
      if (/address/i.test(text)) fields.push("address:string");
      if (/score|grade|gpa/i.test(text)) fields.push("score:string");
      if (/valid|verified|certified/i.test(text))
        fields.push("verified:bool");

      if (fields.length === 0) {
        fields.push("subject:string", "content:string", "issuedAt:uint256");
      }

      return `Document Analysis:\n\nExtracted fields from the provided text:\n${fields.map((f) => `- ${f}`).join("\n")}\n\nSuggested schema definition:\n\`${fields.join(",")}\`\n\nYou can use this definition to create a schema in the Schemas tab, then issue an attestation with the extracted data.`;
    }

    default:
      return `Unknown tool: ${name}`;
  }
}
