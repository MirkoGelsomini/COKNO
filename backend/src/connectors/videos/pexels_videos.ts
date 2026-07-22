import { Connector, ConnectorResult, safeResult } from "../types";

const pexelsVideos: Connector = {
  name: "Pexels Videos",
  category: "videos",
  type: "api",

  async search(query, page = 1): Promise<ConnectorResult> {
    const key = process.env.PEXELS_API_KEY;
    if (!key) return safeResult("Pexels Videos", "PEXELS_API_KEY not set");

    try {
      const url = `https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&per_page=12&page=${page}`;
      const res = await fetch(url, { headers: { Authorization: key } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json() as any;
      return {
        source: "Pexels Videos",
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
      };
    } catch (err) {
      return safeResult("Pexels Videos", err);
    }
  },
};

export default pexelsVideos;
