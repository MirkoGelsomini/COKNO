import { Connector, ConnectorResult, safeResult } from "../types";

const smithsonian: Connector = {
  name: "Smithsonian",
  category: "images",
  type: "api",

  async search(query, page = 1): Promise<ConnectorResult> {
    const key = process.env.SMITHSONIAN_API_KEY;
    if (!key) return safeResult("Smithsonian", "SMITHSONIAN_API_KEY not set");

    try {
      const start = (page - 1) * 12;
      const url =
        `https://api.si.edu/openaccess/api/v1.0/search` +
        `?api_key=${key}&q=${encodeURIComponent(query)}&rows=12&start=${start}&online_media_type=Images`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json() as any;
      const rows = data.response?.rows ?? [];

      const items = rows
        .map((row: any) => {
          const dnr = row.content?.descriptiveNonRepeating;
          const media = dnr?.online_media?.media?.[0];
          if (!media?.thumbnail) return null;
          return {
            id: row.id,
            title: row.title || "Smithsonian item",
            url: dnr?.record_link ?? `https://collections.si.edu/search/results.htm?q=${row.id}`,
            thumbnailUrl: media.thumbnail,
            source: "Smithsonian",
            category: "images",
          };
        })
        .filter(Boolean);

      return { source: "Smithsonian", total: data.response?.rowCount ?? items.length, items };
    } catch (err) {
      return safeResult("Smithsonian", err);
    }
  },
};

export default smithsonian;
