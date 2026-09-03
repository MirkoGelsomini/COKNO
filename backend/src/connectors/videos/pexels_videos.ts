import { Connector, ConnectorResult, safeResult, fetchJsonConnector } from "../types";

const pexelsVideos: Connector = {
  name: "Pexels Videos",
  category: "videos",
  type: "api",

  async search(query, page = 1): Promise<ConnectorResult> {
    const key = process.env.PEXELS_API_KEY;
    if (!key) return safeResult("Pexels Videos", "PEXELS_API_KEY not set");

    const url = `https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&per_page=12&page=${page}`;
    return fetchJsonConnector(
      "Pexels Videos",
      url,
      (data) => ({
        total: data.total_results ?? 0,
        items: (data.videos ?? []).map((v: any) => ({
          id: String(v.id),
          title: v.url?.split("/").filter(Boolean).pop()?.replace(/-/g, " ") ?? "Pexels Video",
          url: v.url,
          thumbnailUrl: v.image,
          author: v.user?.name,
          source: "Pexels Videos",
          category: "videos",
        })),
      }),
      { headers: { Authorization: key } }
    );
  },
};

export default pexelsVideos;
