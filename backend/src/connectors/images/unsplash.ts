import { Connector, ConnectorResult, safeResult, fetchJsonConnector } from "../types";

const unsplash: Connector = {
  name: "Unsplash",
  category: "images",
  type: "api",

  async search(query, page = 1): Promise<ConnectorResult> {
    const key = process.env.UNSPLASH_ACCESS_KEY;
    if (!key) return safeResult("Unsplash", "UNSPLASH_ACCESS_KEY not set");

    const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&page=${page}&per_page=12`;
    return fetchJsonConnector(
      "Unsplash",
      url,
      (data) => ({
        total: data.total ?? 0,
        items: (data.results ?? []).map((p: any) => ({
          id: p.id,
          title: p.description ?? p.alt_description ?? "Unsplash photo",
          url: p.links?.html,
          thumbnailUrl: p.urls?.small,
          author: p.user?.name,
          source: "Unsplash",
          category: "images",
          tags: (p.tags ?? []).map((t: any) => t.title),
        })),
      }),
      { headers: { Authorization: `Client-ID ${key}` } }
    );
  },
};

export default unsplash;
