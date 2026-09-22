"use client";

import React from "react";
import type { BriefClaim } from "@/lib/ai/prompts";
import { CitationChip } from "./CitationChip";

interface ClaimRowProps {
  claim: BriefClaim;
  onCitationClick?: (id: string) => void;
}

export function ClaimRow({ claim, onCitationClick }: ClaimRowProps) {
  const kindColor: Record<string, string> = {
    FACT: "bg-positive/15 text-positive border-positive/25",
    COMPUTED: "bg-accent/15 text-accent border-accent/25",
    INTERPRETATION: "bg-warning/15 text-warning border-warning/25",
    UNKNOWN: "bg-surface-raised text-tertiary border-border",
  };

  return (
    <div className="flex flex-col gap-1 rounded-md border border-border/60 bg-surface/50 p-2 text-xs">
      <div className="flex items-center gap-2">
        <span
          className={
            "shrink-0 rounded border px-1.5 py-0.5 font-mono text-[10px] font-medium " +
            (kindColor[claim.kind] ?? kindColor.UNKNOWN)
          }
        >
          {claim.kind}
        </span>
        <span className="font-mono text-[10px] text-tertiary">#{claim.id}</span>
        {claim.unverified && (
          <span className="rounded bg-negative/10 px-1 py-0.5 text-[10px] font-medium text-negative">
            unverified
          </span>
        )}
      </div>

      <p className={"text-text leading-relaxed " + (claim.unverified ? "opacity-75" : "")}>
        {claim.statement}
      </p>

      {claim.evidenceIds.length > 0 && (
        <div className="flex flex-wrap items-center gap-1 pt-0.5">
          <span className="font-mono text-[10px] text-tertiary">Cites:</span>
          {claim.evidenceIds.map((id) => (
            <CitationChip key={id} id={id} resolved={true} onClick={onCitationClick} />
          ))}
        </div>
      )}
    </div>
  );
}
