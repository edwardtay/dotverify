import { encodeFunctionData, decodeFunctionResult, type Hex } from "viem";

const RPC = "https://eth-rpc-testnet.polkadot.io";
const POLKAPROVE = "0x5f7D3BF531C2DcF0d7dd791BA38dEE36Dc9A8C9E";

const ABI = [
  {
    name: "soulboundTokens",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [
      { name: "holder", type: "address" },
      { name: "anchorId", type: "bytes32" },
      { name: "credentialType", type: "string" },
      { name: "mintedAt", type: "uint256" },
    ],
  },
] as const;

const COLORS: Record<string, [string, string]> = {
  kyc: ["#10B981", "#0D9488"],
  trader: ["#F59E0B", "#EA580C"],
  investor: ["#8B5CF6", "#4F46E5"],
  identity: ["#3B82F6", "#1D4ED8"],
  social: ["#EC4899", "#DB2777"],
};

function getColors(type: string): [string, string] {
  return COLORS[type] || ["#E6007A", "#7B2FBE"];
}

function generateSVG(tokenId: number, credType: string, holder: string): string {
  const [c1, c2] = getColors(credType);
  const short = `${holder.slice(0, 6)}...${holder.slice(-4)}`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 500">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
<stop offset="0%" stop-color="${c1}"/><stop offset="100%" stop-color="${c2}"/>
</linearGradient></defs>
<rect width="400" height="500" rx="24" fill="url(#g)"/>
<circle cx="340" cy="60" r="80" fill="white" opacity="0.05"/>
<circle cx="60" cy="440" r="120" fill="white" opacity="0.03"/>
<text x="30" y="45" fill="white" font-family="monospace" font-size="16" font-weight="bold" opacity="0.9">PolkaProve</text>
<text x="370" y="45" fill="white" font-family="monospace" font-size="10" text-anchor="end" opacity="0.6">SOULBOUND</text>
<line x1="30" y1="60" x2="370" y2="60" stroke="white" stroke-opacity="0.15"/>
<text x="200" y="200" fill="white" font-family="sans-serif" font-size="56" font-weight="bold" text-anchor="middle">${credType.toUpperCase()}</text>
<text x="200" y="240" fill="white" font-family="monospace" font-size="14" text-anchor="middle" opacity="0.7">#${tokenId}</text>
<rect x="150" y="260" width="100" height="1" fill="white" opacity="0.2"/>
<text x="200" y="290" fill="white" font-family="monospace" font-size="11" text-anchor="middle" opacity="0.5">zkTLS Verified</text>
<line x1="30" y1="420" x2="370" y2="420" stroke="white" stroke-opacity="0.15"/>
<text x="30" y="448" fill="white" font-family="monospace" font-size="11" opacity="0.5">${short}</text>
<text x="370" y="448" fill="white" font-family="monospace" font-size="11" text-anchor="end" opacity="0.5">Polkadot Hub</text>
<text x="200" y="480" fill="white" font-family="monospace" font-size="9" text-anchor="middle" opacity="0.3">polkaprove.vercel.app</text>
</svg>`;
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tokenId = parseInt(id);

  try {
    const data = encodeFunctionData({ abi: ABI, functionName: "soulboundTokens", args: [BigInt(tokenId)] });
    const res = await fetch(RPC, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_call", params: [{ to: POLKAPROVE, data }, "latest"] }),
    });
    const json = await res.json();

    const result = decodeFunctionResult({ abi: ABI, functionName: "soulboundTokens", data: json.result as Hex }) as unknown as [string, string, string, bigint];
    const [holder, , credType, mintedAt] = result;

    if (holder === "0x0000000000000000000000000000000000000000") {
      return Response.json({ error: "Token not found" }, { status: 404 });
    }

    const svg = generateSVG(tokenId, credType, holder);
    const svgBase64 = Buffer.from(svg).toString("base64");

    const metadata = {
      name: `PolkaProve #${tokenId} — ${credType.toUpperCase()}`,
      description: `Soulbound credential verified by zkTLS on Polkadot Hub. Type: ${credType}. Non-transferable.`,
      image: `data:image/svg+xml;base64,${svgBase64}`,
      attributes: [
        { trait_type: "Credential", value: credType },
        { trait_type: "Chain", value: "Polkadot Hub" },
        { trait_type: "Verification", value: "zkTLS (Primus)" },
        { trait_type: "Transferable", value: "No (Soulbound)" },
      ],
    };

    return Response.json(metadata, {
      headers: { "Cache-Control": "public, max-age=3600" },
    });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
