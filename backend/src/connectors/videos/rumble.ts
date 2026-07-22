import * as cheerio from "cheerio";
import { scrapePage } from "../../utils/browserLimited";
import { Connector, ConnectorResult, safeResult } from "../types";

const rumble: Connector = {
  name: "Rumble",
  category: "videos",
  type: "scraping",

  async search(query): Promise<ConnectorResult> {
    try {
      const url = `https://rumble.com/search/video?q=${encodeURIComponent(query)}`;
      const html = await scrapePage(url, "a[href*='/v']");
      const $ = cheerio.load(html);
      const items: any[] = [];

      $("a[href*='/v']").each((_, el) => {
        const href = $(el).attr("href") ?? "";
        if (!href.match(/\/v[a-z0-9]+-/)) return;
        const img = $(el).find("img").first();
        const src = img.attr("src") || img.attr("data-src") || "";
        const title = img.attr("alt") || $(el).find("h3, h2, .title").first().text().trim();
        if (href && title) {
          items.push({
            id: href,
            title,
            url: href.startsWith("http") ? href : `https://rumble.com${href}`,
            thumbnailUrl: src || undefined,
            source: "Rumble",
            category: "videos",
          });
        }
      });

      const unique = [...new Map(items.map((i) => [i.id, i])).values()];
      return { source: "Rumble", total: unique.length, items: unique };
    } catch (err) {
      return safeResult("Rumble", err);
    }
  },
};

export default rumble;
