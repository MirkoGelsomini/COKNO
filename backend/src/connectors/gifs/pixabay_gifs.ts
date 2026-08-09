import { Connector, ConnectorResult, safeResult } from "../types";

const pixabayGifs: Connector = {
  name: "Pixabay GIFs",
  category: "gifs",
  type: "api",

  async search(query, page = 1, safe = true): Promise<ConnectorResult> {
    const key = process.env.PIXABAY_API_KEY;
    if (!key) return safeResult("Pixabay GIFs", "PIXABAY_API_KEY not set");

    try {
      const url =
        `https://pixabay.com/api/?key=${key}` +
        `&q=${encodeURIComponent(query)}&image_type=animated&per_page=12&page=${page}&safesearch=${safe}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json() as any;
      return {
        source: "Pixabay GIFs",
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
      };
    } catch (err) {
      return safeResult("Pixabay GIFs", err);
    }
  },
};

export default pixabayGifs;
