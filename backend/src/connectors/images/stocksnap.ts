import * as cheerio from "cheerio";
import { scrapePage } from "../../utils/browserLimited";
import { Connector, ConnectorResult, safeResult } from "../types";

const stocksnap: Connector = {
  name: "StockSnap",
  category: "images",
  type: "scraping",

  async search(query): Promise<ConnectorResult> {
    try {
      const url = `https://stocksnap.io/search/${encodeURIComponent(query)}`;
      const html = await scrapePage(url, "a[href*='/photo/']");
      const $ = cheerio.load(html);
      const items: any[] = [];

      $("a[href*='/photo/']").each((_, el) => {
        const href = $(el).attr("href") ?? "";
        const img = $(el).find("img").first();
        const src = img.attr("src") || img.attr("data-src") || img.attr("data-lazy") || "";
        const alt = img.attr("alt") || "";
        if (href && src) {
          items.push({
            id: href,
            title: alt || "StockSnap photo",
            url: href.startsWith("http") ? href : `https://stocksnap.io${href}`,
            thumbnailUrl: src,
            source: "StockSnap",
            category: "images",
          });
        }
      });

      return { source: "StockSnap", total: items.length, items };
    } catch (err) {
      return safeResult("StockSnap", err);
    }
  },
};

export default stocksnap;
