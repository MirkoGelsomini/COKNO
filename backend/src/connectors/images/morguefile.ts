import * as cheerio from "cheerio";
import { scrapePage } from "../../utils/browser";
import { Connector, ConnectorResult, safeResult } from "../types";

const morguefile: Connector = {
  name: "Morguefile",
  category: "images",
  type: "scraping",

  async search(query): Promise<ConnectorResult> {
    try {
      const url = `https://morguefile.com/search?q=${encodeURIComponent(query)}`;
      const html = await scrapePage(url, ".photo-tile, figure");
      const $ = cheerio.load(html);
      const items: any[] = [];

      $("figure a, a.photo-tile").each((_, el) => {
        const href = $(el).attr("href") ?? "";
        const img = $(el).find("img").first();
        const src = img.attr("src") || img.attr("data-src") || "";
        const alt = img.attr("alt") || "";
        if (href && src && src.startsWith("http")) {
          items.push({
            id: href,
            title: alt || "Morguefile photo",
            url: href.startsWith("http") ? href : `https://morguefile.com${href}`,
            thumbnailUrl: src,
            source: "Morguefile",
            category: "images",
          });
        }
      });

      return { source: "Morguefile", total: items.length, items };
    } catch (err) {
      return safeResult("Morguefile", err);
    }
  },
};

export default morguefile;
