import { loadDotEnv } from "../lib/env";
import { buildEvidencePackage } from "../lib/evidence/build";
import { SYSTEM_PROMPT, buildUserMessage, validateBrief } from "../lib/ai/prompts";
import { completeJson, describeModelConfig, isModelConfigured } from "../lib/ai/qwen";
import { scanMarket } from "../lib/scanner/scan";
import type { ClaimKind } from "../lib/evidence/types";

// Tier-2 verification. Builds a real Evidence Package for one rToken, checks the
// deterministic half against the Tier-1 scanner, and only then exercises the
// model. Run: npm run smoke:research -- rTSLA [--verify-scan]

function pad(value: string, width: number): string {
  return value.length >= width ? value.slice(0, width) : value + " ".repeat(width - value.length);
}

function padLeft(value: string, width: number): string {
  return value.length >= width ? value : " ".repeat(width - value.length) + value;
}

function num(value: number | null | undefined, digits: number): string {
  return value === null || value === undefined || !Number.isFinite(value) ? "-" : value.toFixed(digits);
}

function line(label: string, value: string): void {
  console.log(pad(label, 22) + ": " + value);
}

async function main(): Promise<void> {
  const dotenv = loadDotEnv();
  const args = process.argv.slice(2);
  const verifyScan = args.includes("--verify-scan");
  const rTokenArg = args.find((arg) => !arg.startsWith("--"));
  const rToken = rTokenArg ?? "rTSLA";

  console.log("Bitget rVue Tier-2 research smoke test");
  console.log(pad("dotenv", 20) + ": " + (dotenv.loaded.length > 0 ? dotenv.loaded.join(", ") : "(no new keys loaded)"));
  console.log("asset               : " + rToken);
  console.log("model               : " + (isModelConfigured() ? "configured (" + describeModelConfig().model + ")" : "NOT CONFIGURED"));
  console.log("");

  const startedAt = Date.now();
  const built = await buildEvidencePackage({ rToken, force: true });

  if (built.status === "FAILED") {
    console.log("BUILD FAILED");
    line("code", built.code);
    line("rToken", built.rToken);
    line("underlying", built.underlyingTicker ?? "-");
    line("reason", built.reason);
    process.exitCode = 1;
    return;
  }

  const pkg = built.pkg;
  console.log("--- ASSET ---");
  line("rToken", pkg.asset.rToken);
  line("underlying", pkg.asset.underlyingTicker);
  line("pair", pkg.asset.pairSymbol);
  line("instrument", pkg.asset.instrumentType);
  line("contracts", pkg.asset.contracts.map((c) => c.chain + ":" + c.address.slice(0, 10) + "...").join(", ") || "(none)");
  line("contract match", pkg.asset.contractMatchSource);

  console.log("");
  console.log("--- DETERMINISTIC COMPARISON ---");
  line("rPrice", num(pkg.market.rPrice, 4) + " USDT");
  line("r24h", num(pkg.market.rChange24hPct, 2) + "%");
  line("bid/ask", num(pkg.market.bidPrice, 4) + " / " + num(pkg.market.askPrice, 4));
  line("24h volume", num(pkg.market.usdtVolume24h, 0) + " USDT");
  line("stock price", num(pkg.underlying.price, 4) + " (" + pkg.underlying.marketState + ")");
  line("session anchor", num(pkg.underlying.previousClose, 4));
  line("stock change", num(pkg.underlying.changePct, 2) + "%");
  line("aligned r change", num(pkg.comparison.alignedRChangePct, 2) + "%");
  line("spread", num(pkg.comparison.spreadPct, 3) + "%");
  line("divergence", num(pkg.comparison.divergencePp, 3) + "pp");
  line("threshold", "+/-" + num(pkg.comparison.thresholdPp, 2) + "pp");
  line("flagged", String(pkg.comparison.flagged));

  console.log("");
  console.log("--- ON-CHAIN (" + pkg.onchain.status + ") ---");
  line("chain/address", (pkg.onchain.chain ?? "-") + " / " + (pkg.onchain.address ?? "-"));
  line("provider", pkg.onchain.provider ?? "-");
  line("holders", num(pkg.onchain.holdersCount, 0));
  line("total supply", num(pkg.onchain.totalSupply, 2));
  line("transfers total", num(pkg.onchain.transfersCountTotal, 0));
  line("transfers " + pkg.onchain.windowHours + "h", num(pkg.onchain.transfersInWindow, 0) + (pkg.onchain.windowTruncated ? " (window truncated)" : ""));
  line("volume " + pkg.onchain.windowHours + "h", num(pkg.onchain.transferVolumeTokens, 2) + " tokens / " + num(pkg.onchain.transferVolumeUsdt, 0) + " USDT");
  line("largest transfer", num(pkg.onchain.largestTransferTokens, 2));
  line("counterparties", num(pkg.onchain.distinctCounterparties, 0));
  if (pkg.onchain.note) line("note", pkg.onchain.note);

  console.log("");
  console.log("--- NEWS (" + pkg.news.status + ") ---");
  line("window", pkg.news.windowHours + "h");
  line("queries", String(pkg.news.queries.length));
  line("items", String(pkg.news.items.length));
  for (const failure of pkg.news.providersFailed) line("provider failed", failure.provider + " - " + failure.reason.slice(0, 90));
  for (const entry of pkg.news.items.slice(0, 6)) {
    console.log("  " + pad(entry.id, 9) + pad(entry.relevance, 11) + new Date(entry.publishedAt).toISOString().slice(0, 16) + "  " + entry.title.slice(0, 72));
  }

  console.log("");
  console.log("--- EVIDENCE ITEMS ---");
  const byKind = new Map<ClaimKind, number>();
  for (const entry of pkg.evidence) byKind.set(entry.kind, (byKind.get(entry.kind) ?? 0) + 1);
  line("total", String(pkg.evidence.length));
  for (const kind of ["FACT", "COMPUTED", "INTERPRETATION", "UNKNOWN"] as ClaimKind[]) {
    line(kind, String(byKind.get(kind) ?? 0));
  }
  const ids = pkg.evidence.map((entry) => entry.id);
  const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
  line("duplicate ids", duplicates.length === 0 ? "none" : duplicates.join(", "));

  console.log("");
  console.log("--- GAPS (" + pkg.gaps.length + ") ---");
  for (const gap of pkg.gaps) console.log("  - " + gap);

  console.log("");
  console.log("--- TIMING ---");
  line("market/news ms", String(pkg.timing.marketMs));
  line("news ms", String(pkg.timing.newsMs));
  line("onchain ms", String(pkg.timing.onchainMs));
  line("total ms", String(pkg.timing.totalMs));
  line("wall ms", String(Date.now() - startedAt));

  if (verifyScan) {
    console.log("");
    console.log("--- CROSS-CHECK vs TIER-1 SCANNER ---");
    const summary = await scanMarket({ force: false });
    const row = summary.rows.find((candidate) => candidate.rToken.toLowerCase() === pkg.asset.rToken.toLowerCase());
    if (!row) {
      line("scanner row", "NOT FOUND (board and report disagree on universe membership)");
      process.exitCode = 1;
    } else {
      const divDelta = row.divergencePp === null || pkg.comparison.divergencePp === null ? null : Math.abs(row.divergencePp - pkg.comparison.divergencePp);
      const spreadDelta = row.spreadPct === null || pkg.comparison.spreadPct === null ? null : Math.abs(row.spreadPct - pkg.comparison.spreadPct);
      line("scanner divergence", num(row.divergencePp, 3) + "pp");
      line("package divergence", num(pkg.comparison.divergencePp, 3) + "pp");
      line("delta", num(divDelta, 4) + "pp");
      line("spread delta", num(spreadDelta, 4) + "%");
      line("flagged match", String(row.flagged === pkg.comparison.flagged));
      // Both sides run the same buildDivergenceRow, so a nonzero delta means the
      // market moved between the two fetches, not that the math diverged.
      line("interpretation", divDelta !== null && divDelta < 0.05 ? "MATCH (same math, same inputs)" : "inputs differ - market moved between fetches, re-run to confirm");
    }
  }

  console.log("");
  if (!isModelConfigured()) {
    console.log("--- RESEARCH BRIEF ---");
    console.log("  SKIPPED: QWEN_API_KEY is not set.");
    console.log("  The deterministic Evidence Package above is complete and valid on its own.");
    console.log("  No brief was fabricated to fill the gap.");
    console.log("");
    console.log("RESEARCH SMOKE OK (evidence only)");
    return;
  }

  console.log("--- RESEARCH BRIEF ---");
  const completion = await completeJson({ system: SYSTEM_PROMPT, user: buildUserMessage(pkg) });
  line("model", completion.model);
  line("finish reason", completion.finishReason ?? "-");
  line("tokens", "prompt=" + num(completion.usage.promptTokens, 0) + " completion=" + num(completion.usage.completionTokens, 0) + " total=" + num(completion.usage.totalTokens, 0));
  line("duration ms", String(completion.durationMs));

  const validation = validateBrief(completion.parsed, pkg);
  if (!validation.brief) {
    console.log("  BRIEF VALIDATION FAILED:");
    for (const error of validation.errors) console.log("    - " + error);
    console.log("  raw preview: " + completion.text.slice(0, 400));
    process.exitCode = 1;
    return;
  }

  const brief = validation.brief;
  line("signal", brief.signal);
  line("confidence", brief.confidence);
  console.log("");
  console.log("  SUMMARY: " + brief.summary);
  console.log("");
  console.log("  WHAT CHANGED");
  for (const entry of brief.whatChanged) console.log("    - " + entry);
  console.log("  WHY IT MATTERS");
  for (const entry of brief.whyItMatters) console.log("    - " + entry);
  console.log("  UNCERTAINTY");
  for (const entry of brief.uncertainty) console.log("    - " + entry);
  if (brief.keySignals.length > 0) {
    console.log("  KEY SIGNALS");
    for (const entry of brief.keySignals) console.log("    - " + entry);
  }
  if (brief.supportingEvidence.length > 0) {
    console.log("  SUPPORTING EVIDENCE");
    for (const entry of brief.supportingEvidence) console.log("    - " + entry);
  }
  if (brief.conflictingEvidence.length > 0) {
    console.log("  CONFLICTING EVIDENCE");
    for (const entry of brief.conflictingEvidence) console.log("    - " + entry);
  }
  if (brief.risks.length > 0) {
    console.log("  RISKS");
    for (const entry of brief.risks) console.log("    - " + entry);
  }
  console.log("");
  console.log("  CLAIMS (" + brief.claims.length + ")");
  for (const claim of brief.claims) {
    console.log("    [" + pad(claim.kind, 15) + "] " + claim.statement.slice(0, 96));
    console.log("      " + padLeft("cites: ", 8) + (claim.evidenceIds.join(", ") || "(none)") + (claim.unverified ? "  <-- UNVERIFIED" : ""));
  }
  console.log("");
  console.log("  WARNINGS (" + validation.warnings.length + ")");
  for (const warning of validation.warnings) console.log("    - " + warning);

  const unverifiedClaims = brief.claims.filter((claim) => claim.unverified).length;
  console.log("");
  console.log(padLeft("verified claims  ", 20) + (brief.claims.length - unverifiedClaims) + "/" + brief.claims.length);
  console.log("RESEARCH SMOKE OK");
}

main().catch((err: unknown) => {
  console.error("RESEARCH SMOKE FAILED:", err);
  process.exitCode = 1;
});
