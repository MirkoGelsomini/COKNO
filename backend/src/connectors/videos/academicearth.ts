import * as cheerio from "cheerio";
import { scrapePage } from "../../utils/browserLimited";
import { Connector, ConnectorResult, safeResult } from "../types";

const academicearth: Connector = {
  name: "Academic Earth",
  category: "videos",
  type: "scraping",

  async search(query): Promise<ConnectorResult> {
    try {
      const url = `https://academicearth.org/search/?q=${encodeURIComponent(query)}`;
      const html = await scrapePage(url, "a[href*='/lectures/'], a[href*='/courses/']");
      const $ = cheerio.load(html);
      const items: any[] = [];

      $("a[href*='/lectures/'], a[href*='/courses/']").each((_, el) => {
        const href = $(el).attr("href") ?? "";
        const img = $(el).find("img").first();
        const src = img.attr("src") || img.attr("data-src") || "";
        const title = img.attr("alt") || $(el).find("h3, h2, .title").first().text().trim();
        if (href && title) {
          items.push({
            id: href,
            title,
            url: href.startsWith("http") ? href : `https://academicearth.org${href}`,
            thumbnailUrl: src || undefined,
            source: "Academic Earth",
            category: "videos",
          });
        }
      });

      const unique = [...new Map(items.map((i) => [i.id, i])).values()];
      return { source: "Academic Earth", total: unique.length, items: unique };
    } catch (err) {
      return safeResult("Academic Earth", err);
    }
  },
};

export default academicearth;
