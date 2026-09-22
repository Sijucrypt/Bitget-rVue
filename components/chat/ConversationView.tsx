"use client";

// ConversationView — the main chat component. Handles streaming, message
// rendering, citations, evidence display, and local persistence. All numbers
// displayed come from the EvidencePackage, never parsed from model text.

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { EvidencePackage } from "@/lib/evidence/types";
import type { ResearchBrief } from "@/lib/ai/prompts";
import type { ChatMessage, Conversation } from "@/lib/chat/types";
import {
  getConversation,
  createConversation,
  appendMessage,
  patchMessage,
  upsertConversation,
} from "@/lib/chat/store";
import { streamChat } from "@/lib/chat/client";
import { Composer } from "./Composer";
import { SuggestedPrompts } from "./SuggestedPrompts";
import { MessageItem } from "./MessageItem";
import { EvidenceRail } from "./EvidenceRail";
import { MarketStatus } from "@/components/ui/MarketStatus";
import { Icon } from "@/components/ui/Icon";
import {
  AlertTriangle,
  RefreshCw,
  Layers,
  LayoutDashboard,
  ShieldAlert,
  ArrowRight,
} from "lucide-react";

interface ConversationViewProps {
  conversationId: string;
  initialRToken?: string;
}

const COMMON_RTOKENS = ["rTSLA", "rAAPL", "rNVDA", "rMSFT", "rSPY", "rAMZN"];

export function ConversationView({ conversationId, initialRToken }: ConversationViewProps) {
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [rToken, setRToken] = useState<string | null>(initialRToken ?? null);
  const [streaming, setStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [evidence, setEvidence] = useState<EvidencePackage | null>(null);
  const [brief, setBrief] = useState<ResearchBrief | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [lastError, setLastError] = useState<{ code: string; message: string } | null>(null);
  const [focusedCitationId, setFocusedCitationId] = useState<string | null>(null);
  const [isRailOpen, setIsRailOpen] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const userAtBottomRef = useRef(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Load conversation from local storage on mount.
  useEffect(() => {
    let conv = getConversation(conversationId);
    if (!conv) {
      conv = createConversation({ id: conversationId, rToken: initialRToken ?? null });
    }
    setConversation(conv);
    setRToken(conv.rToken);
  }, [conversationId, initialRToken]);

  // Track if user is near bottom for auto-scroll.
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    function onScroll() {
      if (!container) return;
      const threshold = 80;
      userAtBottomRef.current = container.scrollHeight - container.scrollTop - container.clientHeight < threshold;
    }
    container.addEventListener("scroll", onScroll, { passive: true });
    return () => container.removeEventListener("scroll", onScroll);
  }, []);

  // Auto-scroll on new content if user is at bottom.
  useEffect(() => {
    if (userAtBottomRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [streamingContent, conversation?.messages.length]);

  const handleSend = useCallback(
    async (text: string) => {
      if (!conversation) return;
      if (streaming) return;

      // Enforce rToken pin — the backend requires one.
      if (!rToken) {
        setLastError({ code: "no_rtoken", message: "Pin an rToken before sending a message." });
        return;
      }

      setLastError(null);
      setStreamingContent("");
      setStatusMessage(null);
      setBrief(null);
      setWarnings([]);

      // Add user message.
      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: text,
        createdAt: Date.now(),
        status: "complete",
      };
      const updated = appendMessage(conversationId, userMsg);
      if (updated) {
        // Auto-title from first user message.
        if (updated.messages.filter((m) => m.role === "user").length === 1) {
          const title = rToken
            ? `${rToken} — ${text.slice(0, 40)}`
            : text.slice(0, 50);
          updated.title = title;
          upsertConversation(updated);
        }
        setConversation({ ...updated });
      }

      // Create placeholder assistant message.
      const assistantId = crypto.randomUUID();
      const assistantMsg: ChatMessage = {
        id: assistantId,
        role: "assistant",
        content: "",
        createdAt: Date.now(),
        status: "streaming",
      };
      const withAssistant = appendMessage(conversationId, assistantMsg);
      if (withAssistant) setConversation({ ...withAssistant });

      setStreaming(true);
      const controller = new AbortController();
      abortRef.current = controller;

      let fullContent = "";

      await streamChat(
        { conversationId, rToken: rToken ?? undefined, message: text, signal: controller.signal },
        {
          onStatus(payload) {
            setStatusMessage(payload.message);
          },
          onEvidence(pkg) {
            setEvidence(pkg);
            setIsRailOpen(true); // Automatically expose evidence rail when evidence arrives
            setStatusMessage("Evidence package received. Generating research brief…");
          },
          onToken(delta) {
            fullContent += delta;
            setStreamingContent(fullContent);
            setStatusMessage(null);
          },
          onDone(payload) {
            setBrief(payload.brief);
            setWarnings(payload.warnings);
            const patched = patchMessage(conversationId, assistantId, {
              content: fullContent,
              status: "complete",
              evidenceIds: payload.brief?.claims.flatMap((c) => c.evidenceIds) ?? [],
            });
            if (patched) setConversation({ ...patched });
            setStreamingContent("");
            setStatusMessage(null);
          },
          onError(payload) {
            setLastError(payload);
            const patched = patchMessage(conversationId, assistantId, {
              content: fullContent || "Research brief synthesis failed. Deterministic evidence remains inspectable in the Evidence Rail.",
              status: "error",
              errorCode: payload.code,
            });
            if (patched) setConversation({ ...patched });
            setStreamingContent("");
            setStatusMessage(null);
            // Notice: We keep evidence and isRailOpen intact so evidence is still inspectable!
          },
        },
      );

      setStreaming(false);
      abortRef.current = null;
    },
    [conversation, conversationId, rToken, streaming],
  );

  function handleStop() {
    abortRef.current?.abort();
  }

  function handleRetry() {
    if (!conversation) return;
    const lastUser = [...conversation.messages].reverse().find((m) => m.role === "user");
    if (!lastUser) return;
    // Remove the failed assistant message.
    const messages = conversation.messages.filter(
      (m) => !(m.role === "assistant" && m.status === "error"),
    );
    const cleaned = { ...conversation, messages };
    upsertConversation(cleaned);
    setConversation(cleaned);
    setLastError(null);
    handleSend(lastUser.content);
  }

  const messages = conversation?.messages ?? [];
  const isEmpty = messages.length === 0 && !streaming;

  return (
    <div className="flex h-full overflow-hidden">
      {/* Main Column */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Messages area */}
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-[780px] px-4 py-6 sm:px-6">
            {isEmpty ? (
              /* Analyst Workstation Empty State (§40) */
              <div className="flex flex-col items-center pt-8 text-center sm:pt-12">
                <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-brand/30 bg-brand/10 px-3 py-1 text-xs font-medium text-brand">
                  <span>Bitget rVue</span>
                  <span className="text-tertiary">•</span>
                  <span>7x24 rToken Research Desk</span>
                </div>

                <h2 className="text-2xl font-bold tracking-tight text-text sm:text-3xl">
                  Tokenized U.S. Stocks Intelligence
                </h2>
                <p className="mt-2.5 max-w-xl text-sm leading-relaxed text-muted">
                  rTokens trade continuously on Bitget while underlying U.S. equities trade only during official sessions.
                  Examine divergence, on-chain liquidity, and macro drivers with strict evidence discipline.
                </p>

                {/* Quick Asset Selector */}
                <div className="mt-6 flex flex-col items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-tertiary">
                    Select or Pin Target rToken
                  </span>
                  <div className="flex flex-wrap justify-center gap-1.5">
                    {COMMON_RTOKENS.map((token) => (
                      <button
                        key={token}
                        type="button"
                        onClick={() => {
                          setRToken(token);
                          if (conversation) {
                            const updated = { ...conversation, rToken: token };
                            upsertConversation(updated);
                            setConversation(updated);
                          }
                        }}
                        className={`rounded-lg border px-3 py-1 font-mono text-xs font-semibold transition-all ${
                          rToken === token
                            ? "border-brand bg-brand/15 text-brand shadow-xs"
                            : "border-border bg-surface text-muted hover:border-brand/40 hover:text-text"
                        }`}
                      >
                        {token}
                      </button>
                    ))}
                  </div>

                  <div className="mt-2 flex items-center gap-2">
                    <input
                      id="rtoken-custom-pin"
                      type="text"
                      placeholder="Or enter symbol (e.g. rCOIN)"
                      value={rToken ?? ""}
                      onChange={(e) => {
                        const val = e.target.value.trim() || null;
                        setRToken(val);
                        if (conversation) {
                          const updated = { ...conversation, rToken: val };
                          upsertConversation(updated);
                          setConversation(updated);
                        }
                      }}
                      className="w-56 rounded-md border border-border bg-surface px-3 py-1.5 font-mono text-xs text-text placeholder:text-tertiary focus:border-brand focus:outline-none"
                    />
                    {rToken && (
                      <button
                        type="button"
                        onClick={() => {
                          setRToken(null);
                          if (conversation) {
                            const updated = { ...conversation, rToken: null };
                            upsertConversation(updated);
                            setConversation(updated);
                          }
                        }}
                        className="rounded-md px-2 py-1 text-xs text-tertiary hover:text-text"
                        title="Clear asset"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>

                {/* Desk Direct Link Banner */}
                <div className="mt-6 flex items-center gap-3">
                  <Link
                    href="/rtokens"
                    className="inline-flex items-center gap-1.5 text-xs text-brand hover:underline font-medium"
                  >
                    <Icon icon={LayoutDashboard} size={13} />
                    View 7x24 Divergence Board
                    <Icon icon={ArrowRight} size={11} />
                  </Link>
                </div>

                {/* Suggested Starters */}
                <SuggestedPrompts
                  rToken={rToken}
                  onSelect={(prompt) => handleSend(prompt)}
                  disabled={streaming || !rToken}
                />
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {/* 24/7 Market Status Header when Evidence is Loaded (§19) */}
                {evidence && (
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
                    <MarketStatus
                      marketState={evidence.underlying.marketState}
                      underlyingTicker={evidence.asset.underlyingTicker}
                      sessionAnchor={evidence.underlying.previousClose}
                      currency={evidence.underlying.currency}
                    />

                    <button
                      type="button"
                      onClick={() => setIsRailOpen(!isRailOpen)}
                      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors ${
                        isRailOpen
                          ? "border-brand bg-brand/10 text-brand"
                          : "border-border bg-surface text-muted hover:text-text"
                      }`}
                    >
                      <Icon icon={Layers} size={13} />
                      {isRailOpen ? "Hide Rail" : "Evidence Rail"}
                      <span className="rounded bg-surface-raised px-1 py-0.2 font-mono text-[10px]">
                        {evidence.evidence.length}
                      </span>
                    </button>
                  </div>
                )}

                {messages.map((msg) => (
                  <MessageItem
                    key={msg.id}
                    message={msg}
                    evidence={evidence}
                    brief={msg.role === "assistant" && msg.status === "complete" ? brief : null}
                    onCitationClick={(id) => {
                      setFocusedCitationId(id);
                      setIsRailOpen(true);
                    }}
                  />
                ))}

                {/* Streaming assistant message */}
                {streaming && streamingContent && (
                  <MessageItem
                    message={{
                      id: "streaming",
                      role: "assistant",
                      content: streamingContent,
                      createdAt: Date.now(),
                      status: "streaming",
                    }}
                    evidence={evidence}
                    brief={null}
                    onCitationClick={(id) => {
                      setFocusedCitationId(id);
                      setIsRailOpen(true);
                    }}
                  />
                )}

                {/* Streaming indicator with phase-aware status */}
                {streaming && !streamingContent && (
                  <div className="flex items-center gap-3 rounded-lg border border-border bg-surface px-4 py-3" aria-live="polite">
                    <div className="flex items-center gap-1.5">
                      <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-brand" />
                      <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-brand [animation-delay:200ms]" />
                      <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-brand [animation-delay:400ms]" />
                    </div>
                    <span className="text-sm text-muted">
                      {statusMessage
                        ?? (evidence
                          ? "Reasoning and generating research brief…"
                          : `Fetching deterministic evidence package for ${rToken}…`)}
                    </span>
                  </div>
                )}

                {/* Warnings */}
                {warnings.length > 0 && !streaming && (
                  <div className="rounded-lg border border-warning/30 bg-warning/5 px-4 py-3">
                    <p className="flex items-center gap-2 text-xs font-medium text-warning">
                      <Icon icon={AlertTriangle} size={14} />
                      {warnings.length} validation {warnings.length === 1 ? "warning" : "warnings"}
                    </p>
                    <ul className="mt-1.5 space-y-0.5 text-xs text-muted">
                      {warnings.map((w, i) => (
                        <li key={i} className="font-mono text-[11px]">{w}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Error state */}
                {lastError && !streaming && (
                  <div className="rounded-lg border border-negative/30 bg-negative/5 px-4 py-3" role="alert">
                    <div className="flex items-center gap-2 text-sm font-semibold text-negative">
                      <Icon icon={ShieldAlert} size={16} />
                      <span>{lastError.code}</span>
                    </div>
                    <p className="mt-1 text-xs text-muted leading-relaxed">
                      {lastError.message}
                    </p>
                    {evidence && (
                      <p className="mt-2 text-[11px] text-text">
                        The deterministic Evidence Package was retrieved successfully and remains fully inspectable in the Evidence Rail.
                      </p>
                    )}
                    <div className="mt-3 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleRetry}
                        className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-3 py-1.5 text-xs font-medium text-text hover:bg-surface-raised"
                      >
                        <Icon icon={RefreshCw} size={12} />
                        Retry Synthesis
                      </button>
                      {evidence && !isRailOpen && (
                        <button
                          type="button"
                          onClick={() => setIsRailOpen(true)}
                          className="inline-flex items-center gap-1.5 rounded-md border border-brand/30 bg-brand/10 px-3 py-1.5 text-xs font-medium text-brand hover:bg-brand/20"
                        >
                          <Icon icon={Layers} size={12} />
                          Open Evidence Rail
                        </button>
                      )}
                    </div>
                  </div>
                )}

                <div ref={bottomRef} />
              </div>
            )}
          </div>
        </div>

        {/* Evidence freshness bar (§26) */}
        {evidence && (
          <div className="border-t border-border bg-surface/80 px-4 py-1.5 backdrop-blur-xs flex items-center justify-between text-[11px]">
            <span className="font-mono tabular-nums text-tertiary">
              Evidence timestamp:{" "}
              <strong className="text-text font-normal">{new Date(evidence.generatedAt).toLocaleTimeString()}</strong> ·{" "}
              {evidence.asset.rToken}/{evidence.asset.underlyingTicker} ·{" "}
              {evidence.evidence.length} items
            </span>

            <button
              type="button"
              onClick={() => setIsRailOpen(!isRailOpen)}
              className="text-tertiary hover:text-text font-mono text-[10px]"
            >
              {isRailOpen ? "Close Rail" : "View Rail →"}
            </button>
          </div>
        )}

        {/* Composer */}
        <Composer
          rToken={rToken}
          disabled={streaming}
          onSend={handleSend}
          onStop={handleStop}
          streaming={streaming}
        />
      </div>

      {/* Side-by-Side Evidence Rail (§16) */}
      <EvidenceRail
        evidence={evidence}
        isOpen={isRailOpen}
        onClose={() => setIsRailOpen(false)}
        focusedCitationId={focusedCitationId}
      />
    </div>
  );
}
