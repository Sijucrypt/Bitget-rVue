import fs from "node:fs";
import path from "node:path";

// Next.js loads .env automatically for route handlers, but tsx does not, so the
// verification scripts would report "model not configured" even with a valid
// key present. This fills only the variables that are not already set, which
// means it never overrides a real environment and is a no-op under Next.

export interface DotEnvResult {
  file: string;
  loaded: string[];
  skippedExisting: string[];
  malformed: string[];
}

function stripQuotes(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length >= 2) {
    const first = trimmed[0];
    const last = trimmed[trimmed.length - 1];
    if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
      return trimmed.slice(1, -1);
    }
  }
  return trimmed;
}

export function loadDotEnv(fileName: string = ".env"): DotEnvResult {
  const file = path.join(process.cwd(), fileName);
  const result: DotEnvResult = { file, loaded: [], skippedExisting: [], malformed: [] };
  let raw: string;
  try {
    raw = fs.readFileSync(file, "utf8");
  } catch {
    return result;
  }

  for (const line of raw.split(/\r?\n/)) {
    const text = line.trim();
    if (text.length === 0 || text.startsWith("#")) continue;
    const withoutExport = text.startsWith("export ") ? text.slice(7).trim() : text;
    const separator = withoutExport.indexOf("=");
    if (separator <= 0) {
      result.malformed.push(text.slice(0, 60));
      continue;
    }
    const key = withoutExport.slice(0, separator).trim();
    const value = stripQuotes(withoutExport.slice(separator + 1));
    if (key.length === 0) {
      result.malformed.push(text.slice(0, 60));
      continue;
    }
    if (process.env[key] !== undefined && process.env[key] !== "") {
      result.skippedExisting.push(key);
      continue;
    }
    process.env[key] = value;
    result.loaded.push(key);
  }
  return result;
}
