"use client";

// MessageItem — renders a single user or assistant message. User messages are
// right-aligned bubbles; assistant messages are full-width prose with a left
// accent. Citations render as mono chips. A numbers panel shows key figures
// from the Evidence Package (never parsed from model text).

import React, { useState } from "react";
import type { ChatMessage } from "@/lib/chat/types";
import type { EvidencePackage } from "@/lib/evidence/types";
import type { ResearchBrief } from "@/lib/ai/prompts";
import { Icon } from "@/components/ui/Icon";
import { Copy, Check, AlertCircle } from "lucide-react";
import { renderWithCitations } from "./CitationChip";
import { NumbersPanel } from "./NumbersPanel";
import { BriefPanel } from "./BriefPanel";

interface MessageItemProps {
  message: ChatMessage;
  evidence: EvidencePackage | null;
  brief: ResearchBrief | null;
  onCitationClick?: (id: string) => void;
}

export function MessageItem({ message, evidence, brief, onCitationClick }: MessageItemProps) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === "user";
  const isStreaming = message.status === "streaming";
  const isError = message.status === "error";

  function handleCopy() {
    navigator.clipboard.writeText(message.content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-2xl bg-surface-raised px-4 py-3 text-sm text-text">
          {message.content}
        </div>
      </div>
    );
  }

  // Assistant message.
  return (
    <div className="group relative" aria-live={isStreaming ? "polite" : undefined}>
      {/* Left accent bar */}
      <div className="absolute left-0 top-0 bottom-0 w-0.5 rounded-full bg-accent" />

      <div className="pl-4">
        {/* Content */}
        <div className="prose-sm text-sm leading-relaxed text-text">
          {message.content.split("\n").map((line, i) => (
            <p key={i} className={line.trim() === "" ? "h-2" : "mb-1.5"}>
              {renderWithCitations(line, evidence, onCitationClick)}
            </p>
          ))}
          {isStreaming && <span className="inline-block h-4 w-0.5 animate-pulse bg-brand" />}
        </div>

        {/* Error badge */}
        {isError && (
          <span className="mt-1 inline-flex items-center gap-1 rounded-md bg-negative/10 px-2 py-0.5 text-[11px] font-medium text-negative">
            <Icon icon={AlertCircle} size={12} />
            {message.errorCode ?? "error"}
          </span>
        )}

        {/* Numbers panel — deterministic key figures from the Evidence Package */}
        {message.status === "complete" && evidence && (
          <NumbersPanel evidence={evidence} />
        )}

        {/* Brief structured data — signal, confidence, claims, risks */}
        {message.status === "complete" && brief && (
          <BriefPanel brief={brief} evidence={evidence} onCitationClick={onCitationClick} />
        )}

        {/* Actions */}
        {message.status === "complete" && (
          <div className="mt-2 flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-tertiary hover:bg-surface-raised hover:text-text"
              title="Copy response"
            >
              <Icon icon={copied ? Check : Copy} size={12} />
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
