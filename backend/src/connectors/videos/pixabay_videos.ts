import { Connector, ConnectorResult, safeResult } from "../types";

const pixabayVideos: Connector = {
  name: "Pixabay Videos",
  category: "videos",
  type: "api",

  async search(query, page = 1): Promise<ConnectorResult> {
    const key = process.env.PIXABAY_API_KEY;
    if (!key) return safeResult("Pixabay Videos", "PIXABAY_API_KEY not set");

    try {
      const url = `https://pixabay.com/api/videos/?key=${key}&q=${encodeURIComponent(query)}&per_page=12&page=${page}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json() as any;
      return {
        source: "Pixabay Videos",
        total: data.totalHits ?? 0,
        items: (data.hits ?? []).map((v: any) => ({
          id: String(v.id),
          title: v.tags || "Pixabay Video",
          url: v.pageURL,
          thumbnailUrl: v.picture_id
            ? `https://i.vimeocdn.com/video/${v.picture_id}_640x360.jpg`
            : undefined,
          author: v.user,
          tags: v.tags?.split(", "),
          source: "Pixabay Videos",
          category: "videos",
        })),
      };
    } catch (err) {
      return safeResult("Pixabay Videos", err);
    }
  },
};

export default pixabayVideos;
