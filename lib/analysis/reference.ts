import type { BitgetTicker } from "../market/bitget";
import type { EquityQuote } from "../market/equities";

export type RowStatus = "OK" | "NO_EQUITY_DATA" | "NO_TOKEN_DATA" | "SUSPECT_MISPAIRING";

export interface UniverseEntry {
  rToken: string;
  ticker: string;
  pairSymbol: string;
}

export interface DivergenceRow extends UniverseEntry {
  status: RowStatus;
  rPrice: number | null;
  rChange24hPct: number | null;
  usdtVolume24h: number | null;
  bidPrice: number | null;
  askPrice: number | null;
  stockPrice: number | null;
  sessionAnchor: number | null;
  stockChangePct: number | null;
  alignedRChangePct: number | null;
  spreadPct: number | null;
  divergencePp: number | null;
  flagged: boolean;
  marketState: string;
  instrumentType: string | null;
  exchange: string | null;
  rFetchedAt: number | null;
  stockFetchedAt: number | null;
}

// Initial flag thresholds in percentage points of window-aligned divergence.
// Calibrated against the Sept 9 peg validation (normal spread -0.07% .. +0.58%).
export const FLAG_THRESHOLDS_PP: Record<string, number> = {
  EQUITY: 0.75,
  ETF: 0.5,
  DEFAULT: 0.75,
};

// A redeemable tokenized stock cannot realistically trade more than ~50% away
// from its underlying. Beyond that, the symbol pair is almost certainly a
// mis-tagged Bitget area symbol matched to an unrelated Yahoo ticker
// (observed: PI, SOPH). Such rows are quarantined, not flagged as divergence.
export const MISPAIRING_SPREAD_PCT = 50;

// rToken naming strips punctuation from the underlying ticker (rBRKB -> BRK-B).
const TICKER_ALIASES: Record<string, string> = {
  BRKA: "BRK-A",
  BRKB: "BRK-B",
  BFA: "BF-A",
  BFB: "BF-B",
};

export function underlyingTicker(rToken: string): string {
  const raw = rToken.startsWith("r") ? rToken.slice(1) : rToken;
  return TICKER_ALIASES[raw] ?? raw;
}

export function toNumber(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = typeof value === "number" ? value : Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function pct(change: number, base: number): number | null {
  if (!Number.isFinite(base) || base === 0) return null;
  return (change / base) * 100;
}

// Window-aligned comparison: both sides are measured against the underlying's
// previous official close (the session anchor), so a rolling-24h crypto window
// is never compared against a different equity window.
export function buildDivergenceRow(
  entry: UniverseEntry,
  ticker: BitgetTicker | null,
  quote: EquityQuote | null,
): DivergenceRow {
  const rPrice = ticker ? toNumber(ticker.lastPr) : null;
  const rOpen24h = ticker ? toNumber(ticker.open) : null;
  const rChange24hPct = rPrice !== null && rOpen24h !== null ? pct(rPrice - rOpen24h, rOpen24h) : null;
  const stockPrice = quote ? quote.price : null;
  const sessionAnchor = quote ? quote.previousClose : null;
  const stockChangePct =
    stockPrice !== null && sessionAnchor !== null ? pct(stockPrice - sessionAnchor, sessionAnchor) : null;
  const alignedRChangePct =
    rPrice !== null && sessionAnchor !== null ? pct(rPrice - sessionAnchor, sessionAnchor) : null;
  const spreadPct = rPrice !== null && stockPrice !== null ? pct(rPrice - stockPrice, stockPrice) : null;
  const divergencePp =
    alignedRChangePct !== null && stockChangePct !== null ? alignedRChangePct - stockChangePct : null;
  const instrumentType = quote ? quote.instrumentType : null;
  const threshold = FLAG_THRESHOLDS_PP[instrumentType ?? "DEFAULT"] ?? FLAG_THRESHOLDS_PP.DEFAULT;
  const mispaired = spreadPct !== null && Math.abs(spreadPct) >= MISPAIRING_SPREAD_PCT;
  const flagged = !mispaired && divergencePp !== null && Math.abs(divergencePp) >= threshold;
  const status: RowStatus = mispaired
    ? "SUSPECT_MISPAIRING"
    : !quote
      ? "NO_EQUITY_DATA"
      : rPrice === null
        ? "NO_TOKEN_DATA"
        : "OK";
  return {
    ...entry,
    status,
    rPrice,
    rChange24hPct,
    usdtVolume24h: ticker ? toNumber(ticker.usdtVolume) : null,
    bidPrice: ticker ? toNumber(ticker.bidPr) : null,
    askPrice: ticker ? toNumber(ticker.askPr) : null,
    stockPrice,
    sessionAnchor,
    stockChangePct,
    alignedRChangePct,
    spreadPct,
    divergencePp,
    flagged,
    marketState: quote ? quote.marketState : "NO_DATA",
    instrumentType,
    exchange: quote ? quote.exchange : null,
    rFetchedAt: ticker ? toNumber(ticker.ts) : null,
    stockFetchedAt: quote ? quote.fetchedAt : null,
  };
}
