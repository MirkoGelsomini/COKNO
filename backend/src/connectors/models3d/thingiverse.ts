import { Connector, ConnectorResult, safeResult, fetchJsonConnector } from "../types";

const thingiverse: Connector = {
  name: "Thingiverse",
  category: "models3d",
  type: "api",

  async search(query, page = 1): Promise<ConnectorResult> {
    const token = process.env.THINGIVERSE_TOKEN;
    if (!token) return safeResult("Thingiverse", "THINGIVERSE_TOKEN not set");

    const url = `https://api.thingiverse.com/search/${encodeURIComponent(query)}?per_page=12&page=${page}`;
    return fetchJsonConnector(
      "Thingiverse",
      url,
      (data) => {
        const hits = Array.isArray(data) ? data : (data.hits ?? []);
        return {
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
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );
  },
};

export default thingiverse;
