import { Connector, ConnectorResult, safeResult } from "../types";

const imgur: Connector = {
  name: "Imgur",
  category: "gifs",
  type: "api",

  async search(query, page = 1): Promise<ConnectorResult> {
    const clientId = process.env.IMGUR_CLIENT_ID;
    if (!clientId) return safeResult("Imgur", "IMGUR_CLIENT_ID not set");

    try {
      const url = `https://api.imgur.com/3/gallery/search?q=${encodeURIComponent(query)}&sort=viral&window=all&page=${page - 1}`;
      const res = await fetch(url, {
        headers: { Authorization: `Client-ID ${clientId}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json() as any;
      const items: any[] = [];

      for (const entry of data.data ?? []) {
        if (entry.is_album) {
          const coverGif = (entry.images ?? []).find(
            (img: any) => img.type === "image/gif" || img.link?.endsWith(".gif")
          );
          if (coverGif) {
            items.push({
              id: entry.id,
              title: entry.title || "Imgur GIF",
              url: `https://imgur.com/${entry.id}`,
              thumbnailUrl: coverGif.link,
              author: entry.account_url || undefined,
              source: "Imgur",
              category: "gifs",
            });
          }
        } else if (entry.type === "image/gif" || entry.link?.endsWith(".gif")) {
          items.push({
            id: entry.id,
            title: entry.title || "Imgur GIF",
            url: `https://imgur.com/${entry.id}`,
            thumbnailUrl: entry.link,
            author: entry.account_url || undefined,
            source: "Imgur",
            category: "gifs",
          });
        }
      }

      return { source: "Imgur", total: items.length, items };
    } catch (err) {
      return safeResult("Imgur", err);
    }
  },
};

export default imgur;
