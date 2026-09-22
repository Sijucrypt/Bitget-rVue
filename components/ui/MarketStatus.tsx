"use client";

import React from "react";

interface MarketStatusProps {
  marketState: string | null;
  underlyingTicker?: string;
  sessionAnchor?: number | null;
  currency?: string;
  className?: string;
}

export function MarketStatus({
  marketState,
  underlyingTicker,
  sessionAnchor,
  currency = "USD",
  className = "",
}: MarketStatusProps) {
  const state = (marketState ?? "UNKNOWN").toUpperCase();

  const isClosed = state === "CLOSED";
  const isOpen = state === "REGULAR";
  const isExtended = state.includes("PRE") || state.includes("POST");

  const badgeStyle = isClosed
    ? "bg-warning/15 text-warning border-warning/30"
    : isOpen
    ? "bg-positive/15 text-positive border-positive/30"
    : isExtended
    ? "bg-accent/15 text-accent border-accent/30"
    : "bg-surface-raised text-tertiary border-border";

  const stateDescription = isClosed
    ? "Underlying exchange closed (24/7 rToken session active)"
    : isOpen
    ? "Official U.S. exchange session regular hours"
    : isExtended
    ? "Extended trading session"
    : "Market session state unknown";

  return (
    <div
      className={`inline-flex flex-wrap items-center gap-2 rounded-lg border border-border bg-surface/70 px-2.5 py-1 text-xs backdrop-blur-xs ${className}`}
    >
      <div className="flex items-center gap-1.5">
        <span
          className={`inline-block h-2 w-2 rounded-full ${
            isOpen ? "bg-positive animate-pulse" : isClosed ? "bg-warning" : "bg-tertiary"
          }`}
        />
        <span className={`rounded border px-1.5 py-0.2 font-mono text-[10px] font-semibold ${badgeStyle}`}>
          {state}
        </span>
      </div>

      <span className="text-[11px] text-muted">{stateDescription}</span>

      {underlyingTicker && sessionAnchor && (
        <span className="ml-auto font-mono text-[10px] text-tertiary">
          Anchor ({underlyingTicker}): <strong className="text-text">${sessionAnchor.toFixed(2)} {currency}</strong>
        </span>
      )}
    </div>
  );
}
