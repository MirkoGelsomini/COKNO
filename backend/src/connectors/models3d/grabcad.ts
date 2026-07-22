import * as cheerio from "cheerio";
import { scrapePage } from "../../utils/browserLimited";
import { Connector, ConnectorResult, safeResult } from "../types";

const grabcad: Connector = {
  name: "GrabCAD",
  category: "models3d",
  type: "scraping",

  async search(query): Promise<ConnectorResult> {
    try {
      const url = `https://grabcad.com/library?search=${encodeURIComponent(query)}&sort=most_downloaded`;
      const html = await scrapePage(url, ".model-card, a[href*='/library/']");
      const $ = cheerio.load(html);
      const items: any[] = [];

      $("a[href*='/library/']").each((_, el) => {
        const href = $(el).attr("href") ?? "";
        if (href === "/library" || href.endsWith("?") || href.includes("?search=")) return;
        const img = $(el).find("img").first();
        const src = img.attr("src") || img.attr("data-src") || "";
        const title = img.attr("alt") || $(el).find("h3, h2, .model-name").first().text().trim();
        if (href && title) {
          items.push({
            id: href,
            title,
            url: href.startsWith("http") ? href : `https://grabcad.com${href}`,
            thumbnailUrl: src || undefined,
            source: "GrabCAD",
            category: "models3d",
          });
        }
      });

      const unique = [...new Map(items.map((i) => [i.id, i])).values()];
      return { source: "GrabCAD", total: unique.length, items: unique };
    } catch (err) {
      return safeResult("GrabCAD", err);
    }
  },
};

export default grabcad;
