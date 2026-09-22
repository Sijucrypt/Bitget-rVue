import { NextResponse } from "next/server";
import { buildEvidencePackage } from "@/lib/evidence/build";
import type { EvidencePackage } from "@/lib/evidence/types";
import { SYSTEM_PROMPT, buildUserMessage, validateBrief, type ResearchBrief } from "@/lib/ai/prompts";
import { ModelError, completeJson, describeModelConfig, isModelConfigured } from "@/lib/ai/qwen";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

// Tier-2 deep research endpoint. Deterministic Evidence Package in, sourced
// research brief out. The package is always returned alongside the brief so the
// UI renders every figure from code and never from model prose.

const RTOKEN_PATTERN = /^[A-Za-z0-9.-]{1,24}$/;
const MAX_QUESTION_CHARS = 600;

interface ResearchRequest {
  rToken: string;
  question?: string;
  packageOnly?: boolean;
  force?: boolean;
  newsEnabled?: boolean;
  onchainEnabled?: boolean;
}

interface ResearchPayload {
  rToken: string;
  package: EvidencePackage | null;
  brief: ResearchBrief | null;
  warnings: string[];
  model: { configured: boolean; name: string; durationMs: number | null; usage: { promptTokens: number | null; completionTokens: number | null; totalTokens: number | null } | null } | null;
  generatedAt: number;
}

function payload(rToken: string, pkg: EvidencePackage | null, brief: ResearchBrief | null, warnings: string[], model: ResearchPayload["model"]): ResearchPayload {
  return { rToken, package: pkg, brief, warnings, model, generatedAt: Date.now() };
}

function parseBoolean(value: unknown): boolean | undefined {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const lower = value.trim().toLowerCase();
    if (["1", "true", "yes", "on"].includes(lower)) return true;
    if (["0", "false", "no", "off"].includes(lower)) return false;
  }
  return undefined;
}

function readRequest(searchParams: URLSearchParams): ResearchRequest | { error: string } {
  const rToken = searchParams.get("rToken")?.trim() ?? "";
  if (rToken.length === 0) return { error: "rToken query parameter is required" };
  return {
    rToken,
    question: searchParams.get("question") ?? undefined,
    packageOnly: parseBoolean(searchParams.get("packageOnly")) ?? false,
    force: parseBoolean(searchParams.get("force")) ?? false,
    newsEnabled: parseBoolean(searchParams.get("newsEnabled")),
    onchainEnabled: parseBoolean(searchParams.get("onchainEnabled")),
  };
}

async function readBody(request: Request): Promise<ResearchRequest | { error: string }> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return { error: "request body must be valid JSON" };
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) return { error: "request body must be a JSON object" };
  const obj = body as Record<string, unknown>;
  const rToken = typeof obj.rToken === "string" ? obj.rToken.trim() : "";
  if (rToken.length === 0) return { error: "rToken is required" };
  return {
    rToken,
    question: typeof obj.question === "string" ? obj.question : undefined,
    packageOnly: parseBoolean(obj.packageOnly) ?? false,
    force: parseBoolean(obj.force) ?? false,
    newsEnabled: parseBoolean(obj.newsEnabled),
    onchainEnabled: parseBoolean(obj.onchainEnabled),
  };
}

function sanitize(input: ResearchRequest): ResearchRequest {
  const question = input.question?.trim().slice(0, MAX_QUESTION_CHARS);
  return { ...input, question: question && question.length > 0 ? question : undefined };
}

async function runResearch(input: ResearchRequest): Promise<NextResponse> {
  if (!RTOKEN_PATTERN.test(input.rToken)) {
    return NextResponse.json({ error: "invalid_rtoken", detail: "rToken must match " + RTOKEN_PATTERN.source }, { status: 400 });
  }

  const built = await buildEvidencePackage({
    rToken: input.rToken,
    force: input.force,
    newsEnabled: input.newsEnabled,
    onchainEnabled: input.onchainEnabled,
  });

  if (built.status === "FAILED") {
    const status = built.code === "UNKNOWN_RTOKEN" ? 404 : 422;
    return NextResponse.json(
      { error: built.code.toLowerCase(), rToken: built.rToken, underlyingTicker: built.underlyingTicker, detail: built.reason },
      { status },
    );
  }

  const pkg = built.pkg;
  if (input.packageOnly) {
    return NextResponse.json(payload(pkg.asset.rToken, pkg, null, [], { configured: isModelConfigured(), name: describeModelConfig().model, durationMs: null, usage: null }));
  }

  if (!isModelConfigured()) {
    // The deterministic half is still useful, so it is returned with a 503
    // instead of being discarded. No brief is invented to fill the gap.
    return NextResponse.json(
      {
        error: "model_not_configured",
        detail: "Set QWEN_API_KEY (or DASHSCOPE_API_KEY) to generate a research brief. The deterministic Evidence Package is returned below.",
        ...payload(pkg.asset.rToken, pkg, null, ["MODEL_UNAVAILABLE: no research brief was generated; only deterministic evidence is present."], null),
      },
      { status: 503 },
    );
  }

  let completion;
  try {
    completion = await completeJson({ system: SYSTEM_PROMPT, user: buildUserMessage(pkg, input.question) });
  } catch (err) {
    const code = err instanceof ModelError ? err.code : "MODEL_HTTP_ERROR";
    const detail = String(err instanceof Error ? err.message : err).slice(0, 500);
    const status = code === "MODEL_NOT_CONFIGURED" ? 503 : code === "MODEL_TIMEOUT" ? 504 : 502;
    return NextResponse.json(
      { error: code.toLowerCase(), detail, ...payload(pkg.asset.rToken, pkg, null, ["MODEL_FAILED: " + detail], null) },
      { status },
    );
  }

  const validation = validateBrief(completion.parsed, pkg);
  const modelMeta = {
    configured: true,
    name: completion.model,
    durationMs: completion.durationMs,
    usage: completion.usage,
  };

  if (!validation.brief) {
    return NextResponse.json(
      {
        error: "brief_validation_failed",
        detail: validation.errors.join("; "),
        rawPreview: completion.text.slice(0, 800),
        ...payload(pkg.asset.rToken, pkg, null, [...validation.errors, ...validation.warnings], modelMeta),
      },
      { status: 502 },
    );
  }

  if (validation.warnings.length > 0 && completion.finishReason === "length") {
    validation.warnings.push("TRUNCATED_OUTPUT: the model hit its token limit; the brief may be incomplete.");
  }

  return NextResponse.json(payload(pkg.asset.rToken, pkg, validation.brief, validation.warnings, modelMeta));
}

export async function GET(request: Request) {
  try {
    const parsed = readRequest(new URL(request.url).searchParams);
    if ("error" in parsed) return NextResponse.json({ error: "bad_request", detail: parsed.error }, { status: 400 });
    return await runResearch(sanitize(parsed));
  } catch (err) {
    return NextResponse.json({ error: "research_failed", detail: String(err instanceof Error ? err.message : err).slice(0, 500) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const parsed = await readBody(request);
    if ("error" in parsed) return NextResponse.json({ error: "bad_request", detail: parsed.error }, { status: 400 });
    return await runResearch(sanitize(parsed));
  } catch (err) {
    return NextResponse.json({ error: "research_failed", detail: String(err instanceof Error ? err.message : err).slice(0, 500) }, { status: 500 });
  }
}
