import * as cheerio from "cheerio";
import { scrapePage } from "../../utils/browserLimited";
import { Connector, ConnectorResult, safeResult } from "../types";

const motionelements: Connector = {
  name: "MotionElements",
  category: "gifs",
  type: "scraping",

  async search(query): Promise<ConnectorResult> {
    try {
      const url = `https://www.motionelements.com/free/free-gifs?q=${encodeURIComponent(query)}`;
      const html = await scrapePage(url, "a[href*='/stock-gifs/']");
      const $ = cheerio.load(html);
      const items: any[] = [];

      $("a[href*='/stock-gifs/']").each((_, el) => {
        const href = $(el).attr("href") ?? "";
        const img = $(el).find("img").first();
        const src = img.attr("src") || img.attr("data-src") || "";
        const title = img.attr("alt") || $(el).find("h3, h2, p").first().text().trim();
        if (href && title) {
          items.push({
            id: href,
            title,
            url: href.startsWith("http") ? href : `https://www.motionelements.com${href}`,
            thumbnailUrl: src || undefined,
            source: "MotionElements",
            category: "gifs",
          });
        }
      });

      const unique = [...new Map(items.map((i) => [i.id, i])).values()];
      return { source: "MotionElements", total: unique.length, items: unique };
    } catch (err) {
      return safeResult("MotionElements", err);
    }
  },
};

export default motionelements;
