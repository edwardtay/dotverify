import { encodeFunctionData, decodeFunctionResult, type Hex } from "viem";

const RPC = "https://eth-rpc-testnet.polkadot.io";
const POLKAPROVE = process.env.NEXT_PUBLIC_DOTVERIFY_ADDRESS || "0x5f7D3BF531C2DcF0d7dd791BA38dEE36Dc9A8C9E";

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

const ICONS: Record<string, string> = {
  kyc: "M200 140 L220 170 L260 130 M180 160 Q180 200 200 220 Q220 200 220 160",
  trader: "M140 220 L170 160 L200 190 L230 140 L260 180",
  investor: "M200 130 L230 190 L170 190 Z M185 200 L215 200 L215 230 L185 230 Z",
  identity: "M200 150 Q220 150 220 170 Q220 190 200 190 Q180 190 180 170 Q180 150 200 150 M160 230 Q160 210 200 210 Q240 210 240 230",
  social: "M200 140 A30 30 0 1 1 200 200 A30 30 0 1 1 200 140 M150 170 A50 50 0 0 0 250 170",
};

function generateSVG(tokenId: number, credType: string, holder: string): string {
  const [c1, c2] = getColors(credType);
  const short = `${holder.slice(0, 6)}...${holder.slice(-4)}`;
  const icon = ICONS[credType] || ICONS.identity;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 500">
<defs>
  <linearGradient id="bg" x1="0" y1="0" x2="0.3" y2="1">
    <stop offset="0%" stop-color="${c1}"/>
    <stop offset="100%" stop-color="${c2}"/>
  </linearGradient>
  <radialGradient id="glow" cx="0.7" cy="0.2" r="0.6">
    <stop offset="0%" stop-color="white" stop-opacity="0.12"/>
    <stop offset="100%" stop-color="white" stop-opacity="0"/>
  </radialGradient>
  <filter id="shadow">
    <feDropShadow dx="0" dy="2" stdDeviation="6" flood-color="black" flood-opacity="0.3"/>
  </filter>
  <clipPath id="card"><rect width="400" height="500" rx="28"/></clipPath>
</defs>

<!-- Background -->
<rect width="400" height="500" rx="28" fill="url(#bg)"/>
<rect width="400" height="500" rx="28" fill="url(#glow)" clip-path="url(#card)"/>

<!-- Decorative circles -->
<circle cx="360" cy="40" r="120" fill="white" opacity="0.04"/>
<circle cx="40" cy="460" r="160" fill="white" opacity="0.03"/>
<circle cx="300" cy="400" r="60" fill="white" opacity="0.02"/>

<!-- Polkadot dots pattern -->
<circle cx="50" cy="100" r="3" fill="white" opacity="0.08"/>
<circle cx="80" cy="85" r="2" fill="white" opacity="0.06"/>
<circle cx="65" cy="120" r="2.5" fill="white" opacity="0.07"/>
<circle cx="320" cy="350" r="3" fill="white" opacity="0.06"/>
<circle cx="350" cy="370" r="2" fill="white" opacity="0.05"/>
<circle cx="335" cy="330" r="2.5" fill="white" opacity="0.07"/>

<!-- Header -->
<text x="32" y="44" fill="white" font-family="'Helvetica Neue',Arial,sans-serif" font-size="15" font-weight="700" letter-spacing="0.5" opacity="0.95">PolkaProve</text>

<!-- Soulbound badge -->
<rect x="280" y="26" width="90" height="22" rx="11" fill="white" opacity="0.15"/>
<text x="325" y="41" fill="white" font-family="'Helvetica Neue',Arial,sans-serif" font-size="8" font-weight="600" text-anchor="middle" letter-spacing="1.5" opacity="0.9">SOULBOUND</text>

<!-- Divider -->
<line x1="32" y1="62" x2="368" y2="62" stroke="white" stroke-opacity="0.12" stroke-width="0.5"/>

<!-- Central icon -->
<g filter="url(#shadow)" opacity="0.9">
  <circle cx="200" cy="175" r="55" fill="white" opacity="0.1"/>
  <path d="${icon}" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
</g>

<!-- Credential type -->
<text x="200" y="275" fill="white" font-family="'Helvetica Neue',Arial,sans-serif" font-size="42" font-weight="800" text-anchor="middle" letter-spacing="3">${credType.toUpperCase()}</text>

<!-- Token ID pill -->
<rect x="165" y="290" width="70" height="24" rx="12" fill="white" opacity="0.12"/>
<text x="200" y="306" fill="white" font-family="monospace" font-size="11" text-anchor="middle" font-weight="600" opacity="0.8"># ${tokenId}</text>

<!-- Verification badge -->
<rect x="140" y="330" width="120" height="26" rx="13" fill="white" opacity="0.08"/>
<circle cx="158" cy="343" r="5" fill="#4ADE80" opacity="0.9"/>
<text x="210" y="347" fill="white" font-family="'Helvetica Neue',Arial,sans-serif" font-size="9" text-anchor="middle" font-weight="500" opacity="0.7" letter-spacing="0.5">VERIFIED</text>

<!-- Bottom divider -->
<line x1="32" y1="420" x2="368" y2="420" stroke="white" stroke-opacity="0.1" stroke-width="0.5"/>

<!-- Footer -->
<text x="32" y="448" fill="white" font-family="monospace" font-size="10" opacity="0.45">${short}</text>
<text x="368" y="448" fill="white" font-family="monospace" font-size="10" text-anchor="end" opacity="0.45">Polkadot Hub</text>

<!-- Chain icon dots -->
<circle cx="340" cy="470" r="2.5" fill="white" opacity="0.2"/>
<circle cx="350" cy="470" r="2.5" fill="white" opacity="0.15"/>
<circle cx="360" cy="470" r="2.5" fill="white" opacity="0.1"/>

<text x="200" y="484" fill="white" font-family="'Helvetica Neue',Arial,sans-serif" font-size="8" text-anchor="middle" opacity="0.2" letter-spacing="2">POLKAPROVE.VERCEL.APP</text>
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
      description: `Soulbound credential on Polkadot Hub. Type: ${credType}. Non-transferable.`,
      image: `data:image/svg+xml;base64,${svgBase64}`,
      attributes: [
        { trait_type: "Credential", value: credType },
        { trait_type: "Chain", value: "Polkadot Hub" },
        { trait_type: "Verification", value: "On-chain anchored" },
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
