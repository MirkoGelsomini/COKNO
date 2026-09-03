import { plainFetchPage } from "../../utils/browser";
import { Connector, ConnectorResult, scrapeConnector } from "../types";

const reactiongifs: Connector = {
  name: "Reaction GIFs",
  category: "gifs",
  type: "scraping",

  async search(query): Promise<ConnectorResult> {
    const url = `https://reactiongifs.com/?s=${encodeURIComponent(query)}`;
    return scrapeConnector("Reaction GIFs", plainFetchPage(url), ($) => {
      const items: any[] = [];
      $("img[src*='.gif']").each((_, el) => {
        const src = $(el).attr("src") ?? "";
        const alt = $(el).attr("alt") || "";
        const link = $(el).closest("a");
        const href = link.attr("href") || src;
        if (src && src.includes(".gif")) {
          items.push({
            id: src,
            title: alt || "Reaction GIF",
            url: href,
            thumbnailUrl: src,
            source: "Reaction GIFs",
            category: "gifs",
          });
        }
      });
      return [...new Map(items.map((i) => [i.id, i])).values()];
    });
  },
};

export default reactiongifs;
