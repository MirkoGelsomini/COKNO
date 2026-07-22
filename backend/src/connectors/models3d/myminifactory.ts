import * as cheerio from "cheerio";
import { scrapePage } from "../../utils/browserLimited";
import { Connector, ConnectorResult, safeResult } from "../types";

const myminifactory: Connector = {
  name: "MyMiniFactory",
  category: "models3d",
  type: "scraping",

  async search(query): Promise<ConnectorResult> {
    try {
      const url = `https://www.myminifactory.com/search/?search=${encodeURIComponent(query)}`;
      const html = await scrapePage(url, ".object-card, a[href*='/object/']");
      const $ = cheerio.load(html);
      const items: any[] = [];

      $("a[href*='/object/']").each((_, el) => {
        const href = $(el).attr("href") ?? "";
        if (!href.includes("/object/")) return;
        const img = $(el).find("img").first();
        const src = img.attr("src") || img.attr("data-src") || img.attr("data-lazy-src") || "";
        const title = img.attr("alt") || $(el).find("h3, h2, .object-name").first().text().trim();
        if (href && title) {
          items.push({
            id: href,
            title,
            url: href.startsWith("http") ? href : `https://www.myminifactory.com${href}`,
            thumbnailUrl: src || undefined,
            source: "MyMiniFactory",
            category: "models3d",
          });
        }
      });

      const unique = [...new Map(items.map((i) => [i.id, i])).values()];
      return { source: "MyMiniFactory", total: unique.length, items: unique };
    } catch (err) {
      return safeResult("MyMiniFactory", err);
    }
  },
};

export default myminifactory;
