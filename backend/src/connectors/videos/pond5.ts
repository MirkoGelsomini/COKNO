import * as cheerio from "cheerio";
import { scrapePage } from "../../utils/browserLimited";
import { Connector, ConnectorResult, safeResult } from "../types";

const pond5: Connector = {
  name: "Pond5",
  category: "videos",
  type: "scraping",

  async search(query): Promise<ConnectorResult> {
    try {
      const url = `https://www.pond5.com/search?kw=${encodeURIComponent(query)}&media=footage`;
      const html = await scrapePage(url, "a[href*='/stock-video-footage/']");
      const $ = cheerio.load(html);
      const items: any[] = [];

      $("a[href*='/stock-video-footage/']").each((_, el) => {
        const href = $(el).attr("href") ?? "";
        if (!href.match(/\/stock-video-footage\/\d+/)) return;
        const img = $(el).find("img").first();
        const src = img.attr("src") || img.attr("data-src") || "";
        const title = img.attr("alt") || $(el).find("h3, h2, .clip-title").first().text().trim();
        if (href && title) {
          items.push({
            id: href,
            title,
            url: href.startsWith("http") ? href : `https://www.pond5.com${href}`,
            thumbnailUrl: src || undefined,
            source: "Pond5",
            category: "videos",
          });
        }
      });

      const unique = [...new Map(items.map((i) => [i.id, i])).values()];
      return { source: "Pond5", total: unique.length, items: unique };
    } catch (err) {
      return safeResult("Pond5", err);
    }
  },
};

export default pond5;
