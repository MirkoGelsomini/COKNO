import * as cheerio from "cheerio";
import { scrapePage } from "../../utils/browserLimited";
import { Connector, ConnectorResult, safeResult } from "../types";

const cgtrader: Connector = {
  name: "CGTrader",
  category: "models3d",
  type: "scraping",

  async search(query): Promise<ConnectorResult> {
    try {
      const url = `https://www.cgtrader.com/free-3d-models?keywords=${encodeURIComponent(query)}`;
      const html = await scrapePage(url, "a[href*='/3d-models/']");
      const $ = cheerio.load(html);
      const items: any[] = [];

      $("a[href*='/3d-models/']").each((_, el) => {
        const href = $(el).attr("href") ?? "";
        if (!href.match(/\/3d-models\/[^?#]+$/)) return;
        const img = $(el).find("img").first();
        const src = img.attr("src") || img.attr("data-src") || img.attr("data-lazy") || "";
        const title = img.attr("alt") || $(el).find("h3, h2, .model-title").first().text().trim();
        if (href && title) {
          items.push({
            id: href,
            title,
            url: href.startsWith("http") ? href : `https://www.cgtrader.com${href}`,
            thumbnailUrl: src || undefined,
            source: "CGTrader",
            category: "models3d",
          });
        }
      });

      const unique = [...new Map(items.map((i) => [i.id, i])).values()];
      return { source: "CGTrader", total: unique.length, items: unique };
    } catch (err) {
      return safeResult("CGTrader", err);
    }
  },
};

export default cgtrader;
