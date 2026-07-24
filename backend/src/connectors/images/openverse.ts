import { Connector, ConnectorResult, safeResult } from "../types";

const openverse: Connector = {
  name: "Openverse",
  category: "images",
  type: "api",

  async search(query, page = 1): Promise<ConnectorResult> {
    try {
      const url = `https://api.openverse.org/v1/images/?q=${encodeURIComponent(query)}&page_size=12&page=${page}`;
      const res = await fetch(url, {
        headers: { "User-Agent": "Cokno/1.0" },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json() as any;
      return {
        source: "Openverse",
        total: data.result_count ?? 0,
        items: (data.results ?? []).map((r: any) => ({
          id: r.id,
          title: r.title || "Openverse image",
          url: r.foreign_landing_url || r.url,
          thumbnailUrl: r.thumbnail,
          author: r.creator,
          source: "Openverse",
          category: "images",
          tags: (r.tags ?? []).map((t: any) => t.name ?? t),
        })),
      };
    } catch (err) {
      return safeResult("Openverse", err);
    }
  },
};

export default openverse;
