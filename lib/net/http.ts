import { fetch as undiciFetch, type Dispatcher } from "undici";
import { dohAgent } from "./doh";

// Complements doh.ts without modifying it: fetchJson there is GET+JSON only.
// Research providers return XML (RSS) and the model endpoint needs a POST body,
// so both go through the same DoH-backed dispatcher to survive local DNS
// blocking of exchange, crypto and explorer domains.

const DEFAULT_USER_AGENT = "rvue-research/1.0";

export interface FetchTextOptions {
  timeoutMs?: number;
  headers?: Record<string, string>;
}

export interface PostJsonOptions {
  timeoutMs?: number;
  headers?: Record<string, string>;
  body: unknown;
  dispatcher?: Dispatcher;
}

export class HttpError extends Error {
  readonly status: number;
  readonly url: string;
  readonly bodyPreview: string;

  constructor(status: number, url: string, bodyPreview: string) {
    super("HTTP " + status + " for " + url);
    this.name = "HttpError";
    this.status = status;
    this.url = url;
    this.bodyPreview = bodyPreview;
  }
}

async function readPreview(response: { text(): Promise<string> }, limit: number = 400): Promise<string> {
  try {
    const text = await response.text();
    return text.length > limit ? text.slice(0, limit) + "..." : text;
  } catch {
    return "";
  }
}

export async function fetchText(url: string, options: FetchTextOptions = {}): Promise<string> {
  const response = await undiciFetch(url, {
    dispatcher: dohAgent,
    headers: {
      "user-agent": DEFAULT_USER_AGENT,
      accept: "application/rss+xml, application/xml, text/xml, text/html;q=0.8, */*;q=0.5",
      ...options.headers,
    },
    signal: AbortSignal.timeout(options.timeoutMs ?? 12000),
  });
  if (!response.ok) {
    throw new HttpError(response.status, url, await readPreview(response));
  }
  return response.text();
}

export async function fetchJsonLoose<T>(url: string, options: FetchTextOptions = {}): Promise<T> {
  const response = await undiciFetch(url, {
    dispatcher: dohAgent,
    headers: {
      "user-agent": DEFAULT_USER_AGENT,
      accept: "application/json",
      ...options.headers,
    },
    signal: AbortSignal.timeout(options.timeoutMs ?? 12000),
  });
  if (!response.ok) {
    throw new HttpError(response.status, url, await readPreview(response));
  }
  return (await response.json()) as T;
}

export async function postJson<T>(url: string, options: PostJsonOptions): Promise<T> {
  const response = await undiciFetch(url, {
    dispatcher: options.dispatcher ?? dohAgent,
    method: "POST",
    headers: {
      "user-agent": DEFAULT_USER_AGENT,
      accept: "application/json",
      "content-type": "application/json",
      ...options.headers,
    },
    body: JSON.stringify(options.body),
    signal: AbortSignal.timeout(options.timeoutMs ?? 60000),
  });
  if (!response.ok) {
    throw new HttpError(response.status, url, await readPreview(response));
  }
  return (await response.json()) as T;
}
