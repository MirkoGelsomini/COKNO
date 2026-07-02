import * as cheerio from "cheerio";
import { scrapePage } from "../../utils/browser";
import { Connector, ConnectorResult, safeResult } from "../types";

const mixkit: Connector = {
  name: "Mixkit",
  category: "videos",
  type: "scraping",

  async search(query): Promise<ConnectorResult> {
    try {
      const url = `https://mixkit.co/search/${encodeURIComponent(query)}/`;
      const html = await scrapePage(url, "article, .item-card");
      const $ = cheerio.load(html);
      const items: any[] = [];

      $("article a[href], .item-card a[href]").each((_, el) => {
        const href = $(el).attr("href") ?? "";
        if (!href || href === "/" || href === "#") return;
        const img = $(el).find("img").first();
        const src = img.attr("src") || img.attr("data-src") || "";
        const title = img.attr("alt") || $(el).find("h2, h3, .title").first().text().trim();
        if (href && title) {
          items.push({
            id: href,
            title,
            url: href.startsWith("http") ? href : `https://mixkit.co${href}`,
            thumbnailUrl: src || undefined,
            source: "Mixkit",
            category: "videos",
          });
        }
      });

      const unique = [...new Map(items.map((i) => [i.id, i])).values()];
      return { source: "Mixkit", total: unique.length, items: unique };
    } catch (err) {
      return safeResult("Mixkit", err);
    }
  },
};

export default mixkit;
