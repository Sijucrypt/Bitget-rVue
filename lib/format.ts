// Shared deterministic formatters. Pure functions, no UI dependency: the
// evidence builder and the API layer both need identical number rendering so
// that a figure reads the same in the Evidence Package, the brief, and the UI.

export function fmtPct(value: number | null, digits: number = 2): string {
  if (value === null || !Number.isFinite(value)) return "-";
  return (value >= 0 ? "+" : "") + value.toFixed(digits) + "%";
}

export function fmtPp(value: number | null, digits: number = 2): string {
  if (value === null || !Number.isFinite(value)) return "-";
  return (value >= 0 ? "+" : "") + value.toFixed(digits) + "pp";
}

export function fmtPrice(value: number | null, digits: number = 2): string {
  if (value === null || !Number.isFinite(value)) return "-";
  return value.toFixed(digits);
}

export function fmtCount(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "-";
  return Math.round(value).toLocaleString("en-US");
}

export function fmtVolume(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "-";
  if (Math.abs(value) >= 1_000_000_000) return (value / 1_000_000_000).toFixed(2) + "B";
  if (Math.abs(value) >= 1_000_000) return (value / 1_000_000).toFixed(2) + "M";
  if (Math.abs(value) >= 1_000) return (value / 1_000).toFixed(1) + "K";
  return value.toFixed(0);
}

export function fmtUtc(timestamp: number | null): string {
  if (timestamp === null || !Number.isFinite(timestamp)) return "-";
  return new Date(timestamp).toISOString();
}

export function fmtAge(timestamp: number | null, now: number = Date.now()): string {
  if (timestamp === null || !Number.isFinite(timestamp)) return "-";
  const seconds = Math.max(0, Math.round((now - timestamp) / 1000));
  if (seconds < 60) return seconds + "s";
  if (seconds < 3600) return Math.round(seconds / 60) + "m";
  if (seconds < 86400) return Math.round(seconds / 3600) + "h";
  return Math.round(seconds / 86400) + "d";
}

export function pct(change: number, base: number): number | null {
  if (!Number.isFinite(base) || base === 0 || !Number.isFinite(change)) return null;
  return (change / base) * 100;
}
