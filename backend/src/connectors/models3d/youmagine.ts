import * as cheerio from "cheerio";
import { plainFetchPage } from "../../utils/browser";
import { Connector, ConnectorResult, safeResult } from "../types";

const youmagine: Connector = {
  name: "YouMagine",
  category: "models3d",
  type: "scraping",

  async search(query): Promise<ConnectorResult> {
    try {
      const url = `https://www.youmagine.com/designs?query=${encodeURIComponent(query)}`;
      const html = await plainFetchPage(url);
      const $ = cheerio.load(html);
      const items: any[] = [];

      $("a[href*='/designs/']").each((_, el) => {
        const href = $(el).attr("href") ?? "";
        if (href === "/designs" || href.includes("?")) return;
        const img = $(el).find("img").first();
        const src = img.attr("src") || img.attr("data-src") || "";
        const title = img.attr("alt") || $(el).find("h3, h2, .design-title").first().text().trim();
        if (href && title) {
          items.push({
            id: href,
            title,
            url: href.startsWith("http") ? href : `https://www.youmagine.com${href}`,
            thumbnailUrl: src || undefined,
            source: "YouMagine",
            category: "models3d",
          });
        }
      });

      const unique = [...new Map(items.map((i) => [i.id, i])).values()];
      return { source: "YouMagine", total: unique.length, items: unique };
    } catch (err) {
      return safeResult("YouMagine", err);
    }
  },
};

export default youmagine;
