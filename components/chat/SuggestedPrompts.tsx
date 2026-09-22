"use client";

// SuggestedPrompts — three starter prompts (spec section 7.2) that are all
// answerable from the Evidence Package. Prompts adapt to the pinned rToken.

interface SuggestedPromptsProps {
  rToken: string | null;
  onSelect: (prompt: string) => void;
  disabled: boolean;
}

const PROMPTS_TEMPLATE = [
  (t: string) => `Why is ${t} diverging from ${t.replace(/^r/, "")}'s last official close?`,
  (t: string) => `Compare ${t}'s 24h move with the underlying session.`,
  (t: string) => `What changed for ${t} in the last 48 hours, and how confident are we?`,
];

export function SuggestedPrompts({ rToken, onSelect, disabled }: SuggestedPromptsProps) {
  const token = rToken || "rTSLA";
  const prompts = PROMPTS_TEMPLATE.map((fn) => fn(token));

  return (
    <div className="mt-8 flex w-full max-w-lg flex-col gap-2">
      {prompts.map((prompt) => (
        <button
          key={prompt}
          type="button"
          onClick={() => onSelect(prompt)}
          disabled={disabled}
          className="rounded-xl border border-border bg-surface px-4 py-3 text-left text-sm text-muted transition-colors hover:border-brand/30 hover:bg-surface-raised hover:text-text disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {prompt}
        </button>
      ))}
    </div>
  );
}
