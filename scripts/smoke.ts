import type { DivergenceRow } from "../lib/analysis/reference";
import { scanMarket } from "../lib/scanner/scan";

function pad(value: string, width: number): string {
  return value.length >= width ? value.slice(0, width) : value + " ".repeat(width - value.length);
}

function padLeft(value: string, width: number): string {
  return value.length >= width ? value : " ".repeat(width - value.length) + value;
}

function num(value: number | null, digits: number): string {
  return value === null ? "-" : value.toFixed(digits);
}

function formatRow(row: DivergenceRow): string {
  const volume = row.usdtVolume24h === null ? "-" : Math.round(row.usdtVolume24h).toLocaleString("en-US");
  return (
    pad(row.rToken, 10) +
    pad(row.ticker, 8) +
    padLeft(num(row.rPrice, 4), 10) +
    padLeft(num(row.stockPrice, 2), 10) +
    pad("  " + row.marketState, 10) +
    padLeft(num(row.divergencePp, 2), 9) +
    padLeft(num(row.spreadPct, 2), 9) +
    padLeft(num(row.stockChangePct, 2), 9) +
    padLeft(volume, 16) +
    "  " +
    (row.flagged ? "FLAG" : "")
  );
}

async function main(): Promise<void> {
  console.log("Bitget rVue smoke test - full universe scan (force, no cache)");
  const summary = await scanMarket({ force: true });
  console.log("");
  console.log("durationMs        : " + summary.durationMs);
  console.log("universe          : " + summary.universe);
  console.log("ok                : " + summary.ok);
  console.log("flagged           : " + summary.flagged);
  console.log("missingEquityData : " + summary.missingEquityData);
  console.log("missingTokenData  : " + summary.missingTokenData);
  console.log("suspectMispairing : " + summary.suspectMispairing);
  console.log("");
  console.log("TOP 25 by |divergencePp|:");
  console.log(
    pad("rToken", 10) +
      pad("ticker", 8) +
      padLeft("r=", 10) +
      padLeft("s=", 10) +
      pad("  state", 10) +
      padLeft("div=pp", 9) +
      padLeft("sprd=%", 9) +
      padLeft("sChg=%", 9) +
      padLeft("vol", 16) +
      "  FLAG",
  );
  for (const row of summary.rows.slice(0, 25)) {
    console.log(formatRow(row));
  }
  const suspects = summary.rows.filter((row) => row.status === "SUSPECT_MISPAIRING");
  if (suspects.length > 0) {
    console.log("");
    console.log("SUSPECT_MISPAIRING rows (quarantined, spread >= 50%):");
    for (const row of suspects) {
      console.log(
        "  " + pad(row.rToken, 10) + pad(row.ticker, 8) + "r=" + num(row.rPrice, 4) + "  s=" + num(row.stockPrice, 2) + "  sprd=" + num(row.spreadPct, 2) + "%",
      );
    }
  }
  console.log("");
  const sample = summary.missingEquitySample;
  console.log(
    "missing equity sample (" + sample.length + " shown): " + (sample.length > 0 ? sample.join(", ") : "(none)"),
  );
  console.log("");
  console.log("SMOKE OK");
}

main().catch((err: unknown) => {
  console.error("SMOKE FAILED:", err);
  process.exitCode = 1;
});
