import * as cheerio from "cheerio";
import { scrapePage } from "../../utils/browserLimited";
import { Connector, ConnectorResult, safeResult } from "../types";

const turbosquid: Connector = {
  name: "TurboSquid",
  category: "models3d",
  type: "scraping",

  async search(query): Promise<ConnectorResult> {
    try {
      const url = `https://www.turbosquid.com/Search/3D-Models/free/${encodeURIComponent(query)}`;
      const html = await scrapePage(url, ".product-card, a[href*='/3d-models/']");
      const $ = cheerio.load(html);
      const items: any[] = [];

      $("a[href*='/3d-models/']").each((_, el) => {
        const href = $(el).attr("href") ?? "";
        if (!href.match(/\/3d-models\/[^/]+-\d+/)) return;
        const img = $(el).find("img").first();
        const src = img.attr("src") || img.attr("data-src") || "";
        const title = img.attr("alt") || $(el).find("h3, h2, .product-name").first().text().trim();
        if (href && title) {
          items.push({
            id: href,
            title,
            url: href.startsWith("http") ? href : `https://www.turbosquid.com${href}`,
            thumbnailUrl: src || undefined,
            source: "TurboSquid",
            category: "models3d",
          });
        }
      });

      const unique = [...new Map(items.map((i) => [i.id, i])).values()];
      return { source: "TurboSquid", total: unique.length, items: unique };
    } catch (err) {
      return safeResult("TurboSquid", err);
    }
  },
};

export default turbosquid;
