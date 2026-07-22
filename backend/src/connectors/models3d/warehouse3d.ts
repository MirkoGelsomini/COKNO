import * as cheerio from "cheerio";
import { scrapePage } from "../../utils/browserLimited";
import { Connector, ConnectorResult, safeResult } from "../types";

const warehouse3d: Connector = {
  name: "3D Warehouse",
  category: "models3d",
  type: "scraping",

  async search(query): Promise<ConnectorResult> {
    try {
      const url = `https://3dwarehouse.sketchup.com/search/?q=${encodeURIComponent(query)}`;
      const html = await scrapePage(url, "a[href*='/model/']");
      const $ = cheerio.load(html);
      const items: any[] = [];

      $("a[href*='/model/']").each((_, el) => {
        const href = $(el).attr("href") ?? "";
        if (!href.includes("/model/")) return;
        const img = $(el).find("img").first();
        const src = img.attr("src") || img.attr("data-src") || "";
        const title = img.attr("alt") || $(el).find("h3, h2, .model-name").first().text().trim();
        if (href && title) {
          items.push({
            id: href,
            title,
            url: href.startsWith("http") ? href : `https://3dwarehouse.sketchup.com${href}`,
            thumbnailUrl: src || undefined,
            source: "3D Warehouse",
            category: "models3d",
          });
        }
      });

      const unique = [...new Map(items.map((i) => [i.id, i])).values()];
      return { source: "3D Warehouse", total: unique.length, items: unique };
    } catch (err) {
      return safeResult("3D Warehouse", err);
    }
  },
};

export default warehouse3d;
