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
  search(query: string, page?: number): Promise<ConnectorResult>;
}

export const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

export function safeResult(source: string, err: unknown): ConnectorResult {
  const message = err instanceof Error ? err.message : String(err);
  return { items: [], total: 0, source, error: message };
}

// Bounds a connector call so one slow/dead source can't hold up the whole
// aggregated search response — the underlying call keeps running in the
// background, but we stop waiting for it after `ms`.
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
