import * as cheerio from "cheerio";
import { plainFetchPage } from "../../utils/browser";
import { Connector, ConnectorResult, safeResult } from "../types";

const reactiongifs: Connector = {
  name: "Reaction GIFs",
  category: "gifs",
  type: "scraping",

  async search(query): Promise<ConnectorResult> {
    try {
      const url = `https://reactiongifs.com/?s=${encodeURIComponent(query)}`;
      const html = await plainFetchPage(url);
      const $ = cheerio.load(html);
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

      const unique = [...new Map(items.map((i) => [i.id, i])).values()];
      return { source: "Reaction GIFs", total: unique.length, items: unique };
    } catch (err) {
      return safeResult("Reaction GIFs", err);
    }
  },
};

export default reactiongifs;
