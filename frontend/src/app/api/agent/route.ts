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

const SYSTEM_PROMPT = `You are PolkaProve, an AI assistant for proving Web2 facts on Polkadot Hub.

PolkaProve lets users prove data from real websites (Binance, OKX, TikTok, Legion) using zkTLS, then anchor tamper-proof fingerprints on Polkadot Hub with BLAKE2-256 hashing. Users can also mint soulbound credential NFTs from their proofs.

You have tools that query the live PolkaProve contract on Polkadot Hub Testnet:

1. **get_attestation_stats** — live on-chain schema count + attestation count
2. **explain_pvm_features** — explains PVM precompiles (BLAKE2, sr25519, XCM, callerIsOrigin)
3. **verify_attestation(uid)** — check an on-chain attestation by UID

When asked about how PolkaProve works: explain zkTLS verification → BLAKE2 anchoring → SBT minting.
When asked about stats: use get_attestation_stats.
When asked about PVM or technical details: use explain_pvm_features.

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
