import { fetchText } from "../net/http";
import type { DataStatus, NewsItem, NewsSnapshot } from "../evidence/types";

// Tier-2 external intelligence: recent news for the underlying equity and for
// the rToken itself. Keyless public RSS providers only, so the pipeline has no
// credential dependency. Every provider failure is recorded rather than
// swallowed, because "could not search" and "searched, found nothing" are
// different findings and the brief must be able to tell them apart.

const DEFAULT_WINDOW_HOURS = 48;
const DEFAULT_MAX_ITEMS = 24;
const PROVIDER_TIMEOUT_MS = 10000;

export interface RawFeedItem {
  title: string;
  url: string;
  publishedAt: number;
  source: string;
  provider: string;
  query: string;
  relevance: "UNDERLYING" | "RTOKEN";
}

export interface FeedProvider {
  name: string;
  buildUrl(query: string): string;
  parse(xml: string): Array<{ title: string; url: string; publishedAt: number; source: string }>;
}

function decodeEntities(input: string): string {
  return input
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&#(\d+);/g, (_, digits: string) => String.fromCodePoint(Number.parseInt(digits, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex: string) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");
}

function stripTags(input: string): string {
  return input.replace(/<[^>]*>/g, " ");
}

function normalizeWhitespace(input: string): string {
  return input.replace(/\s+/g, " ").trim();
}

// Minimal RSS 2.0 / Atom-ish tag reader. Deliberately narrow: we only need
// title, link, pubDate and source, and a full XML parser is not worth a
// dependency for a hackathon pipeline.
function readTag(block: string, tag: string): string {
  const match = block.match(new RegExp("<" + tag + "(?:\\s[^>]*)?>([\\s\\S]*?)</" + tag + ">", "i"));
  if (!match) return "";
  return normalizeWhitespace(decodeEntities(stripTags(match[1])));
}

function readTagRaw(block: string, tag: string): string {
  const match = block.match(new RegExp("<" + tag + "(?:\\s[^>]*)?>([\\s\\S]*?)</" + tag + ">", "i"));
  if (!match) return "";
  return normalizeWhitespace(decodeEntities(match[1]));
}

function itemBlocks(xml: string): string[] {
  const blocks: string[] = [];
  const pattern = /<item[\s>][\s\S]*?<\/item>|<item\/>/gi;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(xml)) !== null) blocks.push(match[0]);
  if (blocks.length > 0) return blocks;
  const entryPattern = /<entry[\s>][\s\S]*?<\/entry>/gi;
  while ((match = entryPattern.exec(xml)) !== null) blocks.push(match[0]);
  return blocks;
}

function parseLink(block: string): string {
  const explicit = readTagRaw(block, "link");
  if (explicit && !explicit.startsWith("<")) return explicit;
  const href = block.match(/<link[^>]*href="([^"]+)"/i);
  return href ? decodeEntities(href[1]) : "";
}

function parseDate(block: string): number {
  const candidates = [readTagRaw(block, "pubDate"), readTagRaw(block, "published"), readTagRaw(block, "updated"), readTagRaw(block, "dc:date")];
  for (const candidate of candidates) {
    if (!candidate) continue;
    const parsed = Date.parse(candidate);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

function parseRss(xml: string): Array<{ title: string; url: string; publishedAt: number; source: string }> {
  const out: Array<{ title: string; url: string; publishedAt: number; source: string }> = [];
  for (const block of itemBlocks(xml)) {
    const title = readTag(block, "title");
    if (!title) continue;
    const url = parseLink(block);
    const publishedAt = parseDate(block);
    if (!Number.isFinite(publishedAt) || publishedAt <= 0) continue;
    let source = readTag(block, "source");
    if (!source) {
      const separator = title.lastIndexOf(" - ");
      source = separator > 0 ? title.slice(separator + 3).trim() : "";
    }
    out.push({ title, url, publishedAt, source });
  }
  return out;
}

// Google News supports a relative time operator, which gives a second,
// independent filter on top of our own 48h window.
export const googleNewsProvider: FeedProvider = {
  name: "google-news-rss",
  buildUrl(query: string) {
    return "https://news.google.com/rss/search?q=" + encodeURIComponent(query) + "&hl=en-US&gl=US&ceid=US:en";
  },
  parse: parseRss,
};

export const yahooFinanceProvider: FeedProvider = {
  name: "yahoo-finance-rss",
  buildUrl(query: string) {
    return "https://feeds.finance.yahoo.com/rss/2.0/headline?s=" + encodeURIComponent(query) + "&region=US&lang=en-US";
  },
  parse: parseRss,
};

export const PROVIDERS: FeedProvider[] = [googleNewsProvider, yahooFinanceProvider];

export interface NewsQuery {
  query: string;
  relevance: "UNDERLYING" | "RTOKEN";
  providers: FeedProvider[];
}

// The rToken symbol is noise-prone as a bare search term ("rTSLA" matches
// almost nothing outside crypto press), so it is searched with the product
// context attached. The underlying is searched as a stock, with a time bound.
export function buildNewsQueries(rToken: string, underlyingTicker: string): NewsQuery[] {
  return [
    {
      query: '"' + underlyingTicker + '" stock when:2d',
      relevance: "UNDERLYING",
      providers: [googleNewsProvider],
    },
    {
      query: underlyingTicker,
      relevance: "UNDERLYING",
      providers: [yahooFinanceProvider],
    },
    {
      query: rToken + " tokenized stock Bitget when:2d",
      relevance: "RTOKEN",
      providers: [googleNewsProvider],
    },
  ];
}

function dedupeKey(item: RawFeedItem): string {
  const title = item.title.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  return title.length > 0 ? title : item.url;
}

export interface CollectNewsOptions {
  rToken: string;
  underlyingTicker: string;
  windowHours?: number;
  maxItems?: number;
  enabled?: boolean;
  now?: number;
}

export async function collectNews(options: CollectNewsOptions): Promise<NewsSnapshot> {
  const windowHours = options.windowHours ?? DEFAULT_WINDOW_HOURS;
  const maxItems = options.maxItems ?? DEFAULT_MAX_ITEMS;
  const now = options.now ?? Date.now();
  const cutoff = now - windowHours * 3600 * 1000;
  const queries = buildNewsQueries(options.rToken, options.underlyingTicker);

  if (options.enabled === false) {
    return {
      status: "PENDING",
      windowHours,
      items: [],
      queries: queries.map((q) => q.query),
      providersFailed: [],
      fetchedAt: null,
    };
  }

  const collected: RawFeedItem[] = [];
  const providersFailed: Array<{ provider: string; reason: string }> = [];
  let anyProviderSucceeded = false;

  const tasks = queries.flatMap((entry) =>
    entry.providers.map(async (provider) => {
      try {
        const xml = await fetchText(provider.buildUrl(entry.query), { timeoutMs: PROVIDER_TIMEOUT_MS });
        const parsed = provider.parse(xml);
        anyProviderSucceeded = true;
        for (const item of parsed) {
          collected.push({
            title: item.title,
            url: item.url,
            publishedAt: item.publishedAt,
            source: item.source || provider.name,
            provider: provider.name,
            query: entry.query,
            relevance: entry.relevance,
          });
        }
      } catch (err) {
        providersFailed.push({ provider: provider.name, reason: String(err instanceof Error ? err.message : err).slice(0, 200) });
      }
    }),
  );
  await Promise.all(tasks);

  const seen = new Set<string>();
  const inWindow = collected
    .filter((item) => item.publishedAt >= cutoff && item.publishedAt <= now + 60_000)
    .sort((a, b) => b.publishedAt - a.publishedAt)
    .filter((item) => {
      const key = dedupeKey(item);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, maxItems);

  const items: NewsItem[] = inWindow.map((item, index) => ({
    id: "news." + String(index + 1).padStart(2, "0"),
    title: item.title,
    url: item.url,
    source: item.source,
    provider: item.provider,
    publishedAt: item.publishedAt,
    query: item.query,
    relevance: item.relevance,
  }));

  const status: DataStatus = anyProviderSucceeded ? "OK" : "UNAVAILABLE";
  return {
    status,
    windowHours,
    items,
    queries: queries.map((q) => q.query),
    providersFailed,
    fetchedAt: now,
  };
}
