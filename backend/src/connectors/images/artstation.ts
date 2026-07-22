import { Connector, ConnectorResult, safeResult } from "../types";

const artstation: Connector = {
  name: "ArtStation",
  category: "images",
  type: "api",

  async search(query, page = 1): Promise<ConnectorResult> {
    try {
      const url =
        `https://www.artstation.com/api/v2/search/projects.json` +
        `?query=${encodeURIComponent(query)}&page=${page}&per_page=12`;
      const res = await fetch(url, {
        headers: {
          Accept: "application/json",
          Referer: "https://www.artstation.com/",
        },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json() as any;
      const items = (data.data ?? []).map((p: any) => ({
        id: String(p.id),
        title: p.title || "ArtStation artwork",
        url: p.url ?? `https://www.artstation.com/artwork/${p.hash_id}`,
        thumbnailUrl: p.cover?.thumb_url ?? p.cover?.small_cover_url,
        author: p.user?.full_name || p.user?.username,
        source: "ArtStation",
        category: "images",
      }));

      return { source: "ArtStation", total: data.total_count ?? items.length, items };
    } catch (err) {
      return safeResult("ArtStation", err);
    }
  },
};

export default artstation;
