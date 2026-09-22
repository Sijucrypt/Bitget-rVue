import fs from "node:fs";
import path from "node:path";
import { fetchJson } from "../net/doh";

const YAHOO_CHART_BASE = "https://query2.finance.yahoo.com/v8/finance/chart";

export type MarketState = "PRE" | "REGULAR" | "POST" | "CLOSED";

export interface TradingWindow {
  timezone: string;
  start: number;
  end: number;
  gmtoffset: number;
}

export interface CurrentTradingPeriod {
  pre: TradingWindow;
  regular: TradingWindow;
  post: TradingWindow;
}

export interface YahooChartMeta {
  currency?: string;
  symbol?: string;
  exchangeName?: string;
  fullExchangeName?: string;
  instrumentType?: string;
  exchangeTimezoneName?: string;
  regularMarketPrice?: number;
  regularMarketTime?: number;
  regularMarketChangePercent?: number;
  chartPreviousClose?: number;
  currentTradingPeriod?: CurrentTradingPeriod;
}

export interface YahooChartResponse {
  chart?: {
    result?: Array<{ meta?: YahooChartMeta }> | null;
    error?: unknown;
  };
}

export interface EquityQuote {
  ticker: string;
  price: number;
  previousClose: number | null;
  yahooChangePct: number | null;
  marketState: MarketState;
  instrumentType: string;
  exchange: string;
  currency: string;
  marketTime: number;
  fetchedAt: number;
}

const MEMORY_TTL_MS = 60 * 1000;
const STALE_OK_MS = 15 * 60 * 1000;
const MISS_TTL_MS = 10 * 60 * 1000;
const DEFAULT_CONCURRENCY = 8;

const CACHE_FILE = path.join(process.cwd(), ".cache", "equity-quotes.json");

interface CacheEntry {
  quote: EquityQuote | null;
  savedAt: number;
}

const quoteCache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<EquityQuote | null>>();
let diskLoaded = false;

function ensureDiskCache(): void {
  if (diskLoaded) return;
  diskLoaded = true;
  try {
    const raw = fs.readFileSync(CACHE_FILE, "utf8");
    const entries = JSON.parse(raw) as Array<[string, CacheEntry]>;
    const now = Date.now();
    for (const [ticker, entry] of entries) {
      if (entry && now - entry.savedAt < STALE_OK_MS) quoteCache.set(ticker, entry);
    }
  } catch {
    // No usable disk cache; start empty.
  }
}

function saveDiskCache(): void {
  try {
    fs.mkdirSync(path.dirname(CACHE_FILE), { recursive: true });
    fs.writeFileSync(CACHE_FILE, JSON.stringify(Array.from(quoteCache.entries())));
  } catch {
    // Cache persistence is best-effort only.
  }
}

function deriveMarketState(meta: YahooChartMeta, nowSeconds: number): MarketState {
  const period = meta.currentTradingPeriod;
  if (!period) return "CLOSED";
  if (period.regular && nowSeconds >= period.regular.start && nowSeconds < period.regular.end) return "REGULAR";
  if (period.pre && nowSeconds >= period.pre.start && nowSeconds < period.pre.end) return "PRE";
  if (period.post && nowSeconds >= period.post.start && nowSeconds < period.post.end) return "POST";
  return "CLOSED";
}

async function fetchEquityQuote(ticker: string): Promise<EquityQuote | null> {
  const url = YAHOO_CHART_BASE + "/" + encodeURIComponent(ticker) + "?interval=1d&range=1d";
  try {
    const body = await fetchJson<YahooChartResponse>(url, { timeoutMs: 10000 });
    const meta = body.chart?.result?.[0]?.meta;
    if (!meta || typeof meta.regularMarketPrice !== "number" || !Number.isFinite(meta.regularMarketPrice)) {
      quoteCache.set(ticker, { quote: null, savedAt: Date.now() });
      return null;
    }
    const quote: EquityQuote = {
      ticker,
      price: meta.regularMarketPrice,
      previousClose: typeof meta.chartPreviousClose === "number" ? meta.chartPreviousClose : null,
      yahooChangePct:
        typeof meta.regularMarketChangePercent === "number" ? meta.regularMarketChangePercent : null,
      marketState: deriveMarketState(meta, Math.floor(Date.now() / 1000)),
      instrumentType: meta.instrumentType ?? "UNKNOWN",
      exchange: meta.fullExchangeName ?? meta.exchangeName ?? "UNKNOWN",
      currency: meta.currency ?? "USD",
      marketTime: (meta.regularMarketTime ?? 0) * 1000,
      fetchedAt: Date.now(),
    };
    quoteCache.set(ticker, { quote, savedAt: Date.now() });
    return quote;
  } catch {
    const stale = quoteCache.get(ticker);
    if (stale && stale.quote && Date.now() - stale.savedAt < STALE_OK_MS) return stale.quote;
    quoteCache.set(ticker, { quote: null, savedAt: Date.now() });
    return null;
  }
}

function loadEquityQuote(ticker: string): Promise<EquityQuote | null> {
  const pending = inflight.get(ticker);
  if (pending) return pending;
  const task = fetchEquityQuote(ticker).finally(() => inflight.delete(ticker));
  inflight.set(ticker, task);
  return task;
}

export async function getEquityQuote(ticker: string): Promise<EquityQuote | null> {
  ensureDiskCache();
  const entry = quoteCache.get(ticker);
  if (entry && Date.now() - entry.savedAt < (entry.quote ? MEMORY_TTL_MS : MISS_TTL_MS)) {
    return entry.quote;
  }
  return loadEquityQuote(ticker);
}

export async function getEquityQuotes(
  tickers: string[],
  concurrency: number = DEFAULT_CONCURRENCY,
): Promise<Map<string, EquityQuote | null>> {
  ensureDiskCache();
  const results = new Map<string, EquityQuote | null>();
  const toFetch: string[] = [];
  const now = Date.now();
  for (const ticker of new Set(tickers)) {
    const entry = quoteCache.get(ticker);
    if (entry && now - entry.savedAt < (entry.quote ? MEMORY_TTL_MS : MISS_TTL_MS)) {
      results.set(ticker, entry.quote);
    } else {
      toFetch.push(ticker);
    }
  }
  let index = 0;
  const workerCount = Math.max(1, Math.min(concurrency, toFetch.length));
  async function worker(): Promise<void> {
    while (index < toFetch.length) {
      const current = index;
      index += 1;
      const ticker = toFetch[current];
      results.set(ticker, await loadEquityQuote(ticker));
    }
  }
  const workers: Promise<void>[] = [];
  for (let i = 0; i < workerCount; i += 1) workers.push(worker());
  await Promise.all(workers);
  if (toFetch.length > 0) saveDiskCache();
  return results;
}
