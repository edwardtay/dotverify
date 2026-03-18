"use client";

import { useState, useRef, useEffect } from "react";
import { useAgent } from "@/hooks/use-agent";

const QUICK_QUERIES = [
  "List available schemas",
  "How does BLAKE2 attestation hashing work?",
  "Help me create a schema for diplomas",
  "What PVM features does PolkaProve use?",
];

export function AiChat({ address }: { address?: `0x${string}` }) {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const { messages, isLoading, send } = useAgent();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  function handleSend(text?: string) {
    const msg = text || input;
    if (!msg.trim()) return;

    const contextMsg = address
      ? `[Connected wallet: ${address}]\n\n${msg}`
      : msg;

    send(contextMsg);
    setInput("");
  }

  return (
    <div className="border border-border rounded-lg flex flex-col" style={{ height: "70vh" }}>
      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <p className="text-lg font-bold mb-2">PolkaProve AI</p>
            <p className="text-xs text-muted-foreground mb-6">
              Ask about attestation schemas, credential verification, or PVM features.
            </p>
            <div className="grid grid-cols-2 gap-2 max-w-md mx-auto">
              {QUICK_QUERIES.map((q) => (
                <button
                  key={q}
                  onClick={() => handleSend(q)}
                  className="text-left text-[11px] border border-border rounded-lg p-2.5 hover:bg-muted/30 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                msg.role === "user"
                  ? "bg-[#E6007A] text-white"
                  : "bg-muted/30 border border-border"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-muted/30 border border-border rounded-lg px-3 py-2 text-sm">
              <span className="animate-pulse">Thinking...</span>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-border p-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder="Ask about attestations..."
            className="flex-1 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#E6007A]"
          />
          <button
            onClick={() => handleSend()}
            disabled={isLoading || !input.trim()}
            className="px-4 py-2 bg-[#E6007A] text-white rounded-lg text-sm font-medium hover:bg-[#c40066] transition-colors disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
