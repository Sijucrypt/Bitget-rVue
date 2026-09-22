export function SummaryChips({
  universe,
  flagged,
  ok,
  durationMs,
  status,
}: {
  universe: number | string;
  flagged: number | string;
  ok: number | string;
  durationMs: number | null;
  status: string;
}) {
  function Stat({ label, value, detail, accent = false }: { label: string; value: string; detail: string; accent?: boolean }) {
    return (
      <div className="rounded-2xl border border-border bg-surface px-4 py-3 shadow-sm">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-tertiary">
          {label}
        </p>
        <p className={(accent ? "text-brand " : "text-text ") + "mt-1 font-mono text-xl font-semibold tabular-nums"}>
          {value}
        </p>
        <p className="mt-0.5 text-xs text-muted">
          {detail}
        </p>
      </div>
    );
  }

  return (
    <section aria-label="Scan summary" className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Stat label="Universe" value={String(universe)} detail="Live Bitget rTokens" />
      <Stat label="Flagged" value={String(flagged)} detail="Material divergence detected" accent />
      <Stat label="Aligned quotes" value={String(ok)} detail="Underlying data available" />
      <Stat
        label="Scan status"
        value={durationMs !== null ? `${(durationMs / 1_000).toFixed(1)}s` : "—"}
        detail={status}
      />
    </section>
  );
}
