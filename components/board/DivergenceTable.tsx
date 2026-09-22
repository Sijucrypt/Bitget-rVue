import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { ArrowUpRight } from "lucide-react";
import type { DivergenceRow } from "@/lib/api/client";

/* ── Formatting helpers (pure, deterministic) ── */

function number(value: number | null, suffix = "", digits = 2): string {
  return value === null ? "Data unavailable" : `${value >= 0 ? "+" : ""}${value.toFixed(digits)}${suffix}`;
}

function price(value: number | null, digits = 2): string {
  return value === null ? "Data unavailable" : value.toFixed(digits);
}

function volume(value: number | null): string {
  if (value === null) return "Data unavailable";
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toFixed(0);
}

function age(timestamp: number | null, now: number): string {
  if (timestamp === null) return "Data unavailable";
  const seconds = Math.max(0, Math.round((now - timestamp) / 1_000));
  return seconds < 60 ? `${seconds}s` : seconds < 3_600 ? `${Math.round(seconds / 60)}m` : `${Math.round(seconds / 3_600)}h`;
}

function tone(value: number | null): string {
  return value === null || value === 0 ? "text-muted" : value > 0 ? "text-positive" : "text-negative";
}

/* ── Row ── */

function Row({ row, now }: { row: DivergenceRow; now: number }) {
  const unavailable = row.status === "NO_EQUITY_DATA" || row.status === "SUSPECT_MISPAIRING";
  let className = "group border-b border-border last:border-b-0 hover:bg-surface-raised/70 transition-colors";
  if (unavailable) className += " opacity-60";
  if (row.flagged) className += " bg-warning/5";

  return (
    <tr className={className}>
      <td className={"sticky left-0 z-[1] bg-surface px-5 py-3 group-hover:bg-surface-raised/70 group-[.bg-warning\\/5]:bg-warning/5 group-[.bg-warning\\/5]:group-hover:bg-warning/10 " + (row.flagged ? "shadow-[inset_2px_0_0_var(--warning)]" : "")}>
        <Link href={`/rtokens/${encodeURIComponent(row.rToken)}`} className="block w-fit rounded-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-accent">
          <span className="font-mono font-semibold tabular-nums text-text group-hover:text-brand">{row.rToken}</span>
          <span className="ml-2 font-mono text-xs text-tertiary">{row.ticker}</span>
        </Link>
        {row.status === "SUSPECT_MISPAIRING" ? <p className="mt-1 text-[10px] text-muted">Underlying mapping unverified</p> : null}
      </td>
      <td className="px-3 py-3 text-right font-mono tabular-nums text-text">{price(row.rPrice, 4)}</td>
      <td className={`px-3 py-3 text-right font-mono tabular-nums ${tone(row.rChange24hPct)}`}>{number(row.rChange24hPct, "%")}</td>
      <td className="px-3 py-3 text-right font-mono tabular-nums text-text">{price(row.stockPrice)}</td>
      <td className="px-3 py-3"><span className="rounded-md border border-border px-2 py-1 font-mono text-[10px] text-muted">{row.marketState}</span></td>
      <td className={`px-3 py-3 text-right font-mono font-semibold tabular-nums ${tone(row.divergencePp)}`}>{number(row.divergencePp, "pp")}</td>
      <td className={`px-3 py-3 text-right font-mono tabular-nums ${tone(row.spreadPct)}`}>{number(row.spreadPct, "%")}</td>
      <td className="px-3 py-3 text-right font-mono tabular-nums text-muted">{volume(row.usdtVolume24h)}</td>
      <td className="px-3 py-3 text-right font-mono text-xs tabular-nums text-muted">{age(row.stockFetchedAt ?? row.rFetchedAt, now)}</td>
      <td className="px-5 py-3 text-right">
        <Link href={`/chat?rToken=${encodeURIComponent(row.rToken)}`} className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-brand/10 hover:text-brand">
          Research <Icon icon={ArrowUpRight} size={14} />
        </Link>
      </td>
    </tr>
  );
}

/* ── Table ── */

export function DivergenceTable({
  rows,
  now,
  loading,
  error,
  sortCol,
  sortDir,
  setSortCol,
  setSortDir,
  remaining,
  onShowMore,
}: {
  rows: DivergenceRow[];
  now: number;
  loading: boolean;
  error: string | null;
  sortCol: keyof DivergenceRow;
  sortDir: "asc" | "desc";
  setSortCol: (col: keyof DivergenceRow) => void;
  setSortDir: (fn: (prev: "asc" | "desc") => "asc" | "desc") => void;
  remaining: number;
  onShowMore: () => void;
}) {
  function toggleSort(col: keyof DivergenceRow) {
    setSortCol(col);
    setSortDir((d) => (d === "asc" ? "desc" : "asc"));
  }

  const arrow = (col: keyof DivergenceRow) =>
    sortCol === col ? (sortDir === "asc" ? " ↑" : " ↓") : "";

  return (
    <>
      {error ? (
        <div className="m-5 rounded-xl border border-negative/30 bg-negative/10 p-4" role="alert">
          <p className="font-medium text-negative">The live scan could not complete.</p>
          <p className="mt-1 text-sm text-muted">{error}</p>
        </div>
      ) : null}

      <div className="overflow-x-auto">
        <table className="min-w-[1080px] w-full border-collapse text-sm">
          <caption className="sr-only">Live rToken divergence data</caption>
          <thead className="border-b border-border bg-surface-raised text-left text-[10px] font-semibold uppercase tracking-[0.1em] text-tertiary">
            <tr>
              <th scope="col" className="sticky left-0 z-10 bg-surface-raised px-5 py-3 cursor-pointer hover:text-brand" onClick={() => toggleSort("rToken")}>Asset{arrow("rToken")}</th>
              <th scope="col" className="px-3 py-3 text-right cursor-pointer hover:text-brand" onClick={() => toggleSort("rPrice")}>rToken{arrow("rPrice")}</th>
              <th scope="col" className="px-3 py-3 text-right cursor-pointer hover:text-brand" onClick={() => toggleSort("rChange24hPct")}>r24h{arrow("rChange24hPct")}</th>
              <th scope="col" className="px-3 py-3 text-right cursor-pointer hover:text-brand" onClick={() => toggleSort("stockPrice")}>Underlying{arrow("stockPrice")}</th>
              <th scope="col" className="px-3 py-3 cursor-pointer hover:text-brand" onClick={() => toggleSort("marketState")}>Market{arrow("marketState")}</th>
              <th scope="col" className="px-3 py-3 text-right cursor-pointer hover:text-brand" onClick={() => toggleSort("divergencePp")}>Divergence{arrow("divergencePp")}</th>
              <th scope="col" className="px-3 py-3 text-right cursor-pointer hover:text-brand" onClick={() => toggleSort("spreadPct")}>Spread{arrow("spreadPct")}</th>
              <th scope="col" className="px-3 py-3 text-right cursor-pointer hover:text-brand" onClick={() => toggleSort("usdtVolume24h")}>24h volume{arrow("usdtVolume24h")}</th>
              <th scope="col" className="px-3 py-3 text-right">Age</th>
              <th scope="col" className="px-5 py-3"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <Row key={row.pairSymbol} row={row} now={now} />
            ))}
            {!loading && rows.length === 0 && !error ? (
              <tr>
                <td colSpan={10} className="px-5 py-14 text-center text-sm text-muted">Data unavailable.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {remaining > 0 ? (
        <div className="border-t border-border p-4 text-center">
          <button
            type="button"
            onClick={onShowMore}
            className="rounded-lg border border-border bg-surface-raised px-4 py-2 text-sm font-medium text-muted transition-colors hover:border-brand/40 hover:text-brand"
          >
            Show more <span className="font-mono tabular-nums">({remaining} remaining)</span>
          </button>
        </div>
      ) : null}
    </>
  );
}
