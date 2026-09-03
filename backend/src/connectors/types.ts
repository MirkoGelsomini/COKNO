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

const HTML_ENTITIES: Record<string, string> = {
  "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#039;": "'", "&nbsp;": " ",
  "&ndash;": "–", "&mdash;": "—", "&hellip;": "…",
};

// Strips HTML tags from a MediaWiki search snippet and decodes the entities it leaves
// behind (e.g. "Newton&#039;s" -> "Newton's") — plain .replace(/<[^>]+>/g, "") alone
// leaves those entities as literal text once re-escaped for display.
export function stripHtml(html: string | undefined): string | undefined {
  if (!html) return html;
  return html
    .replace(/<[^>]+>/g, "")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&\w+;/g, (entity) => HTML_ENTITIES[entity] ?? entity);
}

// Shared fetch/parse/catch shell for "api"-type connectors — only the URL and the
// JSON-to-SearchItem mapping differ per source.
export async function fetchJsonConnector(
  source: string,
  url: string,
  extract: (data: any) => { total: number; items: SearchItem[] },
  init?: RequestInit
): Promise<ConnectorResult> {
  try {
    const res = await fetch(url, init);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    // A 200 with a non-JSON body usually means an IP block, rate limit, or bad key —
    // caught here so it reads as that instead of a cryptic JSON parse error.
    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("json")) {
      throw new Error(`Non-JSON response (${contentType || "unknown content type"}) — likely blocked, rate-limited, or an invalid key`);
    }
    const data = await res.json();
    return { source, ...extract(data) };
  } catch (err) {
    return safeResult(source, err);
  }
}

// Same idea for "scraping"-type connectors: caller fetches HTML and picks its own cheerio
// selectors, this only wraps the shared load/try-catch/result-shape.
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
