import * as cheerio from "cheerio";
import { scrapePage } from "../../utils/browser";
import { Connector, ConnectorResult, safeResult } from "../types";

const etymonline: Connector = {
  name: "Etymonline",
  category: "texts",
  type: "scraping",

  async search(query): Promise<ConnectorResult> {
    try {
      const url = `https://www.etymonline.com/search?q=${encodeURIComponent(query)}`;
      const html = await scrapePage(url, "a[href*='/word/']");
      const $ = cheerio.load(html);
      const items: any[] = [];

      $("section, article, [class*='word']").each((_, el) => {
        const link = $(el).find("a[href*='/word/']").first();
        const href = link.attr("href") ?? "";
        const title = link.find("[class*='name'], strong, h3").first().text().trim() || link.text().trim();
        const description = $(el).find("p, [class*='def']").first().text().trim();
        if (href && title && title.length < 80) {
          items.push({
            id: href,
            title,
            url: href.startsWith("http") ? href : `https://www.etymonline.com${href}`,
            description: description || undefined,
            source: "Etymonline",
            category: "texts",
          });
        }
      });

      const unique = [...new Map(items.map((i) => [i.id, i])).values()];
      return { source: "Etymonline", total: unique.length, items: unique.slice(0, 12) };
    } catch (err) {
      return safeResult("Etymonline", err);
    }
  },
};

export default etymonline;
