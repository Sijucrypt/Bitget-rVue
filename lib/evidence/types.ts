import type { MarketState } from "../market/equities";

// Tier 2 evidence contract. The scanner (Tier 1) produces deterministic rows;
// a per-asset brief wraps those numbers into an EvidencePackage where every
// claim is tagged by kind so the model layer can only interpret, never invent.

export type ClaimKind = "FACT" | "COMPUTED" | "INTERPRETATION" | "UNKNOWN";

// OK          - the collector ran and returned usable data (possibly an empty set)
// UNAVAILABLE - the collector ran and failed; the gap is recorded honestly
// PENDING     - the collector was not attempted (disabled or not yet integrated)
//
// An empty OK result means "searched, found nothing", which is a real finding
// and must never be conflated with UNAVAILABLE.
export type DataStatus = "OK" | "UNAVAILABLE" | "PENDING";

export interface EvidenceItem {
  id: string;
  kind: ClaimKind;
  statement: string;
  source: string;
  observedAt: number;
  value?: number;
  unit?: string;
}

export interface ContractRef {
  chain: string;
  address: string;
  explorerTxUrl?: string;
}

export interface AssetRef {
  rToken: string;
  underlyingTicker: string;
  pairSymbol: string;
  instrumentType: string;
  contract: ContractRef | null;
  contracts: ContractRef[];
  // areaCoin  - matched Bitget's rToken flag; nameMatch - matched by coin name
  // because the areaCoin flag is not set on every rToken deployment.
  contractMatchSource: "areaCoin" | "nameMatch" | "not_found";
}

export interface MarketSnapshot {
  rPrice: number;
  rChange24hPct: number | null;
  usdtVolume24h: number | null;
  bidPrice: number | null;
  askPrice: number | null;
  fetchedAt: number;
}

export interface UnderlyingSnapshot {
  price: number;
  previousClose: number | null;
  changePct: number | null;
  marketState: MarketState | "NO_DATA";
  exchange: string;
  currency?: string;
  fetchedAt: number;
}

export interface ComparisonSnapshot {
  spreadPct: number | null;
  divergencePp: number | null;
  alignedRChangePct: number | null;
  thresholdPp: number;
  flagged: boolean;
}

export interface NewsItem {
  id: string;
  title: string;
  url: string;
  source: string;
  provider: string;
  publishedAt: number;
  query: string;
  relevance: "UNDERLYING" | "RTOKEN";
}

export interface NewsSnapshot {
  status: DataStatus;
  windowHours: number;
  items: NewsItem[];
  queries: string[];
  providersFailed: Array<{ provider: string; reason: string }>;
  fetchedAt: number | null;
}

export interface OnchainTransfer {
  txHash: string;
  timestamp: number;
  from: string;
  to: string;
  amount: number | null;
  txUrl: string | null;
}

export interface OnchainSnapshot {
  status: DataStatus;
  chain: string | null;
  address: string | null;
  provider: string | null;
  tokenName: string | null;
  tokenSymbol: string | null;
  decimals: number | null;
  totalSupply: number | null;
  holdersCount: number | null;
  transfersCountTotal: number | null;
  windowHours: number;
  transfersInWindow: number | null;
  windowTruncated: boolean;
  transferVolumeTokens: number | null;
  transferVolumeUsdt: number | null;
  largestTransferTokens: number | null;
  distinctCounterparties: number | null;
  recentTransfers: OnchainTransfer[];
  chainsSkipped: Array<{ chain: string; reason: string }>;
  note: string | null;
  fetchedAt: number | null;
}

export interface CollectorTiming {
  marketMs: number;
  onchainMs: number;
  newsMs: number;
  totalMs: number;
}

export interface EvidencePackage {
  schemaVersion: "1.0";
  generatedAt: number;
  asset: AssetRef;
  market: MarketSnapshot;
  underlying: UnderlyingSnapshot;
  comparison: ComparisonSnapshot;
  onchain: OnchainSnapshot;
  news: NewsSnapshot;
  evidence: EvidenceItem[];
  gaps: string[];
  timing: CollectorTiming;
}
