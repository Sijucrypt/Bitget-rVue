import { fetchJson } from "../net/doh";

const BITGET_BASE = "https://api.bitget.com";

export interface BitgetApiResponse<T> {
  code: string;
  msg: string;
  requestTime: number;
  data: T;
}

export interface BitgetSpotSymbol {
  symbol: string;
  baseCoin: string;
  quoteCoin: string;
  status: string;
  areaSymbol?: string;
  minTradeAmount?: string;
  minTradeUSDT?: string;
  priceScale?: string;
  pricePlace?: string;
  volumePlace?: string;
}

export interface BitgetTicker {
  symbol: string;
  lastPr: string;
  open: string;
  high24h: string;
  low24h: string;
  change24h: string;
  changeUtc24h: string;
  quoteVolume: string;
  baseVolume: string;
  usdtVolume: string;
  ts: string;
  bidPr: string;
  askPr: string;
  bidSz: string;
  askSz: string;
  openUtc: string;
}

export interface BitgetCoinChain {
  chain: string;
  contractAddress?: string;
  browserUrl?: string;
  withdrawable: string;
  rechargeable: string;
  withdrawFee?: string;
  minDepositAmount?: string;
  minWithdrawAmount?: string;
}

export interface BitgetCoin {
  coinId: string;
  coin: string;
  transfer: string;
  areaCoin?: string;
  chains: BitgetCoinChain[];
}

function assertOk<T>(body: BitgetApiResponse<T>, what: string): T {
  if (body.code !== "00000") {
    throw new Error("Bitget " + what + " failed with code " + body.code + ": " + body.msg);
  }
  return body.data;
}

// Bitget tags tokenized-stock products natively: spot symbols carry
// areaSymbol="yes" and coins carry areaCoin="yes". This is the authoritative
// rToken universe filter (verified against research/_rtoken_scan.txt: 705 rows).
export async function getRTokenSymbols(): Promise<BitgetSpotSymbol[]> {
  const body = await fetchJson<BitgetApiResponse<BitgetSpotSymbol[]>>(
    BITGET_BASE + "/api/v2/spot/public/symbols",
    { timeoutMs: 20000 },
  );
  const data = assertOk(body, "symbols");
  return data.filter((s) => s.areaSymbol === "yes" && s.status === "online" && s.quoteCoin === "USDT");
}

export async function getAllTickers(): Promise<Map<string, BitgetTicker>> {
  const body = await fetchJson<BitgetApiResponse<BitgetTicker[]>>(
    BITGET_BASE + "/api/v2/spot/market/tickers",
    { timeoutMs: 20000 },
  );
  const data = assertOk(body, "tickers");
  return new Map(data.map((t) => [t.symbol, t]));
}

export async function getRTokenCoins(): Promise<BitgetCoin[]> {
  const body = await fetchJson<BitgetApiResponse<BitgetCoin[]>>(
    BITGET_BASE + "/api/v2/spot/public/coins",
    { timeoutMs: 20000 },
  );
  const data = assertOk(body, "coins");
  return data.filter((c) => c.areaCoin === "yes");
}
