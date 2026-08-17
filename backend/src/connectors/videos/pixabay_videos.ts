import { Connector, ConnectorResult, safeResult, fetchJsonConnector } from "../types";

const pixabayVideos: Connector = {
  name: "Pixabay Videos",
  category: "videos",
  type: "api",

  async search(query, page = 1, safe = true): Promise<ConnectorResult> {
    const key = process.env.PIXABAY_API_KEY;
    if (!key) return safeResult("Pixabay Videos", "PIXABAY_API_KEY not set");

    const url = `https://pixabay.com/api/videos/?key=${key}&q=${encodeURIComponent(query)}&per_page=12&page=${page}&safesearch=${safe}`;
    return fetchJsonConnector("Pixabay Videos", url, (data) => ({
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
    }));
  },
};

export default pixabayVideos;
