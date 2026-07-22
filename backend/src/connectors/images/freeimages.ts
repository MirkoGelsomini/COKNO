import * as cheerio from "cheerio";
import { scrapePage } from "../../utils/browserLimited";
import { Connector, ConnectorResult, safeResult } from "../types";

const freeimages: Connector = {
  name: "FreeImages",
  category: "images",
  type: "scraping",

  async search(query): Promise<ConnectorResult> {
    try {
      const url = `https://www.freeimages.com/search/${encodeURIComponent(query)}`;
      const html = await scrapePage(url, "a[href*='/photo/']");
      const $ = cheerio.load(html);
      const items: any[] = [];

      $("a[href*='/photo/']").each((_, el) => {
        const href = $(el).attr("href") ?? "";
        const img = $(el).find("img").first();
        const src = img.attr("src") || img.attr("data-src") || "";
        const title = img.attr("alt") || $(el).find("h3, p").first().text().trim();
        if (href && src && src.startsWith("http")) {
          items.push({
            id: href,
            title: title || "FreeImages photo",
            url: href.startsWith("http") ? href : `https://www.freeimages.com${href}`,
            thumbnailUrl: src,
            source: "FreeImages",
            category: "images",
          });
        }
      });

      const unique = [...new Map(items.map((i) => [i.id, i])).values()];
      return { source: "FreeImages", total: unique.length, items: unique };
    } catch (err) {
      return safeResult("FreeImages", err);
    }
  },
};

export default freeimages;
