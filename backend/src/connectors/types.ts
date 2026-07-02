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
