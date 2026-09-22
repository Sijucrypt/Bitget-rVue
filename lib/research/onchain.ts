import { fetchJson } from "../net/doh";
import { HttpError, fetchJsonLoose } from "../net/http";
import { getRTokenCoins, type BitgetApiResponse, type BitgetCoin } from "../market/bitget";
import type { ContractRef, DataStatus, OnchainSnapshot, OnchainTransfer } from "../evidence/types";

// Tier-2 on-chain activity. rTokens are deployed on ArbitrumOne and Morph
// (research/_rtoken_universe.txt: chain_combos = {ArbitrumOne: 1206,
// ArbitrumOne+Morph: 32}). ArbitrumOne is indexed by a public, keyless
// Blockscout v2 instance, so holder and transfer activity needs no API key.
//
// Endpoint behaviour verified against arbitrum.blockscout.com on 2026-09-09:
//   GET /api/v2/tokens/{address}            -> 200, decimals/holders_count/total_supply
//   GET /api/v2/tokens/{address}/counters   -> 200, {token_holders_count, transfers_count}
//   GET /api/v2/tokens/{address}/transfers  -> 200, 50 items + next_page_params
//   any ?limit= or ?type= query param       -> 422 "Unexpected field"
//   explorer.morphl2.io /api/v2/tokens/*    -> 404 (not a Blockscout v2 API)
//
// Everything degrades honestly: a failed lookup yields UNAVAILABLE plus a
// recorded reason, never a zero and never a guess.

const BITGET_BASE = "https://api.bitget.com";
const DEFAULT_WINDOW_HOURS = 48;
const DEFAULT_MAX_PAGES = 4;
const TOKEN_TIMEOUT_MS = 20000;
const TRANSFER_TIMEOUT_MS = 45000;
const TRANSPORT_ATTEMPTS = 3;

const BLOCKSCOUT_BASES: Record<string, string> = {
  ArbitrumOne: "https://arbitrum.blockscout.com",
  Arbitrum: "https://arbitrum.blockscout.com",
};

// Chains we know Bitget deploys to but whose explorers do not expose the
// Blockscout v2 token API. Recorded as skipped instead of silently dropped.
const UNSUPPORTED_CHAIN_REASONS: Record<string, string> = {
  Morph: "explorer.morphl2.io returns 404 for the Blockscout v2 token API",
};

// ArbitrumOne carries the deployment for every rToken, so it is the reporting
// chain whenever a token exists on more than one.
const CHAIN_PRIORITY = ["ArbitrumOne", "Arbitrum"];

interface BlockscoutToken {
  name?: string | null;
  symbol?: string | null;
  decimals?: string | number | null;
  holders_count?: string | number | null;
  transfers_count?: string | number | null;
  total_supply?: string | number | null;
}

interface BlockscoutCounters {
  token_holders_count?: string | number | null;
  holders_count?: string | number | null;
  transfers_count?: string | number | null;
}

interface BlockscoutAddress {
  hash?: string | null;
}

interface BlockscoutTokenAmount {
  value?: string | number | null;
  decimals?: string | number | null;
}

interface BlockscoutTransfer {
  transaction_hash?: string | null;
  block_number?: number | string | null;
  timestamp?: string | null;
  from?: BlockscoutAddress | null;
  to?: BlockscoutAddress | null;
  total?: BlockscoutTokenAmount | null;
}

interface BlockscoutTransferPage {
  items?: BlockscoutTransfer[] | null;
  next_page_params?: Record<string, unknown> | null;
}

export interface ResolvedContracts {
  contracts: ContractRef[];
  matchSource: "areaCoin" | "nameMatch" | "not_found";
  note: string | null;
}

export interface CollectOnchainOptions {
  rToken: string;
  rPrice?: number | null;
  windowHours?: number;
  enabled?: boolean;
  now?: number;
  // Pre-resolved refs let the caller fetch the Bitget coin list once and share
  // it with the Evidence Package builder instead of paying for it twice.
  contracts?: ContractRef[];
  contractNote?: string | null;
}

function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === "") return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function toFiniteNumber(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = typeof value === "number" ? value : Number.parseFloat(String(value));
  return Number.isFinite(parsed) ? parsed : null;
}

// Raw token amounts are integers in base units and exceed Number.MAX_SAFE_INTEGER
// at 18 decimals (rTSLA total_supply is 23 digits), so the decimal shift is done
// on the digit string and only the final value becomes a float.
function fromRawUnits(raw: string | number | null | undefined, decimals: number | null): number | null {
  if (raw === null || raw === undefined || raw === "") return null;
  const text = String(raw).trim();
  if (text.length === 0) return null;
  const scale = decimals !== null && Number.isFinite(decimals) ? Math.max(0, Math.trunc(decimals)) : 0;
  if (scale === 0) return toFiniteNumber(text);
  const negative = text.startsWith("-");
  const digits = (negative ? text.slice(1) : text).split(".")[0];
  if (!/^\d+$/.test(digits)) return toFiniteNumber(text);
  const padded = digits.padStart(scale + 1, "0");
  const cut = padded.length - scale;
  const whole = padded.slice(0, cut).replace(/^0+(?=\d)/, "");
  const fraction = padded.slice(cut);
  const value = Number.parseFloat(whole + "." + fraction);
  if (!Number.isFinite(value)) return null;
  return negative ? -value : value;
}

// undici surfaces transport flakiness as a bare "fetch failed" with the real
// reason on .cause, which is useless in a gap message unless it is unwrapped.
function describeError(err: unknown): string {
  const wrapper = err as { message?: string; cause?: unknown };
  const cause = wrapper?.cause as { message?: string; code?: string } | undefined;
  const base = String(wrapper?.message ?? err).slice(0, 140);
  if (!cause) return base;
  const detail = String(cause.message ?? cause).slice(0, 100);
  return base + " (cause: " + detail + (cause.code ? " " + cause.code : "") + ")";
}

// 4xx responses are deterministic and must not be retried; only transport-level
// failures and 5xx are, because Blockscout intermittently resets cold
// connections.
async function fetchWithRetry<T>(url: string, timeoutMs: number): Promise<T> {
  let lastError: unknown = null;
  for (let attempt = 0; attempt < TRANSPORT_ATTEMPTS; attempt += 1) {
    try {
      return await fetchJsonLoose<T>(url, { timeoutMs });
    } catch (err) {
      lastError = err;
      if (err instanceof HttpError && err.status >= 400 && err.status < 500) throw err;
    }
  }
  throw lastError;
}

function buildQueryUrl(baseUrl: string, params: Record<string, unknown>): string {
  const query = Object.entries(params)
    .filter(([, value]) => value !== null && value !== undefined && String(value).length > 0)
    .map(([key, value]) => encodeURIComponent(key) + "=" + encodeURIComponent(String(value)))
    .join("&");
  return query.length > 0 ? baseUrl + "?" + query : baseUrl;
}

// getRTokenCoins() filters on areaCoin === "yes", but research/_coins_probe.txt
// shows rNVDA/rTSLA/rAAPL carrying areaCoin === "no" while still holding real
// contract addresses, and a live run confirmed rTSLA only resolves by name. So
// the filtered call is tried first and a name match over the full coin list is
// used as a fallback; the result records which path matched rather than mixing
// them silently.
export async function resolveContracts(rToken: string): Promise<ResolvedContracts> {
  const toRefs = (coin: BitgetCoin): ContractRef[] =>
    (coin.chains ?? [])
      .filter((chain) => typeof chain.contractAddress === "string" && chain.contractAddress.length > 0)
      .map((chain) => ({
        chain: chain.chain,
        address: chain.contractAddress as string,
        explorerTxUrl: chain.browserUrl && chain.browserUrl.length > 0 ? chain.browserUrl : undefined,
      }));

  try {
    const areaCoins = await getRTokenCoins();
    const hit = areaCoins.find((coin) => coin.coin === rToken);
    if (hit) {
      const contracts = toRefs(hit);
      if (contracts.length > 0) return { contracts, matchSource: "areaCoin", note: null };
    }
  } catch {
    // Fall through to the unfiltered name match.
  }

  try {
    const body = await fetchJson<BitgetApiResponse<BitgetCoin[]>>(BITGET_BASE + "/api/v2/spot/public/coins", {
      timeoutMs: 20000,
    });
    if (body.code !== "00000" || !Array.isArray(body.data)) {
      return { contracts: [], matchSource: "not_found", note: "Bitget coins responded with code " + body.code };
    }
    const hit = body.data.find((coin) => coin.coin === rToken);
    if (!hit) return { contracts: [], matchSource: "not_found", note: "no Bitget coin entry named " + rToken };
    const contracts = toRefs(hit);
    if (contracts.length === 0) {
      return { contracts: [], matchSource: "nameMatch", note: "coin entry has no chain with a contract address" };
    }
    return { contracts, matchSource: "nameMatch", note: null };
  } catch (err) {
    return { contracts: [], matchSource: "not_found", note: "contract resolution failed: " + describeError(err) };
  }
}

function pickPrimaryChain(contracts: ContractRef[]): ContractRef | null {
  if (contracts.length === 0) return null;
  for (const chain of CHAIN_PRIORITY) {
    const hit = contracts.find((contract) => contract.chain === chain);
    if (hit) return hit;
  }
  return contracts[0];
}

function emptySnapshot(windowHours: number): OnchainSnapshot {
  return {
    status: "PENDING",
    chain: null,
    address: null,
    provider: null,
    tokenName: null,
    tokenSymbol: null,
    decimals: null,
    totalSupply: null,
    holdersCount: null,
    transfersCountTotal: null,
    windowHours,
    transfersInWindow: null,
    windowTruncated: false,
    transferVolumeTokens: null,
    transferVolumeUsdt: null,
    largestTransferTokens: null,
    distinctCounterparties: null,
    recentTransfers: [],
    chainsSkipped: [],
    note: null,
    fetchedAt: null,
  };
}

export async function collectOnchain(options: CollectOnchainOptions): Promise<OnchainSnapshot> {
  const windowHours = options.windowHours ?? DEFAULT_WINDOW_HOURS;
  const maxPages = envInt("ONCHAIN_MAX_PAGES", DEFAULT_MAX_PAGES);
  const now = options.now ?? Date.now();
  const cutoff = now - windowHours * 3600 * 1000;

  if (options.enabled === false) {
    const snapshot = emptySnapshot(windowHours);
    snapshot.note = "on-chain collection disabled via ONCHAIN_ENABLED";
    return snapshot;
  }

  const resolved: ResolvedContracts = options.contracts
    ? { contracts: options.contracts, matchSource: "areaCoin", note: options.contractNote ?? null }
    : await resolveContracts(options.rToken);

  const primary = pickPrimaryChain(resolved.contracts);
  const chainsSkipped = resolved.contracts
    .filter((contract) => contract !== primary)
    .map((contract) => ({
      chain: contract.chain,
      reason: UNSUPPORTED_CHAIN_REASONS[contract.chain] ?? "only the primary deployment is reported",
    }));

  const snapshot = emptySnapshot(windowHours);
  snapshot.chainsSkipped = chainsSkipped;
  snapshot.fetchedAt = now;

  if (!primary) {
    snapshot.status = "UNAVAILABLE";
    snapshot.note = resolved.note ?? "no contract address resolved for " + options.rToken;
    return snapshot;
  }

  snapshot.chain = primary.chain;
  snapshot.address = primary.address;

  const base = BLOCKSCOUT_BASES[primary.chain];
  if (!base) {
    snapshot.status = "UNAVAILABLE";
    snapshot.note = UNSUPPORTED_CHAIN_REASONS[primary.chain] ?? "no Blockscout v2 indexer configured for chain " + primary.chain;
    return snapshot;
  }

  snapshot.provider = "blockscout:" + base.replace(/^https?:\/\//, "");
  const tokenUrl = base + "/api/v2/tokens/" + primary.address;
  const failures: string[] = [];

  let decimals: number | null = null;
  try {
    const token = await fetchWithRetry<BlockscoutToken>(tokenUrl, TOKEN_TIMEOUT_MS);
    decimals = toFiniteNumber(token.decimals);
    snapshot.tokenName = typeof token.name === "string" ? token.name : null;
    snapshot.tokenSymbol = typeof token.symbol === "string" ? token.symbol : null;
    snapshot.decimals = decimals;
    snapshot.totalSupply = fromRawUnits(token.total_supply, decimals);
    snapshot.holdersCount = toFiniteNumber(token.holders_count);
    snapshot.transfersCountTotal = toFiniteNumber(token.transfers_count);
  } catch (err) {
    failures.push("token metadata: " + describeError(err));
  }

  if (snapshot.holdersCount === null || snapshot.transfersCountTotal === null) {
    try {
      const counters = await fetchWithRetry<BlockscoutCounters>(tokenUrl + "/counters", TOKEN_TIMEOUT_MS);
      if (snapshot.holdersCount === null) {
        snapshot.holdersCount = toFiniteNumber(counters.token_holders_count) ?? toFiniteNumber(counters.holders_count);
      }
      if (snapshot.transfersCountTotal === null) snapshot.transfersCountTotal = toFiniteNumber(counters.transfers_count);
    } catch (err) {
      failures.push("counters: " + describeError(err));
    }
  }

  const transfersBase = tokenUrl + "/transfers";
  const transfers: OnchainTransfer[] = [];
  let inWindowCount = 0;
  let volumeTokens = 0;
  let largestTokens: number | null = null;
  let transfersFailed = false;
  const counterparties = new Set<string>();
  let truncated = false;
  let nextUrl: string | null = transfersBase;

  for (let page = 0; page < maxPages && nextUrl !== null; page += 1) {
    try {
      const body: BlockscoutTransferPage = await fetchWithRetry<BlockscoutTransferPage>(nextUrl, TRANSFER_TIMEOUT_MS);
      const items: BlockscoutTransfer[] = Array.isArray(body.items) ? body.items : [];
      if (items.length === 0) {
        nextUrl = null;
        break;
      }
      let reachedCutoff = false;
      for (const transfer of items) {
        const timestamp = transfer.timestamp ? Date.parse(transfer.timestamp) : Number.NaN;
        if (!Number.isFinite(timestamp)) continue;
        if (timestamp < cutoff) {
          reachedCutoff = true;
          continue;
        }
        if (timestamp > now + 60_000) continue;
        const amount = fromRawUnits(transfer.total?.value, toFiniteNumber(transfer.total?.decimals) ?? decimals);
        const from = transfer.from?.hash ?? "";
        const to = transfer.to?.hash ?? "";
        const txHash = transfer.transaction_hash ?? "";
        inWindowCount += 1;
        if (amount !== null) {
          volumeTokens += amount;
          if (largestTokens === null || amount > largestTokens) largestTokens = amount;
        }
        if (from) counterparties.add(from);
        if (to) counterparties.add(to);
        if (transfers.length < 10) {
          transfers.push({
            txHash,
            timestamp,
            from,
            to,
            amount,
            txUrl: primary.explorerTxUrl && txHash ? primary.explorerTxUrl + txHash : txHash ? base + "/tx/" + txHash : null,
          });
        }
      }
      const more = body.next_page_params && Object.keys(body.next_page_params).length > 0;
      if (reachedCutoff || !more) {
        nextUrl = null;
      } else if (page === maxPages - 1) {
        // Still inside the window with more pages available: the count is a
        // floor, not a total, and is reported as such.
        truncated = true;
        nextUrl = null;
      } else {
        nextUrl = buildQueryUrl(transfersBase, body.next_page_params as Record<string, unknown>);
      }
    } catch (err) {
      transfersFailed = true;
      failures.push("transfers: " + describeError(err));
      nextUrl = null;
    }
  }

  const rPrice = options.rPrice ?? null;
  snapshot.transfersInWindow = transfersFailed && inWindowCount === 0 ? null : inWindowCount;
  snapshot.windowTruncated = truncated;
  snapshot.transferVolumeTokens = snapshot.transfersInWindow === null ? null : volumeTokens;
  snapshot.transferVolumeUsdt =
    snapshot.transfersInWindow === null || rPrice === null || !Number.isFinite(rPrice) ? null : volumeTokens * rPrice;
  snapshot.largestTransferTokens = largestTokens;
  snapshot.distinctCounterparties = snapshot.transfersInWindow === null ? null : counterparties.size;
  snapshot.recentTransfers = transfers.sort((a, b) => b.timestamp - a.timestamp);

  const anySuccess =
    snapshot.tokenName !== null || snapshot.holdersCount !== null || snapshot.transfersCountTotal !== null || snapshot.transfersInWindow !== null;
  const status: DataStatus = anySuccess ? "OK" : "UNAVAILABLE";
  snapshot.status = status;
  snapshot.note = failures.length > 0 ? failures.join(" | ").slice(0, 500) : resolved.note;
  return snapshot;
}
