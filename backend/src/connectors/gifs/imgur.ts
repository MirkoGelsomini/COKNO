import { Connector, ConnectorResult, safeResult, fetchJsonConnector } from "../types";

const imgur: Connector = {
  name: "Imgur",
  category: "gifs",
  type: "api",

  async search(query, page = 1): Promise<ConnectorResult> {
    const clientId = process.env.IMGUR_CLIENT_ID;
    if (!clientId) return safeResult("Imgur", "IMGUR_CLIENT_ID not set");

    const url = `https://api.imgur.com/3/gallery/search?q=${encodeURIComponent(query)}&sort=viral&window=all&page=${page - 1}`;
    return fetchJsonConnector(
      "Imgur",
      url,
      (data) => {
        const items: any[] = [];
        for (const entry of data.data ?? []) {
          if (entry.nsfw) continue;
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
        return { total: items.length, items };
      },
      { headers: { Authorization: `Client-ID ${clientId}` } }
    );
  },
};

export default imgur;
