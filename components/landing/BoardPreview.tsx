import Link from "next/link";
import type { ScanSummary } from "@/lib/scanner/scan";

export function BoardPreview({ scan }: { scan: ScanSummary | null }) {
  return (
    <section className="border-y border-glass-border bg-surface/50 backdrop-blur-md py-4">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-2.5 w-2.5 rounded-full bg-positive animate-pulse" />
            <span className="font-mono text-xs font-semibold text-text uppercase tracking-wider">
              Live Scanner Telemetry
            </span>
            <span className="text-tertiary text-xs">•</span>
            <span className="font-mono text-xs text-muted">
              {scan ? `${scan.universe} rTokens Scanned` : "Connecting to feeds…"}
            </span>
            {scan && (
              <span className="rounded bg-warning/15 px-2 py-0.5 font-mono text-[11px] font-medium text-warning border border-warning/25">
                {scan.flagged} Divergences Flagged
              </span>
            )}
          </div>

          <div className="flex items-center gap-4 text-xs font-mono text-tertiary">
            <span>NYSE/Nasdaq State: <strong>CLOSED</strong> (24/7 Window Active)</span>
            {scan && (
              <span>
                Updated: {new Date(scan.generatedAt).toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>

        {/* Ticker Row */}
        {scan && scan.rows && scan.rows.length > 0 && (
          <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {scan.rows.slice(0, 8).map((row) => (
              <Link
                key={row.rToken}
                href={`/rtokens/${row.rToken}`}
                className="flex shrink-0 items-center gap-2 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs hover:border-brand/40 transition-colors"
              >
                <span className="font-mono font-bold text-text">{row.rToken}</span>
                <span className="font-mono text-[11px] text-muted">
                  ${row.rPrice ? row.rPrice.toFixed(2) : "--"}
                </span>
                <span
                  className={`font-mono text-[11px] font-medium ${
                    row.divergencePp && row.divergencePp > 0
                      ? "text-positive"
                      : row.divergencePp && row.divergencePp < 0
                      ? "text-negative"
                      : "text-tertiary"
                  }`}
                >
                  {row.divergencePp !== null
                    ? `${row.divergencePp >= 0 ? "+" : ""}${row.divergencePp.toFixed(2)}pp`
                    : "--"}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
