import { loadDotEnv } from "../lib/env";
import { ModelError, completeJson, describeModelConfig, getModelConfig, isModelConfigured } from "../lib/ai/qwen";

// Isolates credential and endpoint problems from pipeline problems. Run this
// first: npm run check:model
//
// If this passes, the research pipeline has a working model. If it fails, the
// fault is the key, the base URL or the model name, and the advice below names
// which one.

function line(label: string, value: string): void {
  const padded = label.length >= 22 ? label : label + " ".repeat(22 - label.length);
  console.log(padded + ": " + value);
}

function httpStatus(detail: string): number | null {
  const match = detail.match(/HTTP (\d{3})/);
  return match ? Number.parseInt(match[1], 10) : null;
}

function adviceFor(detail: string): string[] {
  const status = httpStatus(detail);
  const lower = detail.toLowerCase();
  const advice: string[] = [];

  if (lower.includes("response_format") || lower.includes("unexpected field")) {
    advice.push("Your endpoint rejected response_format. Set QWEN_RESPONSE_FORMAT=0 in .env and re-run.");
  }
  if (status === 401 || status === 403) {
    advice.push("Key rejected. Confirm QWEN_API_KEY is copied whole, with no quotes or trailing spaces.");
    advice.push("Confirm the key is the Bitget hackathon key with QWEN_BASE_URL=https://hackathon.bitgetops.com/v1; a DashScope key needs the DashScope base URL instead.");
  }
  if (status === 404) {
    advice.push("404 means the path or model does not exist. Check QWEN_BASE_URL ends in /v1 (Bitget) or /compatible-mode/v1 (DashScope) with no trailing slash before /chat/completions.");
    advice.push("Check QWEN_MODEL is a model your key can access (qwen3.8-max for the Bitget hackathon key, or qwen-plus / qwen-max for DashScope).");
  }
  if (status === 400 && advice.length === 0) {
    advice.push("400 is usually a bad model id or an unsupported parameter. Try QWEN_MODEL=qwen3.8-max, then QWEN_RESPONSE_FORMAT=0.");
  }
  if (status === 429) {
    advice.push("Rate limited or out of quota. Wait, then re-run. Check the credit balance on the Bitget/DashScope console.");
  }
  if (lower.includes("dns resolution failed") || lower.includes("enotfound")) {
    advice.push("DNS blocked the model host. All traffic here goes through lib/net/doh.ts; if DoH itself is blocked, the model host must be added to the DoH path.");
  }
  if (lower.includes("timeout") || lower.includes("aborted")) {
    advice.push("Timed out. The client streams, so this is total generation time; deep-research briefs can take minutes on the hackathon credit. Raise QWEN_TIMEOUT_MS (default 300000) if needed.");
  }
  if (advice.length === 0) advice.push("No specific rule matched. Read the detail above and compare QWEN_BASE_URL against the endpoint Bitget supplied.");
  return advice;
}

async function ping(label: string, jsonMode: boolean): Promise<{ ok: boolean; detail: string; ms: number; model: string | null }> {
  const previous = process.env.QWEN_RESPONSE_FORMAT;
  if (!jsonMode) process.env.QWEN_RESPONSE_FORMAT = "0";
  const started = Date.now();
  try {
    const result = await completeJson({
      system: "You are a connectivity probe. Reply with only the JSON object {\"ok\": true} and nothing else.",
      user: "ping",
      maxTokens: 20,
      temperature: 0,
    });
    const ok = Boolean(result.parsed) && typeof result.parsed === "object";
    return { ok, detail: ok ? "model returned parseable JSON" : "unexpected payload shape", ms: Date.now() - started, model: result.model };
  } catch (err) {
    const detail = err instanceof ModelError ? err.code + " - " + err.detail : String(err instanceof Error ? err.message : err);
    console.log("  [" + label + "] failed after " + (Date.now() - started) + "ms");
    return { ok: false, detail, ms: Date.now() - started, model: null };
  } finally {
    if (previous === undefined) delete process.env.QWEN_RESPONSE_FORMAT;
    else process.env.QWEN_RESPONSE_FORMAT = previous;
  }
}

async function main(): Promise<void> {
  console.log("Bitget rVue model connectivity check");
  console.log("");

  const dotenv = loadDotEnv();
  line("dotenv file", dotenv.file);
  line("keys loaded", dotenv.loaded.length > 0 ? dotenv.loaded.join(", ") : "(none)");
  if (dotenv.skippedExisting.length > 0) line("already in env", dotenv.skippedExisting.join(", "));
  if (dotenv.malformed.length > 0) line("malformed lines", dotenv.malformed.join(" | "));

  const config = describeModelConfig();
  console.log("");
  line("configured", String(config.configured));
  line("base url", config.baseUrl);
  line("model", config.model);
  line("key preview", config.keyPreview);
  line("response_format", String(getModelConfig().jsonResponseFormat));
  line("timeout ms", String(getModelConfig().timeoutMs));

  if (!isModelConfigured()) {
    console.log("");
    console.log("NO KEY FOUND. To fix:");
    console.log("  1. copy .env.example to .env in the project root");
    console.log("  2. set QWEN_API_KEY=<your key>");
    console.log("  3. if Bitget gave you a different endpoint, also set QWEN_BASE_URL and QWEN_MODEL");
    console.log("  4. re-run: npm run check:model");
    console.log("");
    console.log("Note: .env is gitignored. Never paste the key into chat, a commit, or a source file.");
    process.exitCode = 1;
    return;
  }

  console.log("");
  console.log("--- TEST 1: auth + endpoint + model + JSON parsing ---");
  const first = await ping("test1", getModelConfig().jsonResponseFormat);
  if (first.ok) {
    line("result", "PASS");
    line("model reported", first.model ?? "-");
    line("latency ms", String(first.ms));
  } else {
    line("result", "FAIL");
    line("detail", first.detail.slice(0, 400));
    console.log("");
    console.log("  Advice:");
    for (const entry of adviceFor(first.detail)) console.log("    - " + entry);

    if (getModelConfig().jsonResponseFormat) {
      console.log("");
      console.log("--- TEST 2: retry with response_format disabled ---");
      const second = await ping("test2", false);
      if (second.ok) {
        line("result", "PASS");
        console.log("  CONFIRMED: your endpoint works but rejects response_format.");
        console.log("  FIX: add QWEN_RESPONSE_FORMAT=0 to .env");
      } else {
        line("result", "FAIL");
        line("detail", second.detail.slice(0, 300));
        console.log("  response_format is not the cause. Follow the advice above.");
      }
    }
    process.exitCode = 1;
    return;
  }

  console.log("");
  console.log("MODEL OK. Credentials, endpoint and model name all work.");
  console.log("Next: npm run smoke:research -- rTSLA");
  console.log("That builds a real Evidence Package and prints the brief, every claim's");
  console.log("citations, and all validation warnings. Watch for UNVERIFIED_NUMBER and");
  console.log("UNRESOLVED_CITATION - those are the anti-hallucination guards firing.");
  console.log("");
  console.log("CHECK MODEL OK");
}

main().catch((err: unknown) => {
  console.error("CHECK MODEL FAILED:", err);
  process.exitCode = 1;
});
