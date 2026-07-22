import * as cheerio from "cheerio";
import { scrapePage } from "../../utils/browserLimited";
import { Connector, ConnectorResult, safeResult } from "../types";

const gifimage: Connector = {
  name: "GifImage",
  category: "gifs",
  type: "scraping",

  async search(query): Promise<ConnectorResult> {
    try {
      const url = `https://gifimage.net/?s=${encodeURIComponent(query)}`;
      const html = await scrapePage(url, "article, .post");
      const $ = cheerio.load(html);
      const items: any[] = [];

      $("article a[href], .post a[href]").each((_, el) => {
        const href = $(el).attr("href") ?? "";
        if (!href.includes("gifimage.net")) return;
        const img = $(el).find("img").first();
        const src = img.attr("src") || img.attr("data-src") || "";
        const title = img.attr("alt") || $(el).text().trim();
        if (href && src) {
          items.push({
            id: href,
            title: title || "GifImage GIF",
            url: href,
            thumbnailUrl: src,
            source: "GifImage",
            category: "gifs",
          });
        }
      });

      const unique = [...new Map(items.map((i) => [i.id, i])).values()];
      return { source: "GifImage", total: unique.length, items: unique };
    } catch (err) {
      return safeResult("GifImage", err);
    }
  },
};

export default gifimage;
