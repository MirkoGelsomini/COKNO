import { Connector, ConnectorResult, safeResult } from "../types";

const thingiverse: Connector = {
  name: "Thingiverse",
  category: "models3d",
  type: "api",

  async search(query, page = 1): Promise<ConnectorResult> {
    const token = process.env.THINGIVERSE_TOKEN;
    if (!token) return safeResult("Thingiverse", "THINGIVERSE_TOKEN not set");

    try {
      const url = `https://api.thingiverse.com/search/${encodeURIComponent(query)}?per_page=12&page=${page}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json() as any;
      const hits = Array.isArray(data) ? data : (data.hits ?? []);
      return {
        source: "Thingiverse",
        total: data.total ?? hits.length,
        items: hits.map((m: any) => ({
          id: String(m.id),
          title: m.name ?? "3D Model",
          url: m.public_url ?? `https://www.thingiverse.com/thing:${m.id}`,
          thumbnailUrl: m.thumbnail,
          author: m.creator?.name,
          source: "Thingiverse",
          category: "models3d",
          tags: (m.tags ?? []).map((t: any) => t.name ?? t),
        })),
      };
    } catch (err) {
      return safeResult("Thingiverse", err);
    }
  },
};

export default thingiverse;
