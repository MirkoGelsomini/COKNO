import * as cheerio from "cheerio";
import { scrapePage } from "../../utils/browserLimited";
import { Connector, ConnectorResult, safeResult } from "../types";

const gifsec: Connector = {
  name: "Gifsec",
  category: "gifs",
  type: "scraping",

  async search(query): Promise<ConnectorResult> {
    try {
      const url = `https://gifsec.com/?q=${encodeURIComponent(query)}&s=search`;
      const html = await scrapePage(url, "article, .gif-item");
      const $ = cheerio.load(html);
      const items: any[] = [];

      $("a[href]").each((_, el) => {
        const href = $(el).attr("href") ?? "";
        if (!href.includes("gifsec.com/") || href === "https://gifsec.com/") return;
        const img = $(el).find("img").first();
        const src = img.attr("src") || img.attr("data-src") || "";
        const title = img.attr("alt") || $(el).text().trim();
        if (href && src) {
          items.push({
            id: href,
            title: title || "Gifsec GIF",
            url: href,
            thumbnailUrl: src,
            source: "Gifsec",
            category: "gifs",
          });
        }
      });

      const unique = [...new Map(items.map((i) => [i.id, i])).values()];
      return { source: "Gifsec", total: unique.length, items: unique };
    } catch (err) {
      return safeResult("Gifsec", err);
    }
  },
};

export default gifsec;
