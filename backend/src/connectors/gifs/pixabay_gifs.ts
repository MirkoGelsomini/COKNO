import { Connector, ConnectorResult, safeResult, fetchJsonConnector } from "../types";

const pixabayGifs: Connector = {
  name: "Pixabay GIFs",
  category: "gifs",
  type: "api",

  async search(query, page = 1, safe = true): Promise<ConnectorResult> {
    const key = process.env.PIXABAY_API_KEY;
    if (!key) return safeResult("Pixabay GIFs", "PIXABAY_API_KEY not set");

    const url =
      `https://pixabay.com/api/?key=${key}` +
      `&q=${encodeURIComponent(query)}&image_type=animated&per_page=12&page=${page}&safesearch=${safe}`;
    return fetchJsonConnector("Pixabay GIFs", url, (data) => ({
      total: data.totalHits ?? 0,
      items: (data.hits ?? []).map((img: any) => ({
        id: String(img.id),
        title: img.tags || "Pixabay GIF",
        url: img.pageURL,
        thumbnailUrl: img.webformatURL,
        author: img.user,
        tags: img.tags?.split(", "),
        source: "Pixabay GIFs",
        category: "gifs",
      })),
    }));
  },
};

export default pixabayGifs;
