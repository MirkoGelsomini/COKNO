import { Connector, ConnectorResult, safeResult } from "../types";

const youtube: Connector = {
  name: "YouTube",
  category: "videos",
  type: "api",

  async search(query, page = 1, safe = true): Promise<ConnectorResult> {
    const key = process.env.YOUTUBE_API_KEY;
    if (!key) return safeResult("YouTube", "YOUTUBE_API_KEY not set");

    try {
      const url =
        `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}` +
        `&maxResults=12&type=video&key=${key}&safeSearch=${safe ? "strict" : "none"}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json() as any;
      return {
        source: "YouTube",
        total: data.pageInfo?.totalResults ?? 0,
        items: (data.items ?? []).map((v: any) => ({
          id: v.id?.videoId ?? v.etag,
          title: v.snippet?.title ?? "YouTube video",
          url: `https://www.youtube.com/watch?v=${v.id?.videoId}`,
          thumbnailUrl: v.snippet?.thumbnails?.medium?.url,
          description: v.snippet?.description,
          author: v.snippet?.channelTitle,
          source: "YouTube",
          category: "videos",
        })),
      };
    } catch (err) {
      return safeResult("YouTube", err);
    }
  },
};

export default youtube;
