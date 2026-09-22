"use client";

import { useEffect, useState } from "react";
import { Activity, Database, ShieldCheck } from "lucide-react";
import { Icon } from "@/components/ui/Icon";
import { useScan } from "@/components/shell/ScanProvider";
import type { DivergenceRow } from "@/lib/api/client";

import { SummaryChips } from "@/components/board/SummaryChips";
import { FilterBar } from "@/components/board/FilterBar";
import { DivergenceTable } from "@/components/board/DivergenceTable";

const PAGE_SIZE = 150;

export default function RTokensPage() {
  const { summary, loading, error } = useScan();
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [now, setNow] = useState(() => Date.now());
  const [search, setSearch] = useState("");
  const [flaggedOnly, setFlaggedOnly] = useState(false);
  const [sortCol, setSortCol] = useState<keyof DivergenceRow>("divergencePp");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  let rows: DivergenceRow[] = summary ? [...summary.rows] : [];

  if (search) {
    const q = search.toLowerCase();
    rows = rows.filter(
      (r) =>
        r.rToken.toLowerCase().includes(q) ||
        r.ticker.toLowerCase().includes(q) ||
        r.pairSymbol.toLowerCase().includes(q),
    );
  }

  if (flaggedOnly) {
    rows = rows.filter((r) => r.flagged);
  }

  rows.sort((a, b) => {
    let valA = a[sortCol];
    let valB = b[sortCol];
    if (valA === null) return sortDir === "asc" ? -1 : 1;
    if (valB === null) return sortDir === "asc" ? 1 : -1;
    if (sortCol === "divergencePp" || sortCol === "spreadPct") {
      valA = Math.abs(valA as number);
      valB = Math.abs(valB as number);
    }
    if (valA < valB) return sortDir === "asc" ? -1 : 1;
    if (valA > valB) return sortDir === "asc" ? 1 : -1;
    return (b.usdtVolume24h ?? -1) - (a.usdtVolume24h ?? -1);
  });

  const remaining = rows.length > visible ? rows.length - visible : 0;
  const visibleRows = rows.slice(0, visible);
  const status = loading
    ? "Synchronizing live universe"
    : error
    ? "Live scan unavailable"
    : "Aligned to official closes";

  return (
    <div className="mx-auto w-full max-w-[1600px] px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
      {/* Hero Banner */}
      <section className="relative overflow-hidden rounded-[28px] border border-glass-border bg-surface px-5 py-6 shadow-[var(--glass-shadow)] sm:px-7 sm:py-8">
        <div className="pointer-events-none absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_70%_45%,color-mix(in_srgb,var(--brand)_10%,transparent),transparent_58%)]" />
        <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-2xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-brand/25 bg-brand/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-brand">
              <span className="h-1.5 w-1.5 rounded-full bg-brand shadow-[0_0_12px_var(--brand)]" />
              Market intelligence
            </div>
            <h1 className="text-3xl font-semibold tracking-[-0.04em] text-text sm:text-4xl">
              rToken divergence board
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-muted sm:text-base">
              Live tokenized-stock pricing, normalized against each underlying&apos;s
              previous official close.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs text-muted sm:flex sm:gap-5">
            <span className="flex items-center gap-2">
              <Icon icon={Activity} size={15} className="text-brand" />
              Live pricing
            </span>
            <span className="flex items-center gap-2">
              <Icon icon={Database} size={15} className="text-brand" />
              Deterministic
            </span>
            <span className="flex items-center gap-2">
              <Icon icon={ShieldCheck} size={15} className="text-brand" />
              Evidence-led
            </span>
          </div>
        </div>
      </section>

      {/* Summary Chips */}
      <SummaryChips
        universe={summary ? summary.universe : "—"}
        flagged={summary ? summary.flagged : "—"}
        ok={summary ? summary.ok : "—"}
        durationMs={summary ? summary.durationMs : null}
        status={status}
      />

      {/* Table Section */}
      <section className="mt-7 overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
        <FilterBar
          sortCol={sortCol}
          search={search}
          setSearch={setSearch}
          flaggedOnly={flaggedOnly}
          setFlaggedOnly={setFlaggedOnly}
          loading={loading}
          status={status}
        />
        <DivergenceTable
          rows={visibleRows}
          now={now}
          loading={loading}
          error={error}
          sortCol={sortCol}
          sortDir={sortDir}
          setSortCol={setSortCol}
          setSortDir={setSortDir}
          remaining={remaining}
          onShowMore={() => setVisible((count) => count + PAGE_SIZE)}
        />
      </section>

      {/* Methodology footer */}
      <footer className="mt-5 grid gap-3 border-t border-border py-5 text-xs leading-5 text-tertiary lg:grid-cols-3">
        <p>
          <span className="font-medium text-muted">Window alignment.</span> rChg(a) is measured
          against the underlying&apos;s previous official close.
        </p>
        <p>
          <span className="font-medium text-muted">Divergence.</span> Aligned rToken change minus
          stock session change, in percentage points.
        </p>
        <p>
          <span className="font-medium text-muted">Research discipline.</span> Code calculates. AI
          interprets. Missing data stays unavailable.
        </p>
      </footer>
    </div>
  );
}
