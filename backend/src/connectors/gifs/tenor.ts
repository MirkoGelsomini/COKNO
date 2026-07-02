import { Connector, ConnectorResult, safeResult } from "../types";

const tenor: Connector = {
  name: "Tenor",
  category: "gifs",
  type: "api",

  async search(query, page = 1): Promise<ConnectorResult> {
    const key = process.env.TENOR_API_KEY;
    if (!key) return safeResult("Tenor", "TENOR_API_KEY not set");

    try {
      const pos = (page - 1) * 12;
      const url = `https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(query)}&key=${key}&limit=12&pos=${pos}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json() as any;
      return {
        source: "Tenor",
        total: 0,
        items: (data.results ?? []).map((g: any) => ({
          id: g.id,
          title: g.content_description || "Tenor GIF",
          url: `https://tenor.com/view/${g.id}`,
          thumbnailUrl: g.media_formats?.tinygif?.url,
          source: "Tenor",
          category: "gifs",
          tags: g.tags ?? [],
        })),
      };
    } catch (err) {
      return safeResult("Tenor", err);
    }
  },
};

export default tenor;
