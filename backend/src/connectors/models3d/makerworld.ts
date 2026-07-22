import * as cheerio from "cheerio";
import { scrapePage } from "../../utils/browserLimited";
import { Connector, ConnectorResult, safeResult } from "../types";

const makerworld: Connector = {
  name: "MakerWorld",
  category: "models3d",
  type: "scraping",

  async search(query): Promise<ConnectorResult> {
    try {
      const url = `https://makerworld.com/en/search?keyword=${encodeURIComponent(query)}`;
      const html = await scrapePage(url, "a[href*='/models/']");
      const $ = cheerio.load(html);
      const items: any[] = [];

      $("a[href*='/models/']").each((_, el) => {
        const href = $(el).attr("href") ?? "";
        if (href === "/en/models" || !href.match(/\/models\/\d+/)) return;
        const img = $(el).find("img").first();
        const src = img.attr("src") || img.attr("data-src") || "";
        const title = img.attr("alt") || $(el).find("h3, h2, p").first().text().trim();
        if (href && title) {
          items.push({
            id: href,
            title,
            url: href.startsWith("http") ? href : `https://makerworld.com${href}`,
            thumbnailUrl: src || undefined,
            source: "MakerWorld",
            category: "models3d",
          });
        }
      });

      const unique = [...new Map(items.map((i) => [i.id, i])).values()];
      return { source: "MakerWorld", total: unique.length, items: unique };
    } catch (err) {
      return safeResult("MakerWorld", err);
    }
  },
};

export default makerworld;
