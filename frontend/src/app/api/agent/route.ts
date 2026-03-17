import { tools as rawTools, handleToolCall } from "./tools";

const PROVIDERS = [
  {
    name: "OpenRouter",
    url: "https://openrouter.ai/api/v1/chat/completions",
    model: "anthropic/claude-sonnet-4",
    key: () => process.env.OPENROUTER_API_KEY,
    supportsTools: true,
  },
  {
    name: "Groq",
    url: "https://api.groq.com/openai/v1/chat/completions",
    model: "llama-3.3-70b-versatile",
    key: () => process.env.GROQ_API_KEY,
    supportsTools: true,
  },
  {
    name: "Cerebras",
    url: "https://api.cerebras.ai/v1/chat/completions",
    model: "llama3.1-8b",
    key: () => process.env.CEREBRAS_API_KEY,
    supportsTools: false,
  },
];

const SYSTEM_PROMPT = `You are DotVerify, an AI assistant for on-chain credential verification on Polkadot Hub.

You help users create attestation schemas, issue verifiable credentials, verify attestations, and understand PVM-native features.

You have 7 tools — all on-chain tools perform REAL eth_call queries to the live DotVerify contract:

1. **verify_attestation(uid)** — real on-chain verify() call. Returns actual issuer, recipient, schema, timestamps, revocation status, decoded data
2. **get_attestation_stats** — real on-chain getSchemaCount() + attestationCount(). Returns live numbers
3. **list_schemas** — real on-chain getAllSchemaUids() + getSchema() for each. Returns all registered schemas with names, definitions, creators
4. **get_user_attestations(address)** — real on-chain getReceivedAttestations() + getIssuedAttestations(). Returns all attestations for an address with verification status
5. **explain_pvm_features** — explains 6 PVM precompile features impossible on standard EVM
6. **suggest_schema(use_case)** — suggests schema definitions for common use cases
7. **analyze_document(text)** — extracts fields from document text for attestation creation

When a user asks about their attestations or any address: use get_user_attestations with their address.
When a user asks to verify a credential: use verify_attestation with the UID.
When a user asks about schemas: use list_schemas to show what exists on-chain.
When a user asks about stats or protocol state: use get_attestation_stats.
When a user asks about creating schemas: use suggest_schema, explain revocable vs permanent.
When asked about PVM features or what makes this special: use explain_pvm_features.

Issuance modes:
- **Standard (attest)**: basic attestation with BLAKE2-256 UID
- **Secure (attestSecure)**: uses PVM callerIsOrigin() to block proxy attacks
- **Delegated (attestDelegated)**: issue on behalf of another issuer who authorized you
- **sr25519 (attestWithSr25519)**: Substrate wallets authorize via sr25519 signature, verified on-chain by PVM precompile (EVM wallet relays tx, replay protected via BLAKE2)

Keep responses concise with bullet points. Use **bold** for key numbers and status.`;

const openaiTools = rawTools.map((t) => ({
  type: "function" as const,
  function: {
    name: t.name,
    description: t.description,
    parameters: t.input_schema,
  },
}));

type OAIMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: { id: string; type: "function"; function: { name: string; arguments: string } }[];
  tool_call_id?: string;
};

async function chatCompletion(messages: OAIMessage[], stream: boolean) {
  let lastError: Error | null = null;

  for (const provider of PROVIDERS) {
    const apiKey = provider.key();
    if (!apiKey) continue;

    try {
      const body: Record<string, unknown> = {
        model: provider.model,
        messages,
        stream,
        max_tokens: 1024,
      };

      if (provider.supportsTools) {
        body.tools = openaiTools;
      }

      const res = await fetch(provider.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(30000),
      });

      if (!res.ok) {
        const text = await res.text();
        lastError = new Error(`${provider.name} error ${res.status}: ${text.slice(0, 200)}`);
        continue;
      }

      return { res, provider };
    } catch (err) {
      lastError = err as Error;
      continue;
    }
  }

  throw lastError || new Error("No AI provider available. Set OPENROUTER_API_KEY, GROQ_API_KEY, or CEREBRAS_API_KEY.");
}

export async function POST(req: Request) {
  const { message } = await req.json();

  const messages: OAIMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: message },
  ];

  const encoder = new TextEncoder();
  const readableStream = new ReadableStream({
    async start(controller) {
      try {
        let continueLoop = true;
        let iterations = 0;

        while (continueLoop && iterations < 10) {
          iterations++;

          const { res, provider } = await chatCompletion(messages, false);
          const data = await res.json();
          const choice = data.choices?.[0];
          const assistantMsg = choice?.message;

          if (!assistantMsg) {
            continueLoop = false;
            break;
          }

          if (
            provider.supportsTools &&
            assistantMsg.tool_calls &&
            assistantMsg.tool_calls.length > 0
          ) {
            messages.push({
              role: "assistant",
              content: assistantMsg.content,
              tool_calls: assistantMsg.tool_calls,
            });

            for (const tc of assistantMsg.tool_calls) {
              const args = JSON.parse(tc.function.arguments);
              const result = await handleToolCall(tc.function.name, args);
              messages.push({
                role: "tool",
                content: result,
                tool_call_id: tc.id,
              });
            }

            if (assistantMsg.content) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: "text", text: assistantMsg.content })}\n\n`)
              );
            }
          } else {
            if (assistantMsg.content) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: "text", text: assistantMsg.content })}\n\n`)
              );
            }
            continueLoop = false;
          }
        }

        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`));
        controller.close();
      } catch (err) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: "error", error: String(err) })}\n\n`)
        );
        controller.close();
      }
    },
  });

  return new Response(readableStream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
