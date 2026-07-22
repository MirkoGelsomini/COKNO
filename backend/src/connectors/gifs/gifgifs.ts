import * as cheerio from "cheerio";
import { scrapePage } from "../../utils/browserLimited";
import { Connector, ConnectorResult, safeResult } from "../types";

const gifgifs: Connector = {
  name: "Gifgifs",
  category: "gifs",
  type: "scraping",

  async search(query): Promise<ConnectorResult> {
    try {
      const url = `https://gifgifs.com/search/?term=${encodeURIComponent(query)}`;
      const html = await scrapePage(url, "a[href*='/gif/'], img");
      const $ = cheerio.load(html);
      const items: any[] = [];

      $("a[href]").each((_, el) => {
        const href = $(el).attr("href") ?? "";
        if (!href.includes("/gif/") && !href.match(/gifgifs\.com\/[a-z0-9-]+\/?$/)) return;
        const img = $(el).find("img").first();
        const src = img.attr("src") || img.attr("data-src") || "";
        const title = img.attr("alt") || $(el).find("h3, p, .title").first().text().trim();
        if (href && src) {
          items.push({
            id: href,
            title: title || "Gifgifs GIF",
            url: href.startsWith("http") ? href : `https://gifgifs.com${href}`,
            thumbnailUrl: src.startsWith("http") ? src : `https://gifgifs.com${src}`,
            source: "Gifgifs",
            category: "gifs",
          });
        }
      });

      const unique = [...new Map(items.map((i) => [i.id, i])).values()];
      return { source: "Gifgifs", total: unique.length, items: unique };
    } catch (err) {
      return safeResult("Gifgifs", err);
    }
  },
};

export default gifgifs;
