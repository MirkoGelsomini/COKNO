import { Connector, ConnectorResult, safeResult } from "../types";

const reddit: Connector = {
  name: "Reddit r/gifs",
  category: "gifs",
  type: "api",

  async search(query, page = 1): Promise<ConnectorResult> {
    try {
      const url =
        `https://www.reddit.com/r/gifs/search.json` +
        `?q=${encodeURIComponent(query)}&restrict_sr=1&sort=relevance&limit=12&page=${page}`;
      const res = await fetch(url, {
        headers: { "User-Agent": "Cokno/1.0 (thesis project)" },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json() as any;
      const children = data?.data?.children ?? [];

      const items = children.map((child: any) => {
        const post = child.data;
        const thumbnail =
          post.preview?.images?.[0]?.source?.url?.replace(/&amp;/g, "&") ||
          (post.thumbnail?.startsWith("http") ? post.thumbnail : undefined);
        return {
          id: post.id,
          title: post.title || "Reddit GIF",
          url: `https://www.reddit.com${post.permalink}`,
          thumbnailUrl: thumbnail,
          author: post.author,
          source: "Reddit r/gifs",
          category: "gifs",
        };
      });

      return { source: "Reddit r/gifs", total: items.length, items };
    } catch (err) {
      return safeResult("Reddit r/gifs", err);
    }
  },
};

export default reddit;
