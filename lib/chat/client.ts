// SSE client for POST /api/chat (spec section 9.2). Connects to the streaming
// endpoint, parses `evidence`, `token`, `done`, `status`, and `error` events,
// and dispatches them to typed callbacks. The caller (ConversationView) manages
// local state; this module has no React dependency.

import type { EvidencePackage } from "@/lib/evidence/types";
import type { ResearchBrief } from "@/lib/ai/prompts";

export interface ChatStreamCallbacks {
  onEvidence?: (pkg: EvidencePackage) => void;
  onToken?: (delta: string) => void;
  onDone?: (payload: { messageId: string; warnings: string[]; brief: ResearchBrief | null }) => void;
  onError?: (payload: { code: string; message: string }) => void;
  onStatus?: (payload: { phase: string; message: string }) => void;
}

export interface ChatStreamOptions {
  conversationId: string;
  rToken?: string;
  message: string;
  signal?: AbortSignal;
}

export async function streamChat(
  options: ChatStreamOptions,
  callbacks: ChatStreamCallbacks,
): Promise<void> {
  const { conversationId, rToken, message, signal } = options;

  let response: Response;
  try {
    response = await fetch("/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ conversationId, rToken, message }),
      signal,
    });
  } catch (err) {
    if (signal?.aborted) return;
    callbacks.onError?.({ code: "network_error", message: err instanceof Error ? err.message : String(err) });
    return;
  }

  if (!response.ok) {
    let detail = "";
    try { detail = (await response.text()).slice(0, 300); } catch { detail = ""; }
    callbacks.onError?.({ code: "http_" + response.status, message: detail || "HTTP " + response.status });
    return;
  }

  const reader = response.body?.getReader();
  if (!reader) {
    callbacks.onError?.({ code: "no_body", message: "Response body is empty" });
    return;
  }

  const decoder = new TextDecoder();
  let buffer = "";
  let currentEvent = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let newlineIndex: number;
      while ((newlineIndex = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, newlineIndex).replace(/\r$/, "");
        buffer = buffer.slice(newlineIndex + 1);

        if (line.startsWith("event: ")) {
          currentEvent = line.slice(7).trim();
        } else if (line.startsWith("data: ")) {
          const data = line.slice(6);
          try {
            const parsed = JSON.parse(data);
            switch (currentEvent) {
              case "evidence":
                callbacks.onEvidence?.(parsed.package as EvidencePackage);
                break;
              case "token":
                callbacks.onToken?.(parsed.delta as string);
                break;
              case "done":
                callbacks.onDone?.({
                  messageId: parsed.messageId as string,
                  warnings: (parsed.warnings ?? []) as string[],
                  brief: (parsed.brief ?? null) as ResearchBrief | null,
                });
                break;
              case "status":
                callbacks.onStatus?.({
                  phase: (parsed.phase ?? "") as string,
                  message: (parsed.message ?? "") as string,
                });
                break;
              case "error":
                callbacks.onError?.({
                  code: (parsed.code ?? "unknown") as string,
                  message: (parsed.message ?? "") as string,
                });
                break;
            }
          } catch {
            // Malformed JSON line — skip silently.
          }
          currentEvent = "";
        }
        // Empty lines and other lines are ignored (SSE spec).
      }
    }
  } catch (err) {
    if (signal?.aborted) return;
    callbacks.onError?.({ code: "stream_error", message: err instanceof Error ? err.message : String(err) });
  } finally {
    reader.releaseLock();
  }
}
