import * as cheerio from "cheerio";
import { scrapePage } from "../../utils/browserLimited";
import { Connector, ConnectorResult, safeResult } from "../types";

const dribbble: Connector = {
  name: "Dribbble",
  category: "gifs",
  type: "scraping",

  async search(query): Promise<ConnectorResult> {
    try {
      const url = `https://dribbble.com/shots?q=${encodeURIComponent(query)}&animated=true`;
      const html = await scrapePage(url, "a[href*='/shots/']");
      const $ = cheerio.load(html);
      const items: any[] = [];

      $("a[href*='/shots/']").each((_, el) => {
        const href = $(el).attr("href") ?? "";
        if (!href.match(/\/shots\/\d+/)) return;
        const img = $(el).find("img").first();
        const src = img.attr("src") || img.attr("data-src") || "";
        const title = img.attr("alt") || $(el).attr("title") || "";
        if (href && src) {
          items.push({
            id: href,
            title: title || "Dribbble animation",
            url: href.startsWith("http") ? href : `https://dribbble.com${href}`,
            thumbnailUrl: src,
            source: "Dribbble",
            category: "gifs",
          });
        }
      });

      const unique = [...new Map(items.map((i) => [i.id, i])).values()];
      return { source: "Dribbble", total: unique.length, items: unique };
    } catch (err) {
      return safeResult("Dribbble", err);
    }
  },
};

export default dribbble;
