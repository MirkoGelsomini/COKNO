import * as cheerio from "cheerio";
import { plainFetchPage } from "../../utils/browser";
import { Connector, ConnectorResult, safeResult } from "../types";

const coverr: Connector = {
  name: "Coverr",
  category: "videos",
  type: "scraping",

  async search(query): Promise<ConnectorResult> {
    try {
      const url = `https://coverr.co/s?q=${encodeURIComponent(query)}`;
      const html = await plainFetchPage(url);
      const $ = cheerio.load(html);
      const items: any[] = [];

      $("a[href*='/videos/']").each((_, el) => {
        const href = $(el).attr("href") ?? "";
        if (!href || href === "/videos/") return;
        const img = $(el).find("img, video").first();
        const src = img.attr("src") || img.attr("poster") || "";
        const title = img.attr("alt") || $(el).find("h3, p, .title").first().text().trim();
        if (href && title) {
          items.push({
            id: href,
            title,
            url: href.startsWith("http") ? href : `https://coverr.co${href}`,
            thumbnailUrl: src || undefined,
            source: "Coverr",
            category: "videos",
          });
        }
      });

      const unique = [...new Map(items.map((i) => [i.id, i])).values()];
      return { source: "Coverr", total: unique.length, items: unique };
    } catch (err) {
      return safeResult("Coverr", err);
    }
  },
};

export default coverr;
