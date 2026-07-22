import * as cheerio from "cheerio";
import { scrapePage } from "../../utils/browserLimited";
import { Connector, ConnectorResult, safeResult } from "../types";

const yobi3d: Connector = {
  name: "Yobi3D",
  category: "models3d",
  type: "scraping",

  async search(query): Promise<ConnectorResult> {
    try {
      const url = `https://www.yobi3d.com/q/${encodeURIComponent(query)}/`;
      const html = await scrapePage(url, ".result-item, a[href*='/f/']");
      const $ = cheerio.load(html);
      const items: any[] = [];

      $("a[href*='/f/']").each((_, el) => {
        const href = $(el).attr("href") ?? "";
        const img = $(el).find("img").first();
        const src = img.attr("src") || img.attr("data-src") || "";
        const title = img.attr("alt") || $(el).find("h3, h2, .title").first().text().trim();
        if (href && title) {
          items.push({
            id: href,
            title,
            url: href.startsWith("http") ? href : `https://www.yobi3d.com${href}`,
            thumbnailUrl: src || undefined,
            source: "Yobi3D",
            category: "models3d",
          });
        }
      });

      const unique = [...new Map(items.map((i) => [i.id, i])).values()];
      return { source: "Yobi3D", total: unique.length, items: unique };
    } catch (err) {
      return safeResult("Yobi3D", err);
    }
  },
};

export default yobi3d;
