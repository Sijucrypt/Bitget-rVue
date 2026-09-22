import { getRTokenSymbols, type BitgetSpotSymbol, type BitgetTicker } from "../market/bitget";
import { getEquityQuote, type EquityQuote } from "../market/equities";
import {
  buildDivergenceRow,
  underlyingTicker,
  FLAG_THRESHOLDS_PP,
  MISPAIRING_SPREAD_PCT,
  type DivergenceRow,
  type UniverseEntry,
} from "../analysis/reference";
import { collectNews } from "../research/news";
import { collectOnchain, resolveContracts } from "../research/onchain";
import { fetchTicker } from "../research/ticker";
import { fmtCount, fmtPct, fmtPrice, fmtPp, fmtUtc, fmtVolume, pct } from "../format";
import type {
  AssetRef,
  ComparisonSnapshot,
  EvidenceItem,
  EvidencePackage,
  MarketSnapshot,
  NewsSnapshot,
  OnchainSnapshot,
  UnderlyingSnapshot,
} from "./types";

// Tier-2 Evidence Package builder. Assembles the deterministic market picture
// (reusing the exact Tier-1 math so a report can never disagree with the board)
// and layers on-chain plus news intelligence collected by lib/research/*.
//
// Nothing here interprets. Statements are templated from computed values, and
// every item carries an id the model is required to cite.

const SOURCE_BITGET_TICKER = (pair: string) => "bitget:GET /api/v2/spot/market/tickers?symbol=" + pair;
const SOURCE_BITGET_SYMBOLS = "bitget:GET /api/v2/spot/public/symbols";
const SOURCE_YAHOO = (ticker: string) => "yahoo:GET /v8/finance/chart/" + ticker;
const SOURCE_MATH = "rvue:lib/analysis/reference.ts";

const CACHE_TTL_MS = 60 * 1000;

export type BuildFailureCode = "UNKNOWN_RTOKEN" | "NO_TOKEN_DATA" | "NO_EQUITY_DATA";

export type BuildResult =
  | { status: "OK"; pkg: EvidencePackage }
  | { status: "FAILED"; code: BuildFailureCode; reason: string; rToken: string; underlyingTicker: string | null };

export interface BuildOptions {
  rToken: string;
  force?: boolean;
  now?: number;
  newsEnabled?: boolean;
  onchainEnabled?: boolean;
  windowHours?: number;
}

const cache = new Map<string, { at: number; result: BuildResult }>();

function envFlag(name: string, fallback: boolean): boolean {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === "") return fallback;
  return !["0", "false", "no", "off"].includes(raw.trim().toLowerCase());
}

function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === "") return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function normalizeSymbol(input: string): string {
  return input.trim();
}

function item(
  id: string,
  kind: EvidenceItem["kind"],
  statement: string,
  source: string,
  observedAt: number,
  value?: number | null,
  unit?: string,
): EvidenceItem {
  const out: EvidenceItem = { id, kind, statement, source, observedAt };
  if (value !== null && value !== undefined && Number.isFinite(value)) out.value = value;
  if (unit) out.unit = unit;
  return out;
}

function thresholdFor(instrumentType: string | null): number {
  return FLAG_THRESHOLDS_PP[instrumentType ?? "DEFAULT"] ?? FLAG_THRESHOLDS_PP.DEFAULT;
}

function buildEvidenceItems(
  pkgAsset: AssetRef,
  row: DivergenceRow,
  ticker: BitgetTicker,
  quote: EquityQuote,
  market: MarketSnapshot,
  underlying: UnderlyingSnapshot,
  comparison: ComparisonSnapshot,
  onchain: OnchainSnapshot,
  news: NewsSnapshot,
): EvidenceItem[] {
  const items: EvidenceItem[] = [];
  const r = pkgAsset.rToken;
  const t = pkgAsset.underlyingTicker;

  items.push(item("market.rPrice", "FACT", r + " last traded at " + fmtPrice(market.rPrice, 4) + " USDT on Bitget (" + pkgAsset.pairSymbol + ").", SOURCE_BITGET_TICKER(pkgAsset.pairSymbol), market.fetchedAt, market.rPrice, "USDT"));
  if (market.rChange24hPct !== null) {
    items.push(item("market.rChange24hPct", "FACT", r + " moved " + fmtPct(market.rChange24hPct) + " over Bitget's rolling 24h window.", SOURCE_BITGET_TICKER(pkgAsset.pairSymbol), market.fetchedAt, market.rChange24hPct, "%"));
  }
  if (market.usdtVolume24h !== null) {
    items.push(item("market.usdtVolume24h", "FACT", "Bitget reports " + fmtVolume(market.usdtVolume24h) + " USDT of rolling 24h quote volume for " + pkgAsset.pairSymbol + ".", SOURCE_BITGET_TICKER(pkgAsset.pairSymbol), market.fetchedAt, market.usdtVolume24h, "USDT"));
  }
  if (market.bidPrice !== null && market.askPrice !== null) {
    const spread = pct(market.askPrice - market.bidPrice, market.askPrice);
    items.push(item("market.bidAsk", "FACT", "Best bid " + fmtPrice(market.bidPrice, 4) + " USDT, best ask " + fmtPrice(market.askPrice, 4) + " USDT.", SOURCE_BITGET_TICKER(pkgAsset.pairSymbol), market.fetchedAt));
    if (spread !== null) {
      items.push(item("market.bidAskSpreadPct", "COMPUTED", "The quoted bid-ask spread is " + fmtPct(spread, 4) + " of the ask.", SOURCE_MATH, market.fetchedAt, spread, "%"));
    }
  }

  items.push(item("underlying.price", "FACT", t + " last printed " + fmtPrice(underlying.price, 4) + " " + quote.currency + " on " + underlying.exchange + ".", SOURCE_YAHOO(t), underlying.fetchedAt, underlying.price, quote.currency));
  if (underlying.previousClose !== null) {
    items.push(item("underlying.previousClose", "FACT", t + "'s previous official close, used as the session anchor for every comparison, is " + fmtPrice(underlying.previousClose, 4) + " " + quote.currency + ".", SOURCE_YAHOO(t), underlying.fetchedAt, underlying.previousClose, quote.currency));
  }
  if (underlying.changePct !== null) {
    items.push(item("underlying.changePct", "COMPUTED", t + " is " + fmtPct(underlying.changePct) + " from its previous official close.", SOURCE_MATH, underlying.fetchedAt, underlying.changePct, "%"));
  }
  items.push(item("underlying.marketState", "FACT", "Yahoo reports the market state for " + t + " as " + underlying.marketState + ".", SOURCE_YAHOO(t), underlying.fetchedAt));
  items.push(item("underlying.instrumentType", "FACT", t + " is classified by Yahoo as " + pkgAsset.instrumentType + ".", SOURCE_YAHOO(t), underlying.fetchedAt));
  if (underlying.marketState === "CLOSED") {
    items.push(item("underlying.sessionFrozen", "FACT", t + "'s regular session is CLOSED, so its quote stays frozen at the last official value while " + r + " continues to trade continuously on Bitget.", SOURCE_YAHOO(t), underlying.fetchedAt));
  }

  if (comparison.spreadPct !== null) {
    items.push(item("comparison.spreadPct", "COMPUTED", r + " trades " + fmtPct(comparison.spreadPct) + " away from the live " + t + " quote.", SOURCE_MATH, market.fetchedAt, comparison.spreadPct, "%"));
  }
  if (comparison.alignedRChangePct !== null) {
    items.push(item("comparison.alignedRChangePct", "COMPUTED", "Measured against the same session anchor, " + r + " is " + fmtPct(comparison.alignedRChangePct) + ".", SOURCE_MATH, market.fetchedAt, comparison.alignedRChangePct, "%"));
  }
  if (comparison.divergencePp !== null) {
    items.push(item("comparison.divergencePp", "COMPUTED", "Window-aligned divergence is " + fmtPp(comparison.divergencePp) + " (aligned " + r + " change minus " + t + " session change).", SOURCE_MATH, market.fetchedAt, comparison.divergencePp, "pp"));
  }
  items.push(item("comparison.thresholdPp", "FACT", "The divergence flag threshold for " + pkgAsset.instrumentType + " instruments is +/-" + comparison.thresholdPp.toFixed(2) + "pp.", SOURCE_MATH, market.fetchedAt, comparison.thresholdPp, "pp"));
  items.push(item("comparison.flagged", "COMPUTED", r + " is " + (comparison.flagged ? "FLAGGED as diverging beyond that threshold" : "NOT flagged; the divergence is inside the threshold") + ".", SOURCE_MATH, market.fetchedAt));
  items.push(item("comparison.rowStatus", "FACT", "Deterministic row status: " + row.status + ".", SOURCE_MATH, market.fetchedAt));
  if (row.status === "SUSPECT_MISPAIRING") {
    items.push(item("comparison.mispairing", "COMPUTED", "The |spread| of " + fmtPct(comparison.spreadPct) + " exceeds the " + MISPAIRING_SPREAD_PCT + "% quarantine limit, so this pair is treated as a probable symbol-matching error rather than a real divergence.", SOURCE_MATH, market.fetchedAt));
  }

  if (onchain.status === "OK") {
    const src = onchain.provider ?? "blockscout";
    if (onchain.chain && onchain.address) {
      items.push(item("onchain.deployment", "FACT", r + " is deployed on " + onchain.chain + " at contract " + onchain.address + ".", SOURCE_BITGET_SYMBOLS, onchain.fetchedAt ?? Date.now()));
    }
    if (onchain.holdersCount !== null) {
      items.push(item("onchain.holdersCount", "FACT", "The " + r + " token contract reports " + fmtCount(onchain.holdersCount) + " holders.", src, onchain.fetchedAt ?? Date.now(), onchain.holdersCount, "holders"));
    }
    if (onchain.totalSupply !== null) {
      items.push(item("onchain.totalSupply", "FACT", "Total supply of " + (onchain.tokenSymbol ?? r) + " is " + fmtCount(onchain.totalSupply) + " tokens.", src, onchain.fetchedAt ?? Date.now(), onchain.totalSupply, "tokens"));
    }
    if (onchain.transfersCountTotal !== null) {
      items.push(item("onchain.transfersCountTotal", "FACT", "The contract records " + fmtCount(onchain.transfersCountTotal) + " transfers in total.", src, onchain.fetchedAt ?? Date.now(), onchain.transfersCountTotal, "transfers"));
    }
    if (onchain.transfersInWindow !== null) {
      const caveat = onchain.windowTruncated ? " (count bounded by the pages fetched, so the true figure may be higher)" : "";
      items.push(item("onchain.transfersInWindow", "FACT", fmtCount(onchain.transfersInWindow) + " token transfers occurred in the last " + onchain.windowHours + "h" + caveat + ".", src, onchain.fetchedAt ?? Date.now(), onchain.transfersInWindow, "transfers"));
    }
    if (onchain.transferVolumeTokens !== null) {
      items.push(item("onchain.transferVolumeTokens", "COMPUTED", "Those transfers moved " + fmtCount(onchain.transferVolumeTokens) + " " + r + " tokens in total.", SOURCE_MATH, onchain.fetchedAt ?? Date.now(), onchain.transferVolumeTokens, "tokens"));
    }
    if (onchain.transferVolumeUsdt !== null) {
      items.push(item("onchain.transferVolumeUsdt", "COMPUTED", "Valued at the current " + r + " price, that is about " + fmtVolume(onchain.transferVolumeUsdt) + " USDT of on-chain transfer volume in the last " + onchain.windowHours + "h.", SOURCE_MATH, onchain.fetchedAt ?? Date.now(), onchain.transferVolumeUsdt, "USDT"));
    }
    if (onchain.largestTransferTokens !== null) {
      items.push(item("onchain.largestTransferTokens", "FACT", "The largest single transfer in the window was " + fmtCount(onchain.largestTransferTokens) + " " + r + ".", src, onchain.fetchedAt ?? Date.now(), onchain.largestTransferTokens, "tokens"));
    }
    if (onchain.distinctCounterparties !== null) {
      items.push(item("onchain.distinctCounterparties", "COMPUTED", fmtCount(onchain.distinctCounterparties) + " distinct addresses appear as sender or receiver in the window.", SOURCE_MATH, onchain.fetchedAt ?? Date.now(), onchain.distinctCounterparties, "addresses"));
    }
  } else if (onchain.status === "UNAVAILABLE") {
    items.push(item("onchain.unavailable", "UNKNOWN", "On-chain activity could not be retrieved for " + r + (onchain.note ? ": " + onchain.note : "") + ".", "rvue:lib/research/onchain.ts", onchain.fetchedAt ?? Date.now()));
  } else {
    items.push(item("onchain.pending", "UNKNOWN", "On-chain activity was not collected for this package.", "rvue:lib/research/onchain.ts", Date.now()));
  }

  if (news.status === "OK" && news.items.length === 0) {
    items.push(item("news.none", "FACT", "No news items matching the queries (" + news.queries.join(" / ") + ") were published in the last " + news.windowHours + "h.", "rvue:lib/research/news.ts", news.fetchedAt ?? Date.now()));
  }
  for (const entry of news.items) {
    items.push(item(entry.id, "FACT", "News: \"" + entry.title + "\" - " + entry.source + ", published " + fmtUtc(entry.publishedAt) + " (" + entry.relevance.toLowerCase() + " relevance).", "news:" + entry.provider, entry.publishedAt));
  }
  if (news.status === "UNAVAILABLE") {
    items.push(item("news.unavailable", "UNKNOWN", "External news could not be retrieved: " + news.providersFailed.map((f) => f.provider + " (" + f.reason + ")").join("; ") + ".", "rvue:lib/research/news.ts", news.fetchedAt ?? Date.now()));
  } else if (news.status === "PENDING") {
    items.push(item("news.pending", "UNKNOWN", "External news collection was not attempted for this package.", "rvue:lib/research/news.ts", Date.now()));
  }

  return items;
}

function buildGaps(row: DivergenceRow, market: MarketSnapshot, onchain: OnchainSnapshot, news: NewsSnapshot): string[] {
  const gaps: string[] = [];
  if (row.status === "SUSPECT_MISPAIRING") {
    gaps.push("Pair quarantined as a probable symbol-matching error (|spread| >= " + MISPAIRING_SPREAD_PCT + "%); divergence figures must not be read as a trading signal.");
  }
  if (market.usdtVolume24h !== null) {
    gaps.push("24h USDT volume is Bitget-reported and implausibly large versus underlying market volume; treat it as relative liquidity ordering only, never as an absolute signal.");
  }
  if (onchain.status === "UNAVAILABLE") gaps.push("On-chain activity unavailable" + (onchain.note ? ": " + onchain.note : "") + ".");
  if (onchain.status === "PENDING") gaps.push("On-chain activity not collected.");
  if (onchain.windowTruncated) gaps.push("On-chain window counts are bounded by the number of transfer pages fetched and may understate true activity.");
  if (onchain.status === "OK" && onchain.transfersInWindow === 0) gaps.push("No on-chain transfers observed in the window; absence of activity is not evidence of absence of interest.");
  if (news.status === "UNAVAILABLE") gaps.push("External news unavailable: " + news.providersFailed.map((f) => f.provider).join(", ") + ".");
  if (news.status === "PENDING") gaps.push("External news not collected.");
  if (news.status === "OK" && news.items.length === 0) gaps.push("No news matched the queries in the last " + news.windowHours + "h; this is a finding, not a failure, but it means no external catalyst is evidenced.");
  if (onchain.status === "OK" && onchain.chain && onchain.chain !== "ArbitrumOne") gaps.push("Reported chain is " + onchain.chain + "; the primary ArbitrumOne deployment was not available.");
  return gaps;
}

async function buildUncached(options: BuildOptions, now: number): Promise<BuildResult> {
  const rToken = normalizeSymbol(options.rToken);
  const windowHours = options.windowHours ?? envInt("RESEARCH_WINDOW_HOURS", 48);
  const newsEnabled = options.newsEnabled ?? envFlag("NEWS_ENABLED", true);
  const onchainEnabled = options.onchainEnabled ?? envFlag("ONCHAIN_ENABLED", true);

  const startedAt = Date.now();
  let symbols: BitgetSpotSymbol[];
  try {
    symbols = await getRTokenSymbols();
  } catch (err) {
    return { status: "FAILED", code: "UNKNOWN_RTOKEN", reason: "Bitget symbol list unavailable: " + String(err instanceof Error ? err.message : err), rToken, underlyingTicker: null };
  }

  const exact = symbols.find((s) => s.baseCoin === rToken);
  const loose = exact ?? symbols.find((s) => s.baseCoin.toLowerCase() === rToken.toLowerCase());
  if (!loose) {
    return { status: "FAILED", code: "UNKNOWN_RTOKEN", reason: rToken + " is not in the live Bitget rToken universe (" + symbols.length + " rXXX/USDT pairs).", rToken, underlyingTicker: underlyingTicker(rToken) };
  }

  const canonical = loose.baseCoin;
  const entry: UniverseEntry = { rToken: canonical, ticker: underlyingTicker(canonical), pairSymbol: loose.symbol };

  const marketStartedAt = Date.now();
  let newsMs = 0;
  const [ticker, quote, contracts, news] = await Promise.all([
    fetchTicker(entry.pairSymbol),
    getEquityQuote(entry.ticker),
    resolveContracts(canonical),
    (async () => {
      const newsStartedAt = Date.now();
      const collected = await collectNews({ rToken: canonical, underlyingTicker: entry.ticker, windowHours, enabled: newsEnabled, now });
      newsMs = Date.now() - newsStartedAt;
      return collected;
    })(),
  ]);
  const marketMs = Date.now() - marketStartedAt;

  const row = buildDivergenceRow(entry, ticker ?? null, quote);

  if (row.rPrice === null || !ticker) {
    return { status: "FAILED", code: "NO_TOKEN_DATA", reason: "Bitget returned no usable last price for " + entry.pairSymbol + ".", rToken: canonical, underlyingTicker: entry.ticker };
  }
  if (!quote || row.stockPrice === null) {
    return { status: "FAILED", code: "NO_EQUITY_DATA", reason: "Yahoo Finance returned no usable quote for " + entry.ticker + ", so no window-aligned comparison is possible.", rToken: canonical, underlyingTicker: entry.ticker };
  }

  const onchainStartedAt = Date.now();
  const onchain = await collectOnchain({
    rToken: canonical,
    rPrice: row.rPrice,
    windowHours,
    enabled: onchainEnabled,
    now,
    contracts: contracts.contracts,
    contractNote: contracts.note,
  });
  const onchainMs = Date.now() - onchainStartedAt;

  const asset: AssetRef = {
    rToken: canonical,
    underlyingTicker: entry.ticker,
    pairSymbol: entry.pairSymbol,
    instrumentType: quote.instrumentType,
    contract: contracts.contracts[0] ?? null,
    contracts: contracts.contracts,
    contractMatchSource: contracts.matchSource,
  };

  const market: MarketSnapshot = {
    rPrice: row.rPrice,
    rChange24hPct: row.rChange24hPct,
    usdtVolume24h: row.usdtVolume24h,
    bidPrice: row.bidPrice,
    askPrice: row.askPrice,
    fetchedAt: row.rFetchedAt ?? now,
  };
  const underlying: UnderlyingSnapshot = {
    price: row.stockPrice as number,
    previousClose: row.sessionAnchor,
    changePct: row.stockChangePct,
    marketState: quote.marketState,
    exchange: quote.exchange,
    fetchedAt: quote.fetchedAt,
  };
  const comparison: ComparisonSnapshot = {
    spreadPct: row.spreadPct,
    divergencePp: row.divergencePp,
    alignedRChangePct: row.alignedRChangePct,
    thresholdPp: thresholdFor(row.instrumentType),
    flagged: row.flagged,
  };

  const evidence = buildEvidenceItems(asset, row, ticker, quote, market, underlying, comparison, onchain, news);
  const totalMs = Date.now() - startedAt;

  return {
    status: "OK",
    pkg: {
      schemaVersion: "1.0",
      generatedAt: now,
      asset,
      market,
      underlying,
      comparison,
      onchain,
      news,
      evidence,
      gaps: buildGaps(row, market, onchain, news),
      timing: { marketMs, onchainMs, newsMs, totalMs },
    },
  };
}

export async function buildEvidencePackage(options: BuildOptions): Promise<BuildResult> {
  const now = options.now ?? Date.now();
  const key = normalizeSymbol(options.rToken).toLowerCase();
  if (!options.force) {
    const hit = cache.get(key);
    if (hit && now - hit.at < CACHE_TTL_MS) return hit.result;
  }
  const result = await buildUncached(options, now);
  cache.set(key, { at: Date.now(), result });
  return result;
}
