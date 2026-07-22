import * as cheerio from "cheerio";
import { scrapePage } from "../../utils/browserLimited";
import { Connector, ConnectorResult, safeResult } from "../types";

const ted: Connector = {
  name: "TED Talks",
  category: "videos",
  type: "scraping",

  async search(query): Promise<ConnectorResult> {
    try {
      const url = `https://www.ted.com/search?q=${encodeURIComponent(query)}`;
      const html = await scrapePage(url, "a[href*='/talks/']");
      const $ = cheerio.load(html);
      const items: any[] = [];

      $("a[href*='/talks/']").each((_, el) => {
        const href = $(el).attr("href") ?? "";
        if (!href.match(/\/talks\/[a-z0-9_-]+/)) return;
        const img = $(el).find("img").first();
        const src = img.attr("src") || img.attr("data-src") || "";
        const title = img.attr("alt") || $(el).find("h3, h2, [class*='talk']").first().text().trim();
        if (href && title) {
          items.push({
            id: href,
            title,
            url: href.startsWith("http") ? href : `https://www.ted.com${href}`,
            thumbnailUrl: src || undefined,
            source: "TED Talks",
            category: "videos",
          });
        }
      });

      const unique = [...new Map(items.map((i) => [i.id, i])).values()];
      return { source: "TED Talks", total: unique.length, items: unique };
    } catch (err) {
      return safeResult("TED Talks", err);
    }
  },
};

export default ted;
