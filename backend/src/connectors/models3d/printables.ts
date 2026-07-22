import * as cheerio from "cheerio";
import { scrapePage } from "../../utils/browserLimited";
import { Connector, ConnectorResult, safeResult } from "../types";

const printables: Connector = {
  name: "Printables",
  category: "models3d",
  type: "scraping",

  async search(query): Promise<ConnectorResult> {
    try {
      const url = `https://www.printables.com/search/models?q=${encodeURIComponent(query)}`;
      const html = await scrapePage(url, "a[href*='/model/']");
      const $ = cheerio.load(html);
      const items: any[] = [];

      $("a[href*='/model/']").each((_, el) => {
        const href = $(el).attr("href") ?? "";
        if (!href.match(/\/model\/\d+/)) return;
        const img = $(el).find("img").first();
        const src = img.attr("src") || img.attr("data-src") || "";
        const title = img.attr("alt") || $(el).find("h3, h2, .model-name").first().text().trim();
        if (href && title) {
          items.push({
            id: href,
            title,
            url: href.startsWith("http") ? href : `https://www.printables.com${href}`,
            thumbnailUrl: src || undefined,
            source: "Printables",
            category: "models3d",
          });
        }
      });

      const unique = [...new Map(items.map((i) => [i.id, i])).values()];
      return { source: "Printables", total: unique.length, items: unique };
    } catch (err) {
      return safeResult("Printables", err);
    }
  },
};

export default printables;
