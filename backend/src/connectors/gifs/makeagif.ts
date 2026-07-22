import * as cheerio from "cheerio";
import { scrapePage } from "../../utils/browserLimited";
import { Connector, ConnectorResult, safeResult } from "../types";

const makeagif: Connector = {
  name: "MakeAGif",
  category: "gifs",
  type: "scraping",

  async search(query): Promise<ConnectorResult> {
    try {
      const url = `https://makeagif.com/search/${encodeURIComponent(query)}`;
      const html = await scrapePage(url, "a[href*='/gif/']");
      const $ = cheerio.load(html);
      const items: any[] = [];

      $("a[href*='/gif/']").each((_, el) => {
        const href = $(el).attr("href") ?? "";
        const img = $(el).find("img").first();
        const src = img.attr("src") || img.attr("data-src") || "";
        const title = img.attr("alt") || $(el).find(".gif-title, h3").first().text().trim();
        if (href && src) {
          items.push({
            id: href,
            title: title || "MakeAGif GIF",
            url: href.startsWith("http") ? href : `https://makeagif.com${href}`,
            thumbnailUrl: src,
            source: "MakeAGif",
            category: "gifs",
          });
        }
      });

      const unique = [...new Map(items.map((i) => [i.id, i])).values()];
      return { source: "MakeAGif", total: unique.length, items: unique };
    } catch (err) {
      return safeResult("MakeAGif", err);
    }
  },
};

export default makeagif;
