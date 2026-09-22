import { getAllTickers, getRTokenSymbols } from "../market/bitget";
import { getEquityQuotes } from "../market/equities";
import {
  buildDivergenceRow,
  underlyingTicker,
  type DivergenceRow,
  type UniverseEntry,
} from "../analysis/reference";

export interface ScanSummary {
  generatedAt: number;
  durationMs: number;
  universe: number;
  ok: number;
  flagged: number;
  missingEquityData: number;
  missingTokenData: number;
  suspectMispairing: number;
  rows: DivergenceRow[];
  missingEquitySample: string[];
}

export interface ScanOptions {
  force?: boolean;
  limit?: number;
}

const CACHE_TTL_MS = 60 * 1000;

let cached: ScanSummary | null = null;
let cachedAt = 0;
let inflight: Promise<ScanSummary> | null = null;

function sortMagnitude(row: DivergenceRow): number {
  if (row.divergencePp === null || row.status === "SUSPECT_MISPAIRING") return -1;
  return Math.abs(row.divergencePp);
}

async function runScan(): Promise<ScanSummary> {
  const startedAt = Date.now();
  const [symbols, tickers] = await Promise.all([getRTokenSymbols(), getAllTickers()]);
  const universe: UniverseEntry[] = symbols.map((symbol: any) => ({
    rToken: symbol.baseCoin,
    ticker: underlyingTicker(symbol.baseCoin),
    pairSymbol: symbol.symbol,
  }));
  const uniqueTickers = Array.from(new Set(universe.map((entry) => entry.ticker)));
  const quotes = await getEquityQuotes(uniqueTickers);
  const rows = universe.map((entry) =>
    buildDivergenceRow(entry, tickers.get(entry.pairSymbol) ?? null, quotes.get(entry.ticker) ?? null),
  );
  rows.sort((a, b) => {
    const diff = sortMagnitude(b) - sortMagnitude(a);
    if (diff !== 0) return diff;
    return (b.usdtVolume24h ?? -1) - (a.usdtVolume24h ?? -1);
  });
  const missingTickers = Array.from(
    new Set(rows.filter((row) => row.status === "NO_EQUITY_DATA").map((row) => row.ticker)),
  );
  return {
    generatedAt: Date.now(),
    durationMs: Date.now() - startedAt,
    universe: rows.length,
    ok: rows.filter((row) => row.status === "OK").length,
    flagged: rows.filter((row) => row.flagged).length,
    missingEquityData: rows.filter((row) => row.status === "NO_EQUITY_DATA").length,
    missingTokenData: rows.filter((row) => row.status === "NO_TOKEN_DATA").length,
    suspectMispairing: rows.filter((row) => row.status === "SUSPECT_MISPAIRING").length,
    rows,
    missingEquitySample: missingTickers.slice(0, 40),
  };
}

export async function scanMarket(options: ScanOptions = {}): Promise<ScanSummary> {
  const { force = false, limit } = options;
  if (!force && cached && Date.now() - cachedAt < CACHE_TTL_MS) {
    return applyLimit(cached, limit);
  }
  if (!inflight) {
    inflight = runScan()
      .then((summary) => {
        cached = summary;
        cachedAt = Date.now();
        return summary;
      })
      .finally(() => {
        inflight = null;
      });
  }
  return applyLimit(await inflight, limit);
}

function applyLimit(summary: ScanSummary, limit?: number): ScanSummary {
  if (limit === undefined || !Number.isFinite(limit) || limit <= 0 || limit >= summary.rows.length) {
    return summary;
  }
  return { ...summary, rows: summary.rows.slice(0, limit) };
}
