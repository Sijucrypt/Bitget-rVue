"use client";

import { useEffect, useRef, useState } from "react";
import type { EvidencePackage, EvidenceItem } from "@/lib/evidence/types";
import { Icon } from "@/components/ui/Icon";
import {
  X,
  Copy,
  Check,
  FileJson,
  List,
  AlertTriangle,
  TrendingUp,
  Activity,
  Globe,
  Layers,
  ExternalLink,
} from "lucide-react";

interface EvidenceRailProps {
  evidence: EvidencePackage | null;
  isOpen: boolean;
  onClose: () => void;
  focusedCitationId: string | null;
}

type DomainTab = "all" | "market" | "onchain" | "news" | "items";

export function EvidenceRail({ evidence, isOpen, onClose, focusedCitationId }: EvidenceRailProps) {
  const [view, setView] = useState<"list" | "json">("list");
  const [activeTab, setActiveTab] = useState<DomainTab>("all");
  const [copied, setCopied] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Scroll to focused citation when it changes
  useEffect(() => {
    if (focusedCitationId && view === "list" && isOpen) {
      setActiveTab("all"); // Ensure items are visible
      setTimeout(() => {
        const el = itemRefs.current.get(focusedCitationId);
        if (el && containerRef.current) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          el.classList.add("bg-accent/25", "ring-2", "ring-accent");
          setTimeout(() => {
            el.classList.remove("bg-accent/25", "ring-2", "ring-accent");
          }, 2500);
        }
      }, 50);
    }
  }, [focusedCitationId, view, isOpen]);

  function handleCopyJson() {
    if (!evidence) return;
    navigator.clipboard.writeText(JSON.stringify(evidence, null, 2)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  if (!isOpen || !evidence) return null;

  const { market, underlying, comparison, onchain, news, gaps, evidence: items } = evidence;

  return (
    <div className="hidden w-88 shrink-0 flex-col border-l border-border bg-surface shadow-lg xl:flex">
      {/* Header */}
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4">
        <div className="flex items-center gap-2">
          <Icon icon={Layers} size={16} className="text-brand" />
          <h3 className="text-sm font-semibold text-text">Evidence Rail</h3>
        </div>
        <button
          onClick={onClose}
          className="rounded-md p-1.5 text-tertiary hover:bg-surface-raised hover:text-text"
          title="Close rail"
        >
          <Icon icon={X} size={16} />
        </button>
      </div>

      {/* Human-in-the-Loop Disclaimer */}
      <div className="flex items-center gap-2 border-b border-border bg-warning/5 px-4 py-2">
        <Icon icon={AlertTriangle} size={14} className="shrink-0 text-warning" />
        <p className="font-mono text-[10px] font-semibold uppercase tracking-wider text-warning">
          Advisory Only — Human Approval Required
        </p>
      </div>

      {/* View Toggle (Items vs Raw JSON) */}
      <div className="flex items-center justify-between border-b border-border p-2">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setView("list")}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              view === "list" ? "bg-surface-raised text-text shadow-xs" : "text-tertiary hover:text-text"
            }`}
          >
            <Icon icon={List} size={13} />
            Domains
          </button>
          <button
            onClick={() => setView("json")}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              view === "json" ? "bg-surface-raised text-text shadow-xs" : "text-tertiary hover:text-text"
            }`}
          >
            <Icon icon={FileJson} size={13} />
            Raw JSON
          </button>
        </div>

        <span className="font-mono text-[10px] text-tertiary">
          {new Date(evidence.generatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
        </span>
      </div>

      {/* Domain Sub-tabs when in list view */}
      {view === "list" && (
        <div className="flex items-center gap-1 border-b border-border/70 bg-surface/50 px-2 py-1.5 overflow-x-auto text-[11px]">
          <button
            onClick={() => setActiveTab("all")}
            className={`rounded px-2 py-0.5 font-medium transition-colors ${
              activeTab === "all" ? "bg-surface-raised text-text" : "text-tertiary hover:text-text"
            }`}
          >
            All
          </button>
          <button
            onClick={() => setActiveTab("market")}
            className={`flex items-center gap-1 rounded px-2 py-0.5 font-medium transition-colors ${
              activeTab === "market" ? "bg-surface-raised text-text" : "text-tertiary hover:text-text"
            }`}
          >
            <Icon icon={TrendingUp} size={11} />
            Market
          </button>
          <button
            onClick={() => setActiveTab("onchain")}
            className={`flex items-center gap-1 rounded px-2 py-0.5 font-medium transition-colors ${
              activeTab === "onchain" ? "bg-surface-raised text-text" : "text-tertiary hover:text-text"
            }`}
          >
            <Icon icon={Activity} size={11} />
            On-Chain
          </button>
          <button
            onClick={() => setActiveTab("news")}
            className={`flex items-center gap-1 rounded px-2 py-0.5 font-medium transition-colors ${
              activeTab === "news" ? "bg-surface-raised text-text" : "text-tertiary hover:text-text"
            }`}
          >
            <Icon icon={Globe} size={11} />
            News
          </button>
          <button
            onClick={() => setActiveTab("items")}
            className={`flex items-center gap-1 rounded px-2 py-0.5 font-medium transition-colors ${
              activeTab === "items" ? "bg-surface-raised text-text" : "text-tertiary hover:text-text"
            }`}
          >
            Claims ({items.length})
          </button>
        </div>
      )}

      {/* Content */}
      <div ref={containerRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {view === "list" ? (
          <>
            {/* Gaps Banner */}
            {gaps.length > 0 && (
              <div className="rounded-lg border border-warning/25 bg-warning/10 p-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-warning">
                  Data Gaps ({gaps.length})
                </p>
                <ul className="mt-1 space-y-1">
                  {gaps.map((gap, i) => (
                    <li key={i} className="text-xs text-muted leading-tight">
                      • {gap}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* DOMAIN 1: MARKET COMPARISON */}
            {(activeTab === "all" || activeTab === "market") && (
              <div className="rounded-lg border border-border bg-surface-raised/40 p-3 space-y-2">
                <div className="flex items-center justify-between border-b border-border/50 pb-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-text">
                    <Icon icon={TrendingUp} size={14} className="text-accent" />
                    <span>Market Comparison</span>
                  </div>
                  <span
                    className={`rounded px-1.5 py-0.2 font-mono text-[9px] font-medium uppercase ${
                      comparison.flagged ? "bg-warning/20 text-warning" : "bg-positive/20 text-positive"
                    }`}
                  >
                    {comparison.flagged ? "Divergence Flagged" : "Normal"}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-tertiary uppercase">rToken Price</span>
                    <p className="font-mono tabular-nums text-text font-medium">
                      ${market.rPrice ? market.rPrice.toFixed(2) : "Data unavailable"} USDT
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] text-tertiary uppercase">Underlying</span>
                    <p className="font-mono tabular-nums text-text font-medium">
                      ${underlying.price ? underlying.price.toFixed(2) : "Data unavailable"} {underlying.currency || "USD"}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] text-tertiary uppercase">Spread</span>
                    <p className="font-mono tabular-nums text-text">
                      {comparison.spreadPct !== null ? `${comparison.spreadPct >= 0 ? "+" : ""}${comparison.spreadPct.toFixed(2)}%` : "Data unavailable"}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] text-tertiary uppercase">Divergence</span>
                    <p className="font-mono tabular-nums text-text font-bold">
                      {comparison.divergencePp !== null ? `${comparison.divergencePp >= 0 ? "+" : ""}${comparison.divergencePp.toFixed(2)}pp` : "Data unavailable"}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] text-tertiary uppercase">Session Anchor</span>
                    <p className="font-mono tabular-nums text-muted text-[11px]">
                      ${underlying.previousClose ? underlying.previousClose.toFixed(2) : "Data unavailable"}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] text-tertiary uppercase">Threshold</span>
                    <p className="font-mono tabular-nums text-muted text-[11px]">
                      ±{comparison.thresholdPp.toFixed(2)}pp
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* DOMAIN 2: ON-CHAIN ACTIVITY */}
            {(activeTab === "all" || activeTab === "onchain") && (
              <div className="rounded-lg border border-border bg-surface-raised/40 p-3 space-y-2">
                <div className="flex items-center justify-between border-b border-border/50 pb-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-text">
                    <Icon icon={Activity} size={14} className="text-brand" />
                    <span>On-Chain Activity</span>
                  </div>
                  <span
                    className={`rounded px-1.5 py-0.2 font-mono text-[9px] font-medium uppercase ${
                      onchain.status === "OK"
                        ? "bg-positive/15 text-positive"
                        : "bg-surface-raised text-tertiary"
                    }`}
                  >
                    {onchain.status}
                  </span>
                </div>

                {onchain.status === "OK" ? (
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] text-tertiary uppercase">Network</span>
                      <p className="font-mono text-text text-[11px]">{onchain.chain ?? "Arbitrum"}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-tertiary uppercase">Holders</span>
                      <p className="font-mono tabular-nums text-text font-medium">
                        {onchain.holdersCount !== null ? onchain.holdersCount.toLocaleString() : "Data unavailable"}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] text-tertiary uppercase">Transfers ({onchain.windowHours}h)</span>
                      <p className="font-mono tabular-nums text-text">
                        {onchain.transfersInWindow !== null ? onchain.transfersInWindow.toLocaleString() : "Data unavailable"}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] text-tertiary uppercase">Volume ({onchain.windowHours}h)</span>
                      <p className="font-mono tabular-nums text-text">
                        {onchain.transferVolumeUsdt !== null ? `$${Math.round(onchain.transferVolumeUsdt).toLocaleString()} USDT` : "Data unavailable"}
                      </p>
                    </div>
                    {onchain.address && (
                      <div className="col-span-2 pt-1">
                        <span className="text-[10px] text-tertiary uppercase">Contract</span>
                        <p className="font-mono text-[10px] text-muted truncate">{onchain.address}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-muted">
                    {onchain.note || "On-chain collector returned unavailable or skipped."}
                  </p>
                )}
              </div>
            )}

            {/* DOMAIN 3: NEWS & MACRO */}
            {(activeTab === "all" || activeTab === "news") && (
              <div className="rounded-lg border border-border bg-surface-raised/40 p-3 space-y-2">
                <div className="flex items-center justify-between border-b border-border/50 pb-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-text">
                    <Icon icon={Globe} size={14} className="text-warning" />
                    <span>News & Macro Events</span>
                  </div>
                  <span
                    className={`rounded px-1.5 py-0.2 font-mono text-[9px] font-medium uppercase ${
                      news.status === "OK" ? "bg-positive/15 text-positive" : "bg-surface-raised text-tertiary"
                    }`}
                  >
                    {news.items.length} items ({news.windowHours}h)
                  </span>
                </div>

                {news.items.length > 0 ? (
                  <div className="space-y-2">
                    {news.items.slice(0, 5).map((item) => (
                      <div key={item.id} className="rounded border border-border/60 bg-surface/70 p-2 text-xs">
                        <div className="flex items-center justify-between gap-1 text-[10px] text-muted">
                          <span className="truncate font-medium text-tertiary">{item.source}</span>
                          <span className="shrink-0 font-mono">
                            {new Date(item.publishedAt).toLocaleDateString([], { month: "short", day: "numeric" })}
                          </span>
                        </div>
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1 block text-text hover:text-accent line-clamp-2 leading-snug"
                        >
                          {item.title} <Icon icon={ExternalLink} size={10} className="inline ml-0.5 opacity-60" />
                        </a>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted">
                    No material news headlines found in the {news.windowHours}h window.
                  </p>
                )}
              </div>
            )}

            {/* DOMAIN 4: ATOMIC EVIDENCE ITEMS & CITATIONS */}
            {(activeTab === "all" || activeTab === "items") && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-muted px-1">
                  <span className="font-semibold text-text text-xs">Evidence Items ({items.length})</span>
                  <span className="text-[10px]">Click citations to view</span>
                </div>

                <div className="space-y-2">
                  {items.map((item) => (
                    <EvidenceCard
                      key={item.id}
                      item={item}
                      setRef={(el) => {
                        if (el) itemRefs.current.set(item.id, el);
                        else itemRefs.current.delete(item.id);
                      }}
                      isFocused={item.id === focusedCitationId}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          /* RAW JSON VIEW */
          <div className="relative group">
            <button
              onClick={handleCopyJson}
              className="absolute right-2 top-2 z-10 flex items-center gap-1.5 rounded-md border border-border bg-surface/90 px-2.5 py-1 text-[11px] font-medium text-text backdrop-blur opacity-0 transition-opacity group-hover:opacity-100 shadow-sm"
            >
              <Icon icon={copied ? Check : Copy} size={12} />
              {copied ? "Copied" : "Copy JSON"}
            </button>
            <pre className="overflow-x-auto rounded-lg bg-surface-raised p-3 font-mono text-[11px] text-muted">
              {JSON.stringify(evidence, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

function EvidenceCard({
  item,
  setRef,
  isFocused,
}: {
  item: EvidenceItem;
  setRef: (el: HTMLDivElement | null) => void;
  isFocused: boolean;
}) {
  const kindColor: Record<string, string> = {
    FACT: "bg-positive/15 text-positive border-positive/20",
    COMPUTED: "bg-accent/15 text-accent border-accent/20",
    INTERPRETATION: "bg-warning/15 text-warning border-warning/20",
    UNKNOWN: "bg-surface-raised text-tertiary border-border",
  };

  return (
    <div
      ref={setRef}
      id={`evidence-${item.id}`}
      className={`rounded-lg border p-2.5 transition-all duration-300 ${
        isFocused
          ? "border-brand bg-brand/10 shadow-[0_0_0_1px_var(--brand)]"
          : "border-border bg-surface hover:bg-surface-raised"
      }`}
    >
      <div className="mb-1.5 flex items-center justify-between">
        <span className="font-mono text-[10px] font-semibold text-text">{item.id}</span>
        <span
          className={`rounded border px-1.5 py-0.2 font-mono text-[9px] font-medium uppercase tracking-wider ${
            kindColor[item.kind] ?? kindColor.UNKNOWN
          }`}
        >
          {item.kind}
        </span>
      </div>

      <p className="mb-2 text-xs leading-relaxed text-text">{item.statement}</p>

      <div className="flex items-center justify-between text-[10px] text-muted">
        <span className="truncate pr-2" title={item.source}>
          {item.source}
        </span>
        <span className="shrink-0 font-mono font-medium">
          {item.value !== null && item.value !== undefined ? item.value : "--"}{" "}
          {item.unit || ""}
        </span>
      </div>
    </div>
  );
}
