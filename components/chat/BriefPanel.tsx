"use client";

import React from "react";
import type { ResearchBrief } from "@/lib/ai/prompts";
import type { EvidencePackage } from "@/lib/evidence/types";
import { renderWithCitations } from "./CitationChip";
import { ClaimRow } from "./ClaimRow";

interface BriefPanelProps {
  brief: ResearchBrief;
  evidence: EvidencePackage | null;
  onCitationClick?: (id: string) => void;
}

export function BriefPanel({ brief, evidence, onCitationClick }: BriefPanelProps) {
  const signalColor: Record<string, string> = {
    CONFIRMATION: "bg-positive/15 text-positive border-positive/25",
    DIVERGENCE: "bg-warning/15 text-warning border-warning/25",
    NO_SIGNAL: "bg-surface-raised text-muted border-border",
    INSUFFICIENT_EVIDENCE: "bg-surface-raised text-tertiary border-border",
  };

  return (
    <details className="mt-2.5 rounded-lg border border-border bg-surface transition-colors" open>
      <summary className="cursor-pointer select-none px-3 py-2 text-xs font-medium text-muted hover:text-text">
        Structured AI Research Brief
      </summary>
      <div className="space-y-3.5 border-t border-border/50 px-3 py-3">
        {/* Signal + Confidence + Advisory Disclaimer */}
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={
              "rounded-md border px-2 py-0.5 font-mono text-[11px] font-medium " +
              (signalColor[brief.signal] ?? signalColor.NO_SIGNAL)
            }
          >
            {brief.signal === "NO_SIGNAL" ? "NO MATERIAL SIGNAL" :
             brief.signal === "DIVERGENCE" ? "MATERIAL DIVERGENCE" :
             brief.signal === "CONFIRMATION" ? "WATCH (CONFIRMATION)" :
             brief.signal === "INSUFFICIENT_EVIDENCE" ? "INSUFFICIENT EVIDENCE" : brief.signal}
          </span>
          <span className="rounded-md border border-border bg-surface-raised px-2 py-0.5 font-mono text-[11px] text-muted">
            Confidence: {brief.confidence}
          </span>
          <span className="ml-auto rounded-md border border-warning/20 bg-warning/10 px-2 py-0.5 font-mono text-[10px] font-medium text-warning uppercase tracking-wide">
            Advisory Only - Human Approval Required
          </span>
        </div>

        {/* Summary */}
        {brief.summary && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-tertiary">
              Summary
            </p>
            <p className="mt-1 text-xs leading-relaxed text-text">
              {renderWithCitations(brief.summary, evidence, onCitationClick)}
            </p>
          </div>
        )}

        {/* What changed */}
        {brief.whatChanged && brief.whatChanged.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-tertiary">
              What changed
            </p>
            <ul className="mt-1 space-y-1">
              {brief.whatChanged.map((item, i) => (
                <li key={i} className="text-xs text-text">
                  • {renderWithCitations(item, evidence, onCitationClick)}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Why it matters */}
        {brief.whyItMatters && brief.whyItMatters.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-tertiary">
              Why it matters
            </p>
            <ul className="mt-1 space-y-1">
              {brief.whyItMatters.map((item, i) => (
                <li key={i} className="text-xs text-text">
                  • {renderWithCitations(item, evidence, onCitationClick)}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Key Signals (§13) */}
        {brief.keySignals && brief.keySignals.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-tertiary">
              Key Macro & Market Signals
            </p>
            <ul className="mt-1 space-y-1">
              {brief.keySignals.map((item, i) => (
                <li key={i} className="text-xs text-text">
                  ⚡ {renderWithCitations(item, evidence, onCitationClick)}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Supporting Evidence (§13) */}
        {brief.supportingEvidence && brief.supportingEvidence.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-tertiary">
              Supporting Evidence
            </p>
            <ul className="mt-1 space-y-1">
              {brief.supportingEvidence.map((item, i) => (
                <li key={i} className="text-xs text-text">
                  ✓ {renderWithCitations(item, evidence, onCitationClick)}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Conflicting Evidence (§13) */}
        {brief.conflictingEvidence && brief.conflictingEvidence.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-tertiary">
              Conflicting Evidence / Counter-indicators
            </p>
            <ul className="mt-1 space-y-1">
              {brief.conflictingEvidence.map((item, i) => (
                <li key={i} className="text-xs text-muted">
                  ⊘ {renderWithCitations(item, evidence, onCitationClick)}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Risks (§13) */}
        {brief.risks && brief.risks.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-tertiary">
              Structural & Execution Risks
            </p>
            <ul className="mt-1 space-y-1">
              {brief.risks.map((item, i) => (
                <li key={i} className="text-xs text-warning/90">
                  ⚠ {renderWithCitations(item, evidence, onCitationClick)}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Uncertainty */}
        {brief.uncertainty && brief.uncertainty.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-tertiary">
              Uncertainty & Gaps
            </p>
            <ul className="mt-1 space-y-1">
              {brief.uncertainty.map((item, i) => (
                <li key={i} className="text-xs text-muted">
                  ? {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Claims */}
        {brief.claims && brief.claims.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-tertiary">
              Audited Claims ({brief.claims.length})
            </p>
            <div className="mt-1.5 space-y-1.5">
              {brief.claims.map((claim) => (
                <ClaimRow key={claim.id} claim={claim} onCitationClick={onCitationClick} />
              ))}
            </div>
          </div>
        )}
      </div>
    </details>
  );
}
