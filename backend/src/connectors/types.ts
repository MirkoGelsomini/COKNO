import * as cheerio from "cheerio";

export type Category = "images" | "videos" | "gifs" | "models3d" | "texts";

export interface SearchItem {
  id: string;
  title: string;
  url: string;
  thumbnailUrl?: string;
  description?: string;
  author?: string;
  source: string;
  category: Category;
  tags?: string[];
}

export interface ConnectorResult {
  items: SearchItem[];
  total: number;
  source: string;
  error?: string;
}

export interface Connector {
  name: string;
  category: Category;
  type: "api" | "scraping";
  search(query: string, page?: number, safe?: boolean): Promise<ConnectorResult>;
}

export const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

export function safeResult(source: string, err: unknown): ConnectorResult {
  const message = err instanceof Error ? err.message : String(err);
  return { items: [], total: 0, source, error: message };
}

// Every "api"-type connector was hand-writing the same fetch/check/parse/catch shell around
// its own URL and its own JSON-to-SearchItem mapping. This keeps that one-off logic — the
// only part that actually differs per source — inline at the call site, and shares the rest.
export async function fetchJsonConnector(
  source: string,
  url: string,
  extract: (data: any) => { total: number; items: SearchItem[] },
  init?: RequestInit
): Promise<ConnectorResult> {
  try {
    const res = await fetch(url, init);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return { source, ...extract(data) };
  } catch (err) {
    return safeResult(source, err);
  }
}

// Same idea for "scraping"-type connectors: the caller fetches the HTML however it needs to
// (plainFetchPage or the shared-tab-pool scrapePage) and does its own cheerio selectors —
// this only wraps the load/try-catch/result-shape that was identical across every one of them.
export async function scrapeConnector(
  source: string,
  html: Promise<string> | string,
  build: ($: cheerio.CheerioAPI) => SearchItem[]
): Promise<ConnectorResult> {
  try {
    const $ = cheerio.load(await html);
    const items = build($);
    return { source, total: items.length, items };
  } catch (err) {
    return safeResult(source, err);
  }
}

// Bounds a connector call so a slow source can't hold up the whole response
export function withTimeout(
  promise: Promise<ConnectorResult>,
  source: string,
  ms: number
): Promise<ConnectorResult> {
  return new Promise<ConnectorResult>((resolve) => {
    const timer = setTimeout(() => resolve(safeResult(source, `Timeout after ${ms}ms`)), ms);
    promise.then(
      (result) => { clearTimeout(timer); resolve(result); },
      (err) => { clearTimeout(timer); resolve(safeResult(source, err)); }
    );
  });
}
