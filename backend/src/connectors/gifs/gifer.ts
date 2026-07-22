import * as cheerio from "cheerio";
import { scrapePage } from "../../utils/browserLimited";
import { Connector, ConnectorResult, safeResult } from "../types";

const gifer: Connector = {
  name: "Gifer",
  category: "gifs",
  type: "scraping",

  async search(query): Promise<ConnectorResult> {
    try {
      const url = `https://gifer.com/search?q=${encodeURIComponent(query)}`;
      const html = await scrapePage(url, "a[href*='/en/']");
      const $ = cheerio.load(html);
      const items: any[] = [];

      $("a[href*='/en/']").each((_, el) => {
        const href = $(el).attr("href") ?? "";
        const img = $(el).find("img").first();
        const src = img.attr("src") || img.attr("data-src") || "";
        const alt = img.attr("alt") || "";
        // Skip navigation/header links (no image)
        if (href && src && src.includes("gifer")) {
          items.push({
            id: href,
            title: alt || "Gifer GIF",
            url: href.startsWith("http") ? href : `https://gifer.com${href}`,
            thumbnailUrl: src,
            source: "Gifer",
            category: "gifs",
          });
        }
      });

      return { source: "Gifer", total: items.length, items };
    } catch (err) {
      return safeResult("Gifer", err);
    }
  },
};

export default gifer;
