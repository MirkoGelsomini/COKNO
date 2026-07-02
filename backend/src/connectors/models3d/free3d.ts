import * as cheerio from "cheerio";
import { scrapePage } from "../../utils/browser";
import { Connector, ConnectorResult, safeResult } from "../types";

const free3d: Connector = {
  name: "Free3D",
  category: "models3d",
  type: "scraping",

  async search(query): Promise<ConnectorResult> {
    try {
      const url = `https://free3d.com/3d-models/?s=${encodeURIComponent(query)}`;
      const html = await scrapePage(url, "a[href*='/3d-model/']");
      const $ = cheerio.load(html);
      const items: any[] = [];

      $("a[href*='/3d-model/']").each((_, el) => {
        const href = $(el).attr("href") ?? "";
        const img = $(el).find("img").first();
        const src = img.attr("src") || img.attr("data-src") || "";
        const title = img.attr("alt") || $(el).find("h3, .model-title, p").first().text().trim();
        if (href && title && !href.endsWith("/3d-models/")) {
          items.push({
            id: href,
            title,
            url: href.startsWith("http") ? href : `https://free3d.com${href}`,
            thumbnailUrl: src || undefined,
            source: "Free3D",
            category: "models3d",
          });
        }
      });

      const unique = [...new Map(items.map((i) => [i.id, i])).values()];
      return { source: "Free3D", total: unique.length, items: unique };
    } catch (err) {
      return safeResult("Free3D", err);
    }
  },
};

export default free3d;
