"use client";

// Composer — glass chat input bar (spec section 7.4). Auto-sizing textarea,
// Enter sends / Shift+Enter newline, disabled while streaming, shows pinned
// rToken as a chip, and surfaces the last error inline with Retry.

import { useCallback, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { ArrowUp, Square, X } from "lucide-react";

interface ComposerProps {
  rToken: string | null;
  disabled: boolean;
  streaming: boolean;
  onSend: (message: string) => void;
  onStop: () => void;
}

export function Composer({ rToken, disabled, streaming, onSend, onStop }: ComposerProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
    // Reset textarea height.
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  }, [value, disabled, onSend]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  function handleInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setValue(e.target.value);
    // Auto-resize up to 8 rows (~192px).
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 192) + "px";
  }

  return (
    <div className="shrink-0 border-t border-glass-border">
      <div className="glass glass-2 mx-auto flex max-w-[760px] items-end gap-2 rounded-t-2xl px-4 py-3">
        {/* Pinned rToken chip */}
        {rToken && (
          <span className="mb-1 inline-flex items-center gap-1 rounded-md border border-brand/25 bg-brand/10 px-2 py-1 font-mono text-[11px] font-medium text-brand">
            {rToken}
          </span>
        )}

        <textarea
          ref={textareaRef}
          rows={1}
          placeholder={
            rToken
              ? `Ask about ${rToken}…`
              : "Pin an rToken first…"
          }
          value={value}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          disabled={disabled && !streaming}
          className="min-h-[36px] flex-1 resize-none bg-transparent text-sm text-text placeholder:text-tertiary focus:outline-none disabled:opacity-50"
          aria-label="Message input"
        />

        {streaming ? (
          <button
            type="button"
            onClick={onStop}
            className="mb-0.5 shrink-0 rounded-lg bg-negative/15 p-2 text-negative hover:bg-negative/25"
            title="Stop generating"
            aria-label="Stop generating"
          >
            <Icon icon={Square} size={16} />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!value.trim() || disabled}
            className="mb-0.5 shrink-0 rounded-lg bg-accent p-2 text-accent-contrast hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed"
            title="Send message"
            aria-label="Send message"
          >
            <Icon icon={ArrowUp} size={16} />
          </button>
        )}
      </div>
      <div className="mx-auto max-w-[760px] px-4 pb-3 pt-1 text-center">
        <p className="text-[10px] text-tertiary">
          rVue is an advisory research assistant. All signals require human review. No autonomous execution pipeline.
        </p>
      </div>
    </div>
  );
}
