import { buildEvidencePackage } from "@/lib/evidence/build";
import { buildUserMessage, SYSTEM_PROMPT, validateBrief } from "@/lib/ai/prompts";
import { completeJson, ModelError } from "@/lib/ai/qwen";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

interface ChatRequest { conversationId: string; rToken?: string; message: string; }

function sse(event: string, payload: unknown): Uint8Array {
  return new TextEncoder().encode(`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`);
}

export async function POST(request: Request): Promise<Response> {
  let body: ChatRequest;
  try { body = await request.json() as ChatRequest; } catch { return Response.json({ error: "bad_request", detail: "request body must be valid JSON" }, { status: 400 }); }
  if (!body || typeof body.conversationId !== "string" || typeof body.message !== "string" || body.message.trim().length === 0) return Response.json({ error: "bad_request", detail: "conversationId and message are required" }, { status: 400 });
  if (!body.rToken || !/^[A-Za-z0-9.-]{1,24}$/.test(body.rToken)) return Response.json({ error: "rToken_required", detail: "Pin a valid rToken before requesting research." }, { status: 400 });

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: string, payload: unknown) => controller.enqueue(sse(event, payload));
      try {
        // Phase 1: build evidence package (deterministic, no model)
        send("status", { phase: "evidence", message: `Fetching evidence for ${body.rToken}…` });
        const built = await buildEvidencePackage({ rToken: body.rToken! });
        if (built.status === "FAILED") { send("error", { code: built.code, message: built.reason }); return; }
        send("evidence", { package: built.pkg });

        // Phase 2: call the model (streams internally, validated after)
        send("status", { phase: "model", message: "Generating research brief…" });
        const result = await completeJson({ system: SYSTEM_PROMPT, user: buildUserMessage(built.pkg, body.message) });
        const validation = validateBrief(result.parsed, built.pkg);
        if (!validation.brief) { send("error", { code: "brief_validation_failed", message: validation.errors.join("; ") }); return; }

        // Phase 3: stream the summary text progressively for a real-time feel.
        // The model output is already complete (JSON must be validated first),
        // so we chunk the summary into word groups for the streaming animation.
        const summary = validation.brief.summary;
        const words = summary.split(/(\s+)/);
        const CHUNK_SIZE = 3;
        for (let i = 0; i < words.length; i += CHUNK_SIZE) {
          const chunk = words.slice(i, i + CHUNK_SIZE).join("");
          send("token", { delta: chunk });
        }

        send("done", { messageId: `${body.conversationId}-${Date.now()}`, warnings: validation.warnings, brief: validation.brief });
      } catch (error) {
        const code = error instanceof ModelError ? error.code.toLowerCase() : "chat_failed";
        send("error", { code, message: error instanceof Error ? error.message : String(error) });
      } finally { controller.close(); }
    },
  });
  return new Response(stream, { headers: { "content-type": "text/event-stream; charset=utf-8", "cache-control": "no-cache, no-transform", connection: "keep-alive" } });
}
