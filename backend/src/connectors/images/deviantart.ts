import * as cheerio from "cheerio";
import { plainFetchPage } from "../../utils/browser";
import { Connector, ConnectorResult, safeResult } from "../types";

const deviantart: Connector = {
  name: "DeviantArt",
  category: "images",
  type: "scraping",

  async search(query): Promise<ConnectorResult> {
    try {
      const url = `https://www.deviantart.com/search?q=${encodeURIComponent(query)}`;
      const html = await plainFetchPage(url);
      const $ = cheerio.load(html);
      const items: any[] = [];

      $("a[href*='deviantart.com'][href*='/art/']").each((_, el) => {
        const href = $(el).attr("href") ?? "";
        const img = $(el).find("img").first();
        const src = img.attr("src") || img.attr("data-src") || "";
        const title = img.attr("alt") || $(el).attr("title") || "";
        if (href && src && src.startsWith("http")) {
          items.push({
            id: href,
            title: title || "DeviantArt artwork",
            url: href,
            thumbnailUrl: src,
            source: "DeviantArt",
            category: "images",
          });
        }
      });

      const unique = [...new Map(items.map((i) => [i.id, i])).values()];
      return { source: "DeviantArt", total: unique.length, items: unique };
    } catch (err) {
      return safeResult("DeviantArt", err);
    }
  },
};

export default deviantart;
