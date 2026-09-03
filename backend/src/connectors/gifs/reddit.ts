import { Connector, ConnectorResult, fetchJsonConnector } from "../types";

const reddit: Connector = {
  name: "Reddit r/gifs",
  category: "gifs",
  type: "api",

  async search(query, page = 1): Promise<ConnectorResult> {
    const url =
      `https://www.reddit.com/r/gifs/search.json` +
      `?q=${encodeURIComponent(query)}&restrict_sr=1&sort=relevance&limit=12&page=${page}`;
    return fetchJsonConnector(
      "Reddit r/gifs",
      url,
      (data) => {
        const children = data?.data?.children ?? [];
        const items = children
          .filter((child: any) => !child.data?.over_18)
          .map((child: any) => {
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
        return { total: items.length, items };
      },
      { headers: { "User-Agent": "Cokno/1.0 (thesis project)" } }
    );
  },
};

export default reddit;
