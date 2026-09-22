"use client";

import React from "react";
import type { EvidencePackage } from "@/lib/evidence/types";

interface NumbersPanelProps {
  evidence: EvidencePackage;
}

function fmtNum(value: number | null, suffix = "", digits = 2): string {
  if (value === null || !Number.isFinite(value)) return "Data unavailable";
  return `${value >= 0 ? "+" : ""}${value.toFixed(digits)}${suffix}`;
}

function fmtPrice(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "Data unavailable";
  return value.toFixed(2);
}

export function NumbersPanel({ evidence }: NumbersPanelProps) {
  const { market, underlying, comparison } = evidence;
  const rows: [string, string, string?][] = [
    ["rToken Price", `$${fmtPrice(market.rPrice)}`, "USDT"],
    ["rToken 24h", fmtNum(market.rChange24hPct, "%"), ""],
    ["Underlying Price", `$${fmtPrice(underlying.price)}`, underlying.currency],
    ["Market State", underlying.marketState, ""],
    ["Session Anchor", `$${fmtPrice(underlying.previousClose)}`, "Prev Close"],
    ["Spread", fmtNum(comparison.spreadPct, "%"), ""],
    ["Divergence", fmtNum(comparison.divergencePp, "pp"), ""],
    ["Threshold", `±${comparison.thresholdPp.toFixed(2)}pp`, comparison.flagged ? "FLAGGED" : "NORMAL"],
  ];

  return (
    <details className="mt-3 rounded-lg border border-border bg-surface shadow-xs transition-colors">
      <summary className="cursor-pointer select-none px-3 py-2 text-xs font-medium text-muted hover:text-text">
        Evidence Numerics (Deterministic)
      </summary>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 border-t border-border/50 px-3 py-2.5 sm:grid-cols-4">
        {rows.map(([label, value, sub]) => (
          <div key={label} className="flex flex-col">
            <span className="text-[10px] uppercase tracking-wider text-tertiary">{label}</span>
            <span className="font-mono text-xs font-medium tabular-nums text-text">
              {value}
            </span>
            {sub ? <span className="font-mono text-[9px] text-muted">{sub}</span> : null}
          </div>
        ))}
      </div>
    </details>
  );
}
