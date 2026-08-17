import { Connector, ConnectorResult, safeResult, fetchJsonConnector } from "../types";

const pixabay: Connector = {
  name: "Pixabay",
  category: "images",
  type: "api",

  async search(query, page = 1, safe = true): Promise<ConnectorResult> {
    const key = process.env.PIXABAY_API_KEY;
    if (!key) return safeResult("Pixabay", "PIXABAY_API_KEY not set");

    const url = `https://pixabay.com/api/?key=${key}&q=${encodeURIComponent(query)}&image_type=photo&per_page=12&page=${page}&safesearch=${safe}`;
    return fetchJsonConnector("Pixabay", url, (data) => ({
      total: data.totalHits ?? 0,
      items: (data.hits ?? []).map((h: any) => ({
        id: String(h.id),
        title: h.tags || "Pixabay photo",
        url: h.pageURL,
        thumbnailUrl: h.previewURL,
        author: h.user,
        source: "Pixabay",
        category: "images",
        tags: h.tags?.split(", ") ?? [],
      })),
    }));
  },
};

export default pixabay;
