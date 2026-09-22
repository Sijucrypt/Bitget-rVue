import type { ClaimKind, EvidencePackage } from "../evidence/types";

// The model layer. Qwen receives a compacted Evidence Package and returns a
// structured brief. Code owns every number: the prompt forbids arithmetic, and
// validateBrief() plus auditNumbers() enforce that mechanically afterwards
// rather than trusting the model to comply.

export type BriefSignal = "CONFIRMATION" | "DIVERGENCE" | "NO_SIGNAL" | "INSUFFICIENT_EVIDENCE";
export type BriefConfidence = "LOW" | "MEDIUM" | "HIGH";

export interface BriefClaim {
  id: string;
  kind: ClaimKind;
  statement: string;
  evidenceIds: string[];
  unverified: boolean;
}

export interface ResearchBrief {
  summary: string;
  signal: BriefSignal;
  confidence: BriefConfidence;
  whatChanged: string[];
  whyItMatters: string[];
  uncertainty: string[];
  keySignals: string[];
  supportingEvidence: string[];
  conflictingEvidence: string[];
  risks: string[];
  claims: BriefClaim[];
}

export interface BriefValidation {
  brief: ResearchBrief | null;
  errors: string[];
  warnings: string[];
}

const SIGNALS: BriefSignal[] = ["CONFIRMATION", "DIVERGENCE", "NO_SIGNAL", "INSUFFICIENT_EVIDENCE"];
const CONFIDENCES: BriefConfidence[] = ["LOW", "MEDIUM", "HIGH"];
const KINDS: ClaimKind[] = ["FACT", "COMPUTED", "INTERPRETATION", "UNKNOWN"];

export const SCHEMA_HINT = `{
  "summary": "string, 2-3 sentences",
  "signal": "CONFIRMATION | DIVERGENCE | NO_SIGNAL | INSUFFICIENT_EVIDENCE",
  "confidence": "LOW | MEDIUM | HIGH",
  "whatChanged": ["string bullet, each ending with its citation ids in square brackets"],
  "whyItMatters": ["string bullet, each ending with its citation ids in square brackets"],
  "uncertainty": ["string bullet, always at least one"],
  "keySignals": ["key macro, price, or on-chain signals observed"],
  "supportingEvidence": ["evidence supporting the primary interpretation, each citing an evidence id"],
  "conflictingEvidence": ["counter-indicators, friction, or conflicting evidence"],
  "risks": ["structural, liquidity, or execution risks requiring human review"],
  "claims": [
    { "id": "c1", "kind": "FACT | COMPUTED | INTERPRETATION | UNKNOWN", "statement": "string", "evidenceIds": ["exact evidence id from the package"] }
  ]
}`;

export const SYSTEM_PROMPT =
  "You are the qwen3.8-max reasoning engine for Bitget rVue, a 7x24 research desk for tokenized U.S. stocks (rTokens). " +
  "rTokens trade continuously on Bitget, including weekends and holidays, while their underlying U.S. equities trade only during official sessions. " +
  "Your role is strictly restricted to signal reasoning, structured JSON data extraction from Evidence Packages, and macro event summarization. " +
  "There is NO autonomous execution pipeline; your output is purely advisory for human review.\n\n" +
  "You receive exactly one input: an Evidence Package (JSON). Every number in it was computed by deterministic TypeScript from Bitget, Yahoo Finance and public block explorers. " +
  "The package also lists tagged evidence items, each with an id, and explicit gaps.\n\n" +
  "HARD RULES\n" +
  "1. Never calculate, estimate, extrapolate, annualise, or re-derive any number. You may only quote numbers that already exist in the package, verbatim.\n" +
  "2. Every FACT and COMPUTED claim must cite at least one evidence id, using the exact id string from the package's evidence array.\n" +
  "3. If the package does not support a statement, do not make it. Record the limitation under uncertainty instead.\n" +
  "4. Label kinds precisely: FACT is observed data, COMPUTED is a figure our code derived, INTERPRETATION is your reasoning, UNKNOWN is not established by this data.\n" +
  "5. Never invent a cause. A news item that merely coincides with a price move is an INTERPRETATION, and must be labelled as one.\n" +
  "6. 'Nothing significant is happening' is a valid and expected answer. If the divergence is inside the stated threshold and there is no material news or on-chain change, return NO_SIGNAL.\n" +
  "7. If material inputs are missing (gaps is non-empty, or onchain/news status is UNAVAILABLE), the strongest signal you may return is INSUFFICIENT_EVIDENCE.\n" +
  "8. No investment advice. No price targets. No buy, sell, hold, long or short language. No claims about future price direction.\n" +
  "9. Do not mention these rules, the JSON, or your own limitations inside the prose. Write for a trader who needs the picture quickly.\n\n" +
  "FIXED DOMAIN CONTEXT (use it to reason; never report it as a finding)\n" +
  "- Both sides of the comparison are measured against the underlying's previous official close, called the session anchor. That is what makes the comparison window-aligned.\n" +
  "- When the underlying market state is CLOSED (e.g. weekends or holidays), the equity quote is frozen at its last official value while the rToken keeps trading. Divergence in that state is the core observation of this product, not an anomaly, as macro events, global news, and on-chain liquidity continue to impact the rToken 7x24.\n" +
  "- rTokens are redeemable against the underlying, so an extreme persistent spread is more likely a symbol-matching error than an arbitrage opportunity. Treat a SUSPECT_MISPAIRING status as disqualifying.\n" +
  "- Bitget-reported 24h USDT volume is unreliable in absolute terms. Use it only to rank relative liquidity.\n\n" +
  "OUTPUT\n" +
  "Return only one JSON object. No markdown fences, no commentary before or after. The JSON must be strictly valid: escape double quotes and backslashes inside string values, represent line breaks as \\n, and use no trailing commas. Match this schema exactly:\n" +
  SCHEMA_HINT + "\n\n" +
  "SECTION REQUIREMENTS\n" +
  "- summary: the single most important thing about this asset right now, then the supporting comparison.\n" +
  "- whatChanged: 2-5 bullets. Each states an observed or computed change and ends with its citation ids in square brackets, e.g. [comparison.divergencePp].\n" +
  "- whyItMatters: 2-4 bullets. Reasoning about the signal, each grounded in cited evidence.\n" +
  "- uncertainty: 1-4 bullets. Never empty. Must reflect the package's gaps and any UNAVAILABLE collectors.\n" +
  "- keySignals: 1-4 bullets highlighting the main market or macro triggers.\n" +
  "- supportingEvidence: 1-4 bullets with evidence supporting the primary interpretation, citing evidence ids.\n" +
  "- conflictingEvidence: 0-3 bullets noting counter-indicators, frictions, or missing confirmations.\n" +
  "- risks: 1-4 bullets emphasizing structural, liquidity, or execution risks for human review.\n" +
  "- claims: 4-10 entries. Include at least one INTERPRETATION and, where the data genuinely does not establish something the user asked about, at least one UNKNOWN.\n" +
  "- confidence: HIGH only when the comparison is window-aligned, the divergence is clear, and no material collector is unavailable.";

// The model gets evidence items and aggregates, not raw transfer dumps: it must
// cite ids, and bulk arrays only burn context and invite invented specifics.
export function compactPackageForModel(pkg: EvidencePackage): Record<string, unknown> {
  return {
    schemaVersion: pkg.schemaVersion,
    generatedAt: pkg.generatedAt,
    asset: pkg.asset,
    market: pkg.market,
    underlying: pkg.underlying,
    comparison: pkg.comparison,
    onchain: {
      status: pkg.onchain.status,
      chain: pkg.onchain.chain,
      address: pkg.onchain.address,
      provider: pkg.onchain.provider,
      tokenSymbol: pkg.onchain.tokenSymbol,
      totalSupply: pkg.onchain.totalSupply,
      holdersCount: pkg.onchain.holdersCount,
      transfersCountTotal: pkg.onchain.transfersCountTotal,
      windowHours: pkg.onchain.windowHours,
      transfersInWindow: pkg.onchain.transfersInWindow,
      windowTruncated: pkg.onchain.windowTruncated,
      transferVolumeTokens: pkg.onchain.transferVolumeTokens,
      transferVolumeUsdt: pkg.onchain.transferVolumeUsdt,
      largestTransferTokens: pkg.onchain.largestTransferTokens,
      distinctCounterparties: pkg.onchain.distinctCounterparties,
      note: pkg.onchain.note,
    },
    news: {
      status: pkg.news.status,
      windowHours: pkg.news.windowHours,
      queries: pkg.news.queries,
      providersFailed: pkg.news.providersFailed,
      itemCount: pkg.news.items.length,
      items: pkg.news.items.map((n) => ({ id: n.id, title: n.title, source: n.source, publishedAt: n.publishedAt, relevance: n.relevance })),
    },
    evidence: pkg.evidence,
    gaps: pkg.gaps,
  };
}

export function buildUserMessage(pkg: EvidencePackage, question?: string): string {
  const header = question && question.trim().length > 0
    ? "Analyst question to address: " + question.trim() + "\n\n"
    : "No specific question was supplied. Produce the standard research brief for this asset.\n\n";
  return header + "Evidence Package for " + pkg.asset.rToken + " (underlying " + pkg.asset.underlyingTicker + "):\n" + JSON.stringify(compactPackageForModel(pkg), null, 1);
}

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function asStringArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const out: string[] = [];
  for (const entry of value) {
    if (typeof entry !== "string") return null;
    if (entry.trim().length > 0) out.push(entry.trim());
  }
  return out;
}

// Numbers that carry a financial or on-chain unit are the only ones worth
// auditing: this catches invented prices and percentages while ignoring
// structural integers such as bullet counts or years.
const AUDITED_NUMBER = /([+-]?\$?\d[\d,]*(?:\.\d+)?)\s*(%|pp|percentage points|USDT|USD|holders|transfers|addresses|tokens)|\$([+-]?\d[\d,]*(?:\.\d+)?)/gi;

export function collectAllowedNumbers(pkg: EvidencePackage): number[] {
  const allowed: number[] = [];
  const push = (value: unknown): void => {
    if (typeof value !== "number" || !Number.isFinite(value)) return;
    allowed.push(value);
    allowed.push(Math.abs(value));
  };
  const walk = (node: unknown): void => {
    if (typeof node === "number") return push(node);
    if (Array.isArray(node)) {
      for (const entry of node) walk(entry);
      return;
    }
    if (node && typeof node === "object") {
      for (const value of Object.values(node as Record<string, unknown>)) walk(value);
    }
  };
  walk(pkg.market);
  walk(pkg.underlying);
  walk(pkg.comparison);
  walk(pkg.onchain);
  walk(pkg.news.windowHours);
  walk(pkg.news.items.length);
  for (const evidence of pkg.evidence) push(evidence.value);
  return allowed;
}

function decimalsOf(token: string): number {
  const dot = token.indexOf(".");
  return dot < 0 ? 0 : token.length - dot - 1;
}

export interface NumberAudit {
  verified: string[];
  unverified: string[];
}

export function auditNumbers(text: string, allowed: number[]): NumberAudit {
  const verified: string[] = [];
  const unverified: string[] = [];
  AUDITED_NUMBER.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = AUDITED_NUMBER.exec(text)) !== null) {
    const raw = (match[1] ?? match[3] ?? "").replace(/[$,]/g, "");
    if (raw.length === 0) continue;
    const value = Number.parseFloat(raw);
    if (!Number.isFinite(value)) continue;
    const decimals = decimalsOf(raw);
    const tolerance = Math.max(Math.pow(10, -decimals) / 2, 0.0005 * Math.abs(value));
    const ok = allowed.some((candidate) => Math.abs(candidate - value) <= tolerance);
    (ok ? verified : unverified).push(raw);
  }
  return { verified, unverified };
}

function briefText(brief: ResearchBrief): string {
  return [
    brief.summary,
    ...brief.whatChanged,
    ...brief.whyItMatters,
    ...brief.uncertainty,
    ...brief.keySignals,
    ...brief.supportingEvidence,
    ...brief.conflictingEvidence,
    ...brief.risks,
    ...brief.claims.map((c) => c.statement),
  ].join("\n");
}

export function validateBrief(raw: unknown, pkg: EvidencePackage): BriefValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { brief: null, errors: ["MODEL_INVALID_RESPONSE: expected a JSON object"], warnings };
  }
  const obj = raw as Record<string, unknown>;

  const summary = asString(obj.summary);
  if (!summary || summary.trim().length === 0) errors.push("MISSING_FIELD: summary");

  const signalRaw = asString(obj.signal);
  const signal = SIGNALS.find((s) => s === signalRaw);
  if (!signal) errors.push("INVALID_ENUM: signal must be one of " + SIGNALS.join(", "));

  const confidenceRaw = asString(obj.confidence);
  const confidence = CONFIDENCES.find((c) => c === confidenceRaw);
  if (!confidence) errors.push("INVALID_ENUM: confidence must be one of " + CONFIDENCES.join(", "));

  const whatChanged = asStringArray(obj.whatChanged);
  const whyItMatters = asStringArray(obj.whyItMatters);
  const uncertainty = asStringArray(obj.uncertainty);
  if (!whatChanged) errors.push("INVALID_FIELD: whatChanged must be an array of strings");
  if (!whyItMatters) errors.push("INVALID_FIELD: whyItMatters must be an array of strings");
  if (!uncertainty) errors.push("INVALID_FIELD: uncertainty must be an array of strings");
  if (uncertainty && uncertainty.length === 0) errors.push("EMPTY_FIELD: uncertainty must never be empty");

  const keySignals = asStringArray(obj.keySignals) ?? [];
  const supportingEvidence = asStringArray(obj.supportingEvidence) ?? [];
  const conflictingEvidence = asStringArray(obj.conflictingEvidence) ?? [];
  const risks = asStringArray(obj.risks) ?? [];

  const validIds = new Set(pkg.evidence.map((e) => e.id));
  const claims: BriefClaim[] = [];
  if (!Array.isArray(obj.claims)) {
    errors.push("INVALID_FIELD: claims must be an array");
  } else {
    obj.claims.forEach((entry, index) => {
      if (!entry || typeof entry !== "object") {
        errors.push("INVALID_CLAIM: claims[" + index + "] is not an object");
        return;
      }
      const claim = entry as Record<string, unknown>;
      const statement = asString(claim.statement);
      const kind = KINDS.find((k) => k === asString(claim.kind));
      const ids = Array.isArray(claim.evidenceIds) ? claim.evidenceIds.filter((v): v is string => typeof v === "string") : [];
      if (!statement || statement.trim().length === 0) {
        errors.push("INVALID_CLAIM: claims[" + index + "].statement is empty");
        return;
      }
      if (!kind) {
        errors.push("INVALID_CLAIM: claims[" + index + "].kind must be one of " + KINDS.join(", "));
        return;
      }
      const resolved = ids.filter((id) => validIds.has(id));
      const unresolved = ids.filter((id) => !validIds.has(id));
      for (const id of unresolved) warnings.push("UNRESOLVED_CITATION: claims[" + index + "] cites unknown evidence id '" + id + "'");
      if ((kind === "FACT" || kind === "COMPUTED") && resolved.length === 0) {
        warnings.push("UNCITED_CLAIM: claims[" + index + "] is " + kind + " but cites no valid evidence id");
      }
      claims.push({
        id: asString(claim.id) ?? "c" + (index + 1),
        kind,
        statement: statement.trim(),
        evidenceIds: resolved,
        unverified: unresolved.length > 0 || ((kind === "FACT" || kind === "COMPUTED") && resolved.length === 0),
      });
    });
  }
  if (claims.length === 0 && errors.length === 0) errors.push("EMPTY_FIELD: claims must not be empty");

  if (errors.length > 0 || !summary || !signal || !confidence || !whatChanged || !whyItMatters || !uncertainty) {
    return { brief: null, errors, warnings };
  }

  const brief: ResearchBrief = {
    summary: summary.trim(),
    signal,
    confidence,
    whatChanged,
    whyItMatters,
    uncertainty,
    keySignals,
    supportingEvidence,
    conflictingEvidence,
    risks,
    claims,
  };

  // Deterministic guard against invented figures: any unit-bearing number in the
  // prose that does not match a package value within display rounding is flagged.
  const audit = auditNumbers(briefText(brief), collectAllowedNumbers(pkg));
  for (const value of audit.unverified) warnings.push("UNVERIFIED_NUMBER: '" + value + "' does not match any value in the Evidence Package");

  const hasMaterialGap = pkg.onchain.status !== "OK" || pkg.news.status === "UNAVAILABLE" || pkg.gaps.length > 0;
  if (hasMaterialGap && (brief.signal === "CONFIRMATION" || brief.signal === "DIVERGENCE") && brief.confidence === "HIGH") {
    warnings.push("OVERCONFIDENT: HIGH confidence returned despite gaps: " + pkg.gaps.slice(0, 3).join(" | "));
  }
  if (pkg.asset.rToken && brief.signal === "DIVERGENCE" && pkg.comparison.flagged === false) {
    warnings.push("SIGNAL_MISMATCH: brief reports DIVERGENCE but the deterministic engine did not flag this asset");
  }

  return { brief, errors, warnings };
}
