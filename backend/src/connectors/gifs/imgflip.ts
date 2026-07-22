import * as cheerio from "cheerio";
import { scrapePage } from "../../utils/browserLimited";
import { Connector, ConnectorResult, safeResult } from "../types";

const imgflip: Connector = {
  name: "Imgflip",
  category: "gifs",
  type: "scraping",

  async search(query): Promise<ConnectorResult> {
    try {
      const url = `https://imgflip.com/gif-search?q=${encodeURIComponent(query)}`;
      const html = await scrapePage(url, ".gif-wrap");
      const $ = cheerio.load(html);
      const items: any[] = [];

      $(".gif-wrap a[href*='/gif/']").each((_, el) => {
        const href = $(el).attr("href") ?? "";
        const img = $(el).find("img").first();
        const src = img.attr("src") || img.attr("data-src") || "";
        const title = img.attr("alt") || $(el).find(".gif-title, h3, p").first().text().trim();
        if (href && src) {
          items.push({
            id: href,
            title: title || "Imgflip GIF",
            url: href.startsWith("http") ? href : `https://imgflip.com${href}`,
            thumbnailUrl: src,
            source: "Imgflip",
            category: "gifs",
          });
        }
      });

      const unique = [...new Map(items.map((i) => [i.id, i])).values()];
      return { source: "Imgflip", total: unique.length, items: unique };
    } catch (err) {
      return safeResult("Imgflip", err);
    }
  },
};

export default imgflip;
