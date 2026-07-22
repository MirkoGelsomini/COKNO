import * as cheerio from "cheerio";
import { plainFetchPage } from "../../utils/browser";
import { Connector, ConnectorResult, safeResult } from "../types";

const coursera: Connector = {
  name: "Coursera",
  category: "videos",
  type: "scraping",

  async search(query): Promise<ConnectorResult> {
    try {
      const url = `https://www.coursera.org/search?query=${encodeURIComponent(query)}`;
      const html = await plainFetchPage(url);
      const $ = cheerio.load(html);
      const items: any[] = [];

      $("a[href*='/learn/']").each((_, el) => {
        const href = $(el).attr("href") ?? "";
        if (!href.includes("/learn/")) return;
        const img = $(el).find("img").first();
        const src = img.attr("src") || img.attr("data-src") || "";
        const title = img.attr("alt") || $(el).find("h2, h3, [class*='title']").first().text().trim();
        if (href && title) {
          items.push({
            id: href,
            title,
            url: href.startsWith("http") ? href : `https://www.coursera.org${href}`,
            thumbnailUrl: src || undefined,
            source: "Coursera",
            category: "videos",
          });
        }
      });

      const unique = [...new Map(items.map((i) => [i.id, i])).values()];
      return { source: "Coursera", total: unique.length, items: unique };
    } catch (err) {
      return safeResult("Coursera", err);
    }
  },
};

export default coursera;
