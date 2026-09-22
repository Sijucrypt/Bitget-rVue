"use client";

import React from "react";
import type { EvidencePackage } from "@/lib/evidence/types";

interface CitationChipProps {
  id: string;
  resolved: boolean;
  onClick?: (id: string) => void;
}

export function CitationChip({ id, resolved, onClick }: CitationChipProps) {
  return (
    <span
      onClick={resolved && onClick ? () => onClick(id) : undefined}
      className={
        "mx-0.5 inline-flex rounded-md px-1.5 py-0.5 font-mono text-[10px] tabular-nums " +
        (resolved
          ? "bg-accent/15 text-accent border border-accent/20 cursor-pointer hover:bg-accent hover:text-accent-contrast transition-colors"
          : "bg-negative/10 text-negative border border-negative/20")
      }
      title={resolved ? `Evidence: ${id}` : `Unresolved citation: ${id}`}
      role={resolved && onClick ? "button" : undefined}
      tabIndex={resolved && onClick ? 0 : undefined}
      onKeyDown={
        resolved && onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick(id);
              }
            }
          : undefined
      }
    >
      {id}
    </span>
  );
}

// Helper to parse strings containing [citationId] and replace with CitationChip
export function renderWithCitations(
  text: string,
  evidence: EvidencePackage | null,
  onCitationClick?: (id: string) => void,
): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const regex = /\[([^\]]+)\]/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const citationId = match[1];
    const resolved = evidence?.evidence.some((e) => e.id === citationId) ?? false;
    parts.push(
      <CitationChip
        key={match.index}
        id={citationId}
        resolved={resolved}
        onClick={onCitationClick}
      />
    );
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  return parts;
}
