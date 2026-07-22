import * as cheerio from "cheerio";
import { scrapePage } from "../../utils/browserLimited";
import { Connector, ConnectorResult, safeResult } from "../types";

const blenderswap: Connector = {
  name: "BlenderSwap",
  category: "models3d",
  type: "scraping",

  async search(query): Promise<ConnectorResult> {
    try {
      const url = `https://www.blenderswap.com/blends?search=${encodeURIComponent(query)}`;
      const html = await scrapePage(url, "a[href*='/blends/view/']");
      const $ = cheerio.load(html);
      const items: any[] = [];

      $("a[href*='/blends/view/']").each((_, el) => {
        const href = $(el).attr("href") ?? "";
        const img = $(el).find("img").first();
        const src = img.attr("src") || img.attr("data-src") || "";
        const title = img.attr("alt") || $(el).find("h3, h2, .blend-name").first().text().trim();
        if (href && title) {
          items.push({
            id: href,
            title,
            url: href.startsWith("http") ? href : `https://www.blenderswap.com${href}`,
            thumbnailUrl: src || undefined,
            source: "BlenderSwap",
            category: "models3d",
          });
        }
      });

      const unique = [...new Map(items.map((i) => [i.id, i])).values()];
      return { source: "BlenderSwap", total: unique.length, items: unique };
    } catch (err) {
      return safeResult("BlenderSwap", err);
    }
  },
};

export default blenderswap;
