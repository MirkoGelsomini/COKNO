import * as cheerio from "cheerio";
import { scrapePage } from "../../utils/browserLimited";
import { Connector, ConnectorResult, safeResult } from "../types";

const burst: Connector = {
  name: "Burst",
  category: "images",
  type: "scraping",

  async search(query): Promise<ConnectorResult> {
    try {
      const url = `https://burst.shopify.com/search?q=${encodeURIComponent(query)}`;
      const html = await scrapePage(url, ".photo-card, .grid__item");
      const $ = cheerio.load(html);
      const items: any[] = [];

      $("a[href*='/photos/']").each((_, el) => {
        const href = $(el).attr("href") ?? "";
        const img = $(el).find("img").first();
        const src = img.attr("src") || img.attr("data-src") || img.attr("data-srcset")?.split(" ")[0] || "";
        const title = img.attr("alt") || $(el).find("h3, h2, .photo-card__title").first().text().trim();
        if (href && src) {
          items.push({
            id: href,
            title: title || "Burst photo",
            url: href.startsWith("http") ? href : `https://burst.shopify.com${href}`,
            thumbnailUrl: src.startsWith("http") ? src : `https://burst.shopify.com${src}`,
            source: "Burst",
            category: "images",
          });
        }
      });

      const unique = [...new Map(items.map((i) => [i.id, i])).values()];
      return { source: "Burst", total: unique.length, items: unique };
    } catch (err) {
      return safeResult("Burst", err);
    }
  },
};

export default burst;
