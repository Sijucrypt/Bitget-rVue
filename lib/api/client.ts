// Typed fetch wrappers for the app's own API routes. The scan types live here
// (moved verbatim from the old app/page.tsx) so the board, the shell's flagged
// badge and the command palette all share one contract.

export interface DivergenceRow {
  rToken: string;
  ticker: string;
  pairSymbol: string;
  status: string;
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

export async function fetchScan(force: boolean = false): Promise<ScanSummary> {
  const response = await fetch("/api/scan" + (force ? "?force=1" : ""));
  if (!response.ok) {
    let detail = "";
    try {
      detail = (await response.text()).slice(0, 200);
    } catch {
      detail = "";
    }
    throw new Error("Scan failed: HTTP " + response.status + (detail ? " - " + detail : ""));
  }
  return (await response.json()) as ScanSummary;
}