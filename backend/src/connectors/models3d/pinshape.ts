import * as cheerio from "cheerio";
import { plainFetchPage } from "../../utils/browser";
import { Connector, ConnectorResult, safeResult } from "../types";

const pinshape: Connector = {
  name: "Pinshape",
  category: "models3d",
  type: "scraping",

  async search(query): Promise<ConnectorResult> {
    try {
      const url = `https://pinshape.com/items?search=${encodeURIComponent(query)}`;
      const html = await plainFetchPage(url);
      const $ = cheerio.load(html);
      const items: any[] = [];

      $("a[href*='/items/']").each((_, el) => {
        const href = $(el).attr("href") ?? "";
        if (!href.match(/\/items\/\d+/)) return;
        const img = $(el).find("img").first();
        const src = img.attr("src") || img.attr("data-src") || "";
        const title = img.attr("alt") || $(el).find("h3, h2, p").first().text().trim();
        if (href && title) {
          items.push({
            id: href,
            title,
            url: href.startsWith("http") ? href : `https://pinshape.com${href}`,
            thumbnailUrl: src || undefined,
            source: "Pinshape",
            category: "models3d",
          });
        }
      });

      const unique = [...new Map(items.map((i) => [i.id, i])).values()];
      return { source: "Pinshape", total: unique.length, items: unique };
    } catch (err) {
      return safeResult("Pinshape", err);
    }
  },
};

export default pinshape;
