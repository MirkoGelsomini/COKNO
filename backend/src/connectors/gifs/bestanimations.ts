import * as cheerio from "cheerio";
import { scrapePage } from "../../utils/browserLimited";
import { Connector, ConnectorResult, safeResult } from "../types";

const bestanimations: Connector = {
  name: "Best Animations",
  category: "gifs",
  type: "scraping",

  async search(query): Promise<ConnectorResult> {
    try {
      const url = `https://bestanimations.com/search?q=${encodeURIComponent(query)}`;
      const html = await scrapePage(url, "img[src*='.gif']");
      const $ = cheerio.load(html);
      const items: any[] = [];

      $("a[href]").each((_, el) => {
        const href = $(el).attr("href") ?? "";
        const img = $(el).find("img").first();
        const src = img.attr("src") || img.attr("data-src") || "";
        const title = img.attr("alt") || $(el).attr("title") || "";
        if (src && src.includes(".gif")) {
          items.push({
            id: src,
            title: title || "Best Animations GIF",
            url: href.startsWith("http") ? href : `https://bestanimations.com${href}`,
            thumbnailUrl: src.startsWith("http") ? src : `https://bestanimations.com${src}`,
            source: "Best Animations",
            category: "gifs",
          });
        }
      });

      const unique = [...new Map(items.map((i) => [i.id, i])).values()];
      return { source: "Best Animations", total: unique.length, items: unique };
    } catch (err) {
      return safeResult("Best Animations", err);
    }
  },
};

export default bestanimations;
