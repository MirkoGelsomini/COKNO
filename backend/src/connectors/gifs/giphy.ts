import { Connector, ConnectorResult, safeResult } from "../types";

const giphy: Connector = {
  name: "Giphy",
  category: "gifs",
  type: "api",

  async search(query, page = 1): Promise<ConnectorResult> {
    const key = process.env.GIPHY_API_KEY;
    if (!key) return safeResult("Giphy", "GIPHY_API_KEY not set");

    try {
      const offset = (page - 1) * 12;
      const url = `https://api.giphy.com/v1/gifs/search?api_key=${key}&q=${encodeURIComponent(query)}&limit=12&offset=${offset}&rating=g`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json() as any;
      return {
        source: "Giphy",
        total: data.pagination?.total_count ?? 0,
        items: (data.data ?? []).map((g: any) => ({
          id: g.id,
          title: g.title || "Giphy GIF",
          url: g.url,
          thumbnailUrl: g.images?.fixed_height_small?.url,
          author: g.username || undefined,
          source: "Giphy",
          category: "gifs",
        })),
      };
    } catch (err) {
      return safeResult("Giphy", err);
    }
  },
};

export default giphy;
