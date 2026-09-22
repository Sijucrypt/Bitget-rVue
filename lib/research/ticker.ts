import { fetchJson } from "../net/doh";
import type { BitgetApiResponse, BitgetTicker } from "../market/bitget";

const BITGET_BASE = "https://api.bitget.com";

// Single-symbol ticker fetch. getAllTickers() pulls the whole exchange (~1.3k
// rows) which is right for the market-wide scanner but wasteful for a per-asset
// research call. Same endpoint, same payload shape, narrowed by symbol.
export async function fetchTicker(pairSymbol: string): Promise<BitgetTicker | null> {
  const url = BITGET_BASE + "/api/v2/spot/market/tickers?symbol=" + encodeURIComponent(pairSymbol);
  try {
    const body = await fetchJson<BitgetApiResponse<BitgetTicker[]>>(url, { timeoutMs: 15000 });
    if (body.code !== "00000" || !Array.isArray(body.data) || body.data.length === 0) return null;
    return body.data[0];
  } catch {
    return null;
  }
}
