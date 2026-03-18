import { PrimusCoreTLS } from "@primuslabs/zktls-core-sdk";

const APP_ID = "0x9a43076c1d32233039e37a3c70956876b153049d";
const APP_SECRET = "0x47360d9b08d4a558c2026faf7a4c80c9ba16743f1674ecfc65b8a57b57225c9a";

export async function POST(req: Request) {
  try {
    const { userAddress, request, responseResolves } = await req.json();

    if (!userAddress) {
      return Response.json({ error: "Missing userAddress" }, { status: 400 });
    }

    const primus = new PrimusCoreTLS();
    await primus.init(APP_ID, APP_SECRET);

    // Use generateRequestParams to create proper AttRequest
    const attRequest = primus.generateRequestParams(request, responseResolves, userAddress);

    const result = await primus.startAttestation(attRequest, 120000);

    return Response.json({ success: true, attestation: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: message }, { status: 500 });
  }
}
