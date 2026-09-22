import type { LookupAddress, LookupOptions } from "node:dns";
import { Agent, fetch as undiciFetch } from "undici";

// Local resolver blocks/poisons exchange and crypto domains, so all outbound
// data calls resolve hostnames through DNS-over-HTTPS and connect via a custom
// undici agent. The DoH endpoints themselves resolve fine over system DNS.

const DOH_ENDPOINTS = [
  "https://cloudflare-dns.com/dns-query",
  "https://dns.google/resolve",
];

const DEFAULT_USER_AGENT = "rvue-research/1.0";
const DNS_CACHE_TTL_MS = 5 * 60 * 1000;

interface DohAnswer {
  name: string;
  type: number;
  TTL?: number;
  data: string;
}

interface DohResponse {
  Status: number;
  Answer?: DohAnswer[];
}

interface DnsCacheEntry {
  addresses: string[];
  expiresAt: number;
}

const dnsCache = new Map<string, DnsCacheEntry>();

async function resolveViaDoh(hostname: string): Promise<string[]> {
  let lastError: unknown = null;
  for (const endpoint of DOH_ENDPOINTS) {
    try {
      const url = endpoint + "?name=" + encodeURIComponent(hostname) + "&type=A";
      const response = await fetch(url, {
        headers: { accept: "application/dns-json" },
        cache: "no-store",
        signal: AbortSignal.timeout(6000),
      });
      if (!response.ok) {
        lastError = new Error("DoH HTTP " + response.status + " from " + endpoint);
        continue;
      }
      const body = (await response.json()) as DohResponse;
      if (body.Status !== 0 || !Array.isArray(body.Answer)) {
        lastError = new Error("DoH status " + body.Status + " from " + endpoint);
        continue;
      }
      const addresses = body.Answer.filter(
        (a) => a.type === 1 && typeof a.data === "string" && a.data.length > 0,
      ).map((a) => a.data);
      if (addresses.length > 0) return addresses;
      lastError = new Error("DoH returned no A records for " + hostname);
    } catch (err) {
      lastError = err;
    }
  }
  throw new Error("DNS resolution failed for " + hostname + ": " + String(lastError));
}

async function resolveHostname(hostname: string): Promise<string[]> {
  const cached = dnsCache.get(hostname);
  if (cached && cached.expiresAt > Date.now()) return cached.addresses;
  const addresses = await resolveViaDoh(hostname);
  dnsCache.set(hostname, { addresses, expiresAt: Date.now() + DNS_CACHE_TTL_MS });
  return addresses;
}

// Structural equivalent of net's module-private LookupFunction type.
type NetLookupCallback = (
  err: NodeJS.ErrnoException | null,
  address: string | LookupAddress[],
  family?: number,
) => void;

// Node 22 enables autoSelectFamily by default, so net may call lookup with
// options.all=true and then expects an array of {address, family} records
// instead of a single (address, family) pair.
function dohLookupImpl(
  hostname: string,
  options: LookupOptions | NetLookupCallback,
  maybeCallback?: NetLookupCallback,
): void {
  const done = (typeof options === "function" ? options : maybeCallback) as NetLookupCallback;
  const wantAll = typeof options === "object" && options !== null && options.all === true;
  resolveHostname(hostname).then(
    (addresses) => {
      if (wantAll) {
        done(null, addresses.map((address) => ({ address, family: 4 })));
      } else {
        done(null, addresses[0], 4);
      }
    },
    (err: unknown) => {
      const error = new Error(String(err)) as NodeJS.ErrnoException & { hostname?: string };
      error.code = "ENOTFOUND";
      error.hostname = hostname;
      done(error, "", 0);
    },
  );
}

export const dohAgent = new Agent({
  connect: { lookup: dohLookupImpl, timeout: 20000 },
  headersTimeout: 20000,
  bodyTimeout: 60000,
});

// The model endpoint can take tens of seconds to emit the first byte of a long
// research brief, far beyond the 20s headers budget that suits the fast data
// collectors. This dedicated agent reuses the same DoH lookup but allows a long
// time-to-first-byte. dohAgent above is left unchanged.
export const dohModelAgent = new Agent({
  connect: { lookup: dohLookupImpl, timeout: 20000 },
  headersTimeout: 120000,
  bodyTimeout: 120000,
});

export interface FetchJsonOptions {
  timeoutMs?: number;
  headers?: Record<string, string>;
}

export async function fetchJson<T>(url: string, options: FetchJsonOptions = {}): Promise<T> {
  const response = await undiciFetch(url, {
    dispatcher: dohAgent,
    headers: {
      "user-agent": DEFAULT_USER_AGENT,
      accept: "application/json",
      ...options.headers,
    },
    signal: AbortSignal.timeout(options.timeoutMs ?? 15000),
  });
  if (!response.ok) {
    throw new Error("HTTP " + response.status + " " + response.statusText + " for " + url);
  }
  return (await response.json()) as T;
}
