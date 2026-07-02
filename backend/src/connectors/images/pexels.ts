import { Connector, ConnectorResult, safeResult } from "../types";

const pexels: Connector = {
  name: "Pexels",
  category: "images",
  type: "api",

  async search(query, page = 1): Promise<ConnectorResult> {
    const key = process.env.PEXELS_API_KEY;
    if (!key) return safeResult("Pexels", "PEXELS_API_KEY not set");

    try {
      const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=12&page=${page}`;
      const res = await fetch(url, { headers: { Authorization: key } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json() as any;
      return {
        source: "Pexels",
        total: data.total_results ?? 0,
        items: (data.photos ?? []).map((p: any) => ({
          id: String(p.id),
          title: p.alt || "Pexels photo",
          url: p.url,
          thumbnailUrl: p.src?.medium,
          author: p.photographer,
          source: "Pexels",
          category: "images",
        })),
      };
    } catch (err) {
      return safeResult("Pexels", err);
    }
  },
};

export default pexels;
