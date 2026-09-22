"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  Copy,
  ExternalLink,
  RefreshCw,
  Sparkles,
  Layers,
  Activity,
  Globe,
  TrendingUp,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";
import { Icon } from "@/components/ui/Icon";
import type { EvidencePackage } from "@/lib/evidence/types";
import type { ResearchBrief } from "@/lib/ai/prompts";
import { fmtAge, fmtPct, fmtPp, fmtPrice, fmtVolume } from "@/lib/format";
import { MarketStatus } from "@/components/ui/MarketStatus";
import { BriefPanel } from "@/components/chat/BriefPanel";

interface ResearchResponse {
  package: EvidencePackage | null;
  brief?: ResearchBrief | null;
  detail?: string;
  error?: string;
  warnings?: string[];
  model?: {
    configured: boolean;
    name: string;
    durationMs: number | null;
  } | null;
}

function Metric({
  label,
  value,
  detail,
  highlight = false,
}: {
  label: string;
  value: string;
  detail: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 transition-colors ${
        highlight
          ? "border-warning/30 bg-warning/5"
          : "border-border bg-surface"
      }`}
    >
      <p className="text-[10px] font-semibold uppercase tracking-[.12em] text-tertiary">
        {label}
      </p>
      <p className="mt-2 font-mono text-lg font-semibold tabular-nums text-text">
        {value}
      </p>
      <p className="mt-1 text-xs text-muted">{detail}</p>
    </div>
  );
}

export default function RTokenReport() {
  const params = useParams<{ rToken: string }>();
  const rToken = decodeURIComponent(params.rToken ?? "");
  const [data, setData] = useState<ResearchResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [generatingBrief, setGeneratingBrief] = useState(false);
  const [copied, setCopied] = useState(false);

  // Initial load: fetch deterministic package
  const load = useCallback(
    async (force = false) => {
      setLoading(true);
      try {
        const response = await fetch(
          `/api/research?rToken=${encodeURIComponent(rToken)}&packageOnly=1${
            force ? "&force=1" : ""
          }`,
        );
        setData((await response.json()) as ResearchResponse);
      } catch (error) {
        setData({
          package: null,
          error: "research_failed",
          detail: error instanceof Error ? error.message : String(error),
        });
      } finally {
        setLoading(false);
      }
    },
    [rToken],
  );

  // Deep AI Research Brief generation
  const generateBrief = useCallback(async () => {
    setGeneratingBrief(true);
    try {
      const response = await fetch(`/api/research`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rToken, packageOnly: false }),
      });
      const res = (await response.json()) as ResearchResponse;
      if (res.brief) {
        setData((prev) => (prev ? { ...prev, brief: res.brief } : res));
      }
    } catch (error) {
      console.error("Failed to generate brief:", error);
    } finally {
      setGeneratingBrief(false);
    }
  }, [rToken]);

  useEffect(() => {
    void load();
  }, [load]);

  const pkg = data?.package;
  const brief = data?.brief ?? null;

  const copyEvidence = async () => {
    if (!pkg) return;
    await navigator.clipboard.writeText(JSON.stringify(pkg, null, 2));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-20 text-center text-sm text-muted" aria-live="polite">
        <div className="mx-auto mb-3 h-6 w-6 animate-spin rounded-full border-2 border-brand border-t-transparent" />
        Building deterministic Evidence Package for <span className="font-mono text-text">{rToken}</span>…
      </div>
    );
  }

  if (!pkg) {
    return (
      <div className="mx-auto max-w-xl px-6 py-20 text-center">
        <p className="font-mono text-xl text-text">{rToken || "Unknown rToken"}</p>
        <p className="mt-3 text-sm text-muted">{data?.detail ?? "Data unavailable."}</p>
        <Link
          href="/rtokens"
          className="mt-6 inline-flex rounded-lg border border-border px-3 py-2 text-sm text-muted hover:text-text"
        >
          Back to board
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 space-y-7">
      {/* Top Breadcrumb & Actions */}
      <div className="flex items-center justify-between">
        <Link
          href="/rtokens"
          className="inline-flex items-center gap-2 text-sm text-muted hover:text-brand transition-colors"
        >
          <Icon icon={ArrowLeft} size={15} />
          Back to board
        </Link>

        <div className="flex items-center gap-2">
          <Link
            href={`/chat?rToken=${encodeURIComponent(pkg.asset.rToken)}`}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-accent-contrast shadow-xs hover:bg-brand/90 transition-colors"
          >
            Launch in Desk <Icon icon={ExternalLink} size={13} />
          </Link>
          <button
            onClick={() => void load(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-muted hover:text-text transition-colors"
          >
            <Icon icon={RefreshCw} size={13} />
            Rescan
          </button>
          <button
            onClick={() => void copyEvidence()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-muted hover:text-text transition-colors"
          >
            <Icon icon={Copy} size={13} />
            {copied ? "Copied" : "JSON"}
          </button>
        </div>
      </div>

      {/* Header Banner with Monogram & 24/7 Market Context (§18, §19) */}
      <header className="rounded-[24px] border border-glass-border bg-surface p-6 shadow-sm sm:p-8 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-[.14em] text-brand">
              Evidence Report
            </span>
            <span className="text-tertiary">•</span>
            <span className="font-mono text-xs text-muted">
              {pkg.asset.pairSymbol}
            </span>
          </div>

          <h1 className="mt-2 font-mono text-3xl font-bold tracking-tight text-text">
            {pkg.asset.rToken}
          </h1>

          <p className="mt-1 text-sm text-muted">
            Underlying: <strong className="font-medium text-text">{pkg.asset.underlyingTicker}</strong> ·{" "}
            Instrument: {pkg.asset.instrumentType} · Match: {pkg.asset.contractMatchSource}
          </p>

          <p className="mt-2 text-xs text-tertiary">
            Data snapshot: {new Date(pkg.generatedAt).toLocaleString()}
          </p>
        </div>

        {/* 24/7 Context Pill */}
        <div className="flex flex-col items-start lg:items-end gap-2">
          <MarketStatus
            marketState={pkg.underlying.marketState}
            underlyingTicker={pkg.asset.underlyingTicker}
            sessionAnchor={pkg.underlying.previousClose}
            currency={pkg.underlying.currency}
          />
          <span className="text-[11px] text-muted">
            Window-aligned session comparison
          </span>
        </div>
      </header>

      {/* Metric Grid (Deterministic Comparison) */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric
          label="rToken Price"
          value={`$${fmtPrice(pkg.market.rPrice, 4)} USDT`}
          detail={`as of ${fmtAge(pkg.market.fetchedAt)} ago`}
        />
        <Metric
          label="Underlying Close/Price"
          value={`$${fmtPrice(pkg.underlying.price)}`}
          detail={`${pkg.asset.underlyingTicker} · State: ${pkg.underlying.marketState}`}
        />
        <Metric
          label="Divergence"
          value={fmtPp(pkg.comparison.divergencePp)}
          detail={`Threshold: ±${pkg.comparison.thresholdPp.toFixed(2)}pp`}
          highlight={pkg.comparison.flagged}
        />
        <Metric
          label="Spread"
          value={fmtPct(pkg.comparison.spreadPct)}
          detail={pkg.comparison.flagged ? "Flagged divergence" : "Within bounds"}
          highlight={pkg.comparison.flagged}
        />
        <Metric
          label="rToken 24h Move"
          value={fmtPct(pkg.market.rChange24hPct)}
          detail="Bitget reported 24h delta"
        />
        <Metric
          label="Aligned rChange"
          value={fmtPct(pkg.comparison.alignedRChangePct)}
          detail="Anchored to official previous close"
        />
        <Metric
          label="24h USDT Volume"
          value={fmtVolume(pkg.market.usdtVolume24h)}
          detail="Relative liquidity ranking only"
        />
        <Metric
          label="Bid / Ask"
          value={`${fmtPrice(pkg.market.bidPrice, 4)} / ${fmtPrice(pkg.market.askPrice, 4)}`}
          detail="Order book top spread"
        />
      </section>

      {/* AI Research Brief Section (§13, §18) */}
      <section className="rounded-2xl border border-border bg-surface p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Icon icon={Sparkles} size={16} className="text-brand" />
              <h2 className="text-base font-semibold text-text">AI Synthesis & Reasoning</h2>
            </div>
            <p className="text-xs text-muted mt-0.5">
              Strictly advisory synthesis by qwen3.8-max. Code calculates, AI interprets.
            </p>
          </div>

          {!brief && (
            <button
              onClick={() => void generateBrief()}
              disabled={generatingBrief}
              className="inline-flex items-center gap-2 rounded-lg bg-brand px-3.5 py-1.5 text-xs font-semibold text-accent-contrast shadow-xs hover:bg-brand/90 disabled:opacity-50 transition-colors"
            >
              <Icon icon={Sparkles} size={14} />
              {generatingBrief ? "Synthesizing Brief…" : "Generate AI Brief"}
            </button>
          )}
        </div>

        {brief ? (
          <BriefPanel brief={brief} evidence={pkg} />
        ) : (
          <div className="py-6 text-center text-xs text-muted">
            <p>No AI brief generated yet for this session snapshot.</p>
            <p className="mt-1 text-tertiary">
              Click &ldquo;Generate AI Brief&rdquo; above or ask in the interactive desk.
            </p>
          </div>
        )}
      </section>

      {/* Domain Panels: On-Chain Activity & News & Macro (§18) */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* On-Chain Architecture Panel */}
        <section className="rounded-2xl border border-border bg-surface p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div className="flex items-center gap-2">
              <Icon icon={Activity} size={16} className="text-brand" />
              <h2 className="text-sm font-semibold text-text">On-Chain Architecture</h2>
            </div>
            <span
              className={`rounded px-2 py-0.5 font-mono text-[10px] font-semibold uppercase ${
                pkg.onchain.status === "OK"
                  ? "bg-positive/15 text-positive"
                  : "bg-surface-raised text-tertiary"
              }`}
            >
              {pkg.onchain.status}
            </span>
          </div>

          {pkg.onchain.status === "OK" ? (
            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-[10px] uppercase text-tertiary">Network / Explorer</span>
                  <p className="font-mono text-text mt-0.5">{pkg.onchain.chain ?? "Arbitrum"}</p>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-tertiary">Holders Count</span>
                  <p className="font-mono text-text mt-0.5 font-medium">
                    {pkg.onchain.holdersCount !== null ? pkg.onchain.holdersCount.toLocaleString() : "Data unavailable"}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-tertiary">Transfers ({pkg.onchain.windowHours}h)</span>
                  <p className="font-mono text-text mt-0.5 font-medium">
                    {pkg.onchain.transfersInWindow !== null ? pkg.onchain.transfersInWindow.toLocaleString() : "Data unavailable"}
                    {pkg.onchain.windowTruncated ? " (capped)" : ""}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-tertiary">Transfer Volume ({pkg.onchain.windowHours}h)</span>
                  <p className="font-mono text-text mt-0.5 font-medium">
                    {pkg.onchain.transferVolumeUsdt !== null
                      ? `$${Math.round(pkg.onchain.transferVolumeUsdt).toLocaleString()} USDT`
                      : "Data unavailable"}
                  </p>
                </div>
              </div>

              {pkg.asset.contracts.length > 0 && (
                <div className="pt-2 border-t border-border/50">
                  <span className="text-[10px] uppercase text-tertiary">Smart Contract Deployments</span>
                  <div className="mt-1 space-y-1">
                    {pkg.asset.contracts.map((c, i) => (
                      <div key={i} className="flex items-center justify-between text-[11px] font-mono bg-surface-raised/60 p-1.5 rounded">
                        <span className="text-muted">{c.chain}</span>
                        <span className="text-text truncate max-w-[260px]">{c.address}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-muted leading-relaxed">
              {pkg.onchain.note || "On-chain collector returned unavailable or was skipped."}
            </p>
          )}
        </section>

        {/* News & Macro Events Panel */}
        <section className="rounded-2xl border border-border bg-surface p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div className="flex items-center gap-2">
              <Icon icon={Globe} size={16} className="text-warning" />
              <h2 className="text-sm font-semibold text-text">News & Macro Events</h2>
            </div>
            <span
              className={`rounded px-2 py-0.5 font-mono text-[10px] font-semibold uppercase ${
                pkg.news.status === "OK"
                  ? "bg-positive/15 text-positive"
                  : "bg-surface-raised text-tertiary"
              }`}
            >
              {pkg.news.items.length} items ({pkg.news.windowHours}h)
            </span>
          </div>

          {pkg.news.items.length > 0 ? (
            <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
              {pkg.news.items.map((n) => (
                <article key={n.id} className="rounded-lg border border-border/60 bg-surface-raised/40 p-2.5 text-xs">
                  <div className="flex items-center justify-between text-[10px] text-muted">
                    <span className="font-semibold text-tertiary">{n.source}</span>
                    <span className="font-mono">{new Date(n.publishedAt).toLocaleDateString()}</span>
                  </div>
                  <a
                    href={n.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 block font-medium text-text hover:text-accent line-clamp-2 leading-snug"
                  >
                    {n.title} <Icon icon={ExternalLink} size={10} className="inline ml-0.5 opacity-60" />
                  </a>
                </article>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted leading-relaxed">
              No recent news headlines captured within the {pkg.news.windowHours}h window.
            </p>
          )}
        </section>
      </div>

      {/* Atomic Evidence Items & Gaps */}
      <section className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="rounded-2xl border border-border bg-surface p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div className="flex items-center gap-2">
              <Icon icon={Layers} size={16} className="text-text" />
              <h2 className="text-sm font-semibold text-text">Atomic Evidence Items ({pkg.evidence.length})</h2>
            </div>
            <span className="text-[10px] text-muted">Directly citeable by ID</span>
          </div>

          <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
            {pkg.evidence.map((item) => (
              <article key={item.id} className="rounded-xl border border-border bg-surface-raised/50 p-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-mono text-[10px] font-semibold text-brand">
                    {item.kind} · {item.id}
                  </span>
                  <span className="text-[11px] text-tertiary truncate">{item.source}</span>
                </div>
                <p className="mt-1.5 text-xs text-text leading-relaxed">{item.statement}</p>
                <p className="mt-1 font-mono text-[10px] text-muted">
                  Observed {new Date(item.observedAt).toLocaleTimeString()}
                  {item.value !== undefined ? ` · Raw value: ${item.value} ${item.unit || ""}` : ""}
                </p>
              </article>
            ))}
          </div>
        </div>

        {/* Gaps, Caveats & Raw JSON */}
        <aside className="space-y-6">
          <div className="rounded-2xl border border-border bg-surface p-6">
            <div className="flex items-center gap-2 border-b border-border/60 pb-3">
              <Icon icon={AlertTriangle} size={16} className="text-warning" />
              <h2 className="text-sm font-semibold text-text">Known Gaps & Limitations</h2>
            </div>
            <ul className="mt-3 space-y-2 text-xs text-muted">
              {pkg.gaps.length ? (
                pkg.gaps.map((gap, i) => <li key={i}>• {gap}</li>)
              ) : (
                <li>No material gaps reported for this snapshot.</li>
              )}
            </ul>
          </div>

          <details className="rounded-2xl border border-border bg-surface p-6">
            <summary className="cursor-pointer select-none text-xs font-semibold text-text hover:text-brand">
              View Complete Raw Evidence Package (JSON)
            </summary>
            <pre className="mt-3 max-h-80 overflow-auto rounded-lg bg-surface-raised p-3 font-mono text-[10px] leading-relaxed text-muted">
              {JSON.stringify(pkg, null, 2)}
            </pre>
          </details>
        </aside>
      </section>

      {/* Mandatory Financial Disclaimer Footer (§34) */}
      <footer className="rounded-xl border border-border/80 bg-surface/50 p-4 text-center text-xs text-muted backdrop-blur-xs">
        <div className="flex items-center justify-center gap-1.5 text-tertiary font-semibold uppercase tracking-wider text-[10px]">
          <Icon icon={ShieldCheck} size={14} />
          <span>Regulatory & Advisory Disclaimer</span>
        </div>
        <p className="mt-1 text-[11px] text-muted max-w-2xl mx-auto leading-relaxed">
          Bitget rVue is strictly an advisory research and synthesis assistant. All metrics are computed deterministically from Bitget, Yahoo Finance, and block explorers. AI commentary is advisory-only and does NOT constitute financial or investment advice. Human review and approval is required before taking any market action.
        </p>
      </footer>
    </div>
  );
}
