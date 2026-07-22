import * as cheerio from "cheerio";
import { scrapePage } from "../../utils/browserLimited";
import { Connector, ConnectorResult, safeResult } from "../types";

const videvo: Connector = {
  name: "Videvo",
  category: "videos",
  type: "scraping",

  async search(query): Promise<ConnectorResult> {
    try {
      const url = `https://www.videvo.net/search/?q=${encodeURIComponent(query)}`;
      const html = await scrapePage(url, "a[href*='/video/']");
      const $ = cheerio.load(html);
      const items: any[] = [];

      $("a[href*='/video/']").each((_, el) => {
        const href = $(el).attr("href") ?? "";
        const img = $(el).find("img").first();
        const src = img.attr("src") || img.attr("data-src") || "";
        const title = img.attr("alt") || $(el).find("h3, h2, p").first().text().trim();
        if (href && title) {
          items.push({
            id: href,
            title,
            url: href.startsWith("http") ? href : `https://www.videvo.net${href}`,
            thumbnailUrl: src || undefined,
            source: "Videvo",
            category: "videos",
          });
        }
      });

      const unique = [...new Map(items.map((i) => [i.id, i])).values()];
      return { source: "Videvo", total: unique.length, items: unique };
    } catch (err) {
      return safeResult("Videvo", err);
    }
  },
};

export default videvo;
