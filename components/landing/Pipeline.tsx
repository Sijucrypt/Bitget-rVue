export function Pipeline() {
  return (
    <section id="pipeline" className="border-t border-border bg-surface/30 py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <span className="rounded-md border border-brand/20 bg-brand/10 px-2.5 py-1 font-mono text-xs font-medium text-brand">
            Strict Engineering Architecture
          </span>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-text sm:text-4xl">
            Code calculates, AI interprets
          </h2>
          <p className="mt-3 text-sm text-muted">
            The AI model never calculates, rounds, or derives any number.
            Every figure is computed deterministically by TypeScript and wrapped in an Evidence Package.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-border bg-surface p-5 space-y-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/15 text-brand font-mono font-bold text-sm">
              01
            </div>
            <h3 className="text-sm font-semibold text-text">Ingest & DNS-over-HTTPS</h3>
            <p className="text-xs text-muted leading-relaxed">
              Bitget ticker APIs, Yahoo Finance equity quotes, and Blockscout explorer telemetry queried via privacy-preserving DNS-over-HTTPS.
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-surface p-5 space-y-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/15 text-accent font-mono font-bold text-sm">
              02
            </div>
            <h3 className="text-sm font-semibold text-text">Session Window Alignment</h3>
            <p className="text-xs text-muted leading-relaxed">
              Extracts official previous close as session anchor. Both assets are measured against the same temporal baseline.
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-surface p-5 space-y-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-positive/15 text-positive font-mono font-bold text-sm">
              03
            </div>
            <h3 className="text-sm font-semibold text-text">Deterministic Math Engine</h3>
            <p className="text-xs text-muted leading-relaxed">
              Calculates spreads, percentage-point divergence, and flags anomalies against calibrated equity/ETF thresholds.
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-surface p-5 space-y-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-warning/15 text-warning font-mono font-bold text-sm">
              04
            </div>
            <h3 className="text-sm font-semibold text-text">Qwen 3.8-Max Reasoning</h3>
            <p className="text-xs text-muted leading-relaxed">
              Qwen evaluates the evidence package, generating structured briefs with cited evidence IDs and zero fabricated metrics.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
