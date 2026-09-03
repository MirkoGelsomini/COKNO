import { Connector, ConnectorResult, safeResult, fetchJsonConnector } from "../types";

const tenor: Connector = {
  name: "Tenor",
  category: "gifs",
  type: "api",

  async search(query, page = 1, safe = true): Promise<ConnectorResult> {
    const key = process.env.TENOR_API_KEY;
    if (!key) return safeResult("Tenor", "TENOR_API_KEY not set");

    const pos = (page - 1) * 12;
    const url = `https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(query)}&key=${key}&limit=12&pos=${pos}&contentfilter=${safe ? "high" : "off"}`;
    return fetchJsonConnector("Tenor", url, (data) => ({
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
    }));
  },
};

export default tenor;
