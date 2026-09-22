export function FilterBar({
  sortCol,
  search,
  setSearch,
  flaggedOnly,
  setFlaggedOnly,
  loading,
  status,
}: {
  sortCol: string;
  search: string;
  setSearch: (val: string) => void;
  flaggedOnly: boolean;
  setFlaggedOnly: (val: boolean) => void;
  loading: boolean;
  status: string;
}) {
  return (
    <div className="flex flex-col gap-4 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-medium text-text">Divergence monitor</p>
        <p className="mt-0.5 text-xs text-muted">Sorted by {sortCol}.</p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="Search asset..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-32 rounded-md border border-border bg-surface px-2.5 py-1.5 text-sm text-text placeholder:text-muted focus:border-brand focus:outline-none sm:w-48"
        />
        <label className="flex items-center gap-2 text-sm text-text cursor-pointer select-none">
          <input
            type="checkbox"
            checked={flaggedOnly}
            onChange={(e) => setFlaggedOnly(e.target.checked)}
            className="rounded border-border text-brand focus:ring-brand focus:ring-1 focus:ring-offset-0 bg-transparent"
          />{" "}
          Flagged
        </label>
        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-border bg-surface-raised px-3 py-1.5 font-mono text-[11px] tabular-nums text-muted">
          <span
            className={
              loading
                ? "h-1.5 w-1.5 animate-pulse rounded-full bg-warning"
                : "h-1.5 w-1.5 rounded-full bg-positive"
            }
          />
          {status}
        </span>
      </div>
    </div>
  );
}
