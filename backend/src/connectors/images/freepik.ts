import * as cheerio from "cheerio";
import { scrapePage } from "../../utils/browserLimited";
import { Connector, ConnectorResult, safeResult } from "../types";

const freepik: Connector = {
  name: "Freepik",
  category: "images",
  type: "scraping",

  async search(query): Promise<ConnectorResult> {
    try {
      const url = `https://www.freepik.com/search?query=${encodeURIComponent(query)}&type=photo`;
      const html = await scrapePage(url, "figure, [data-id]");
      const $ = cheerio.load(html);
      const items: any[] = [];

      $("a[href*='/free-photo/']").each((_, el) => {
        const href = $(el).attr("href") ?? "";
        const img = $(el).find("img").first();
        const src = img.attr("src") || img.attr("data-src") || "";
        const title = img.attr("alt") || $(el).attr("title") || "";
        if (href && src && src.startsWith("http")) {
          items.push({
            id: href,
            title: title || "Freepik photo",
            url: href.startsWith("http") ? href : `https://www.freepik.com${href}`,
            thumbnailUrl: src,
            source: "Freepik",
            category: "images",
          });
        }
      });

      const unique = [...new Map(items.map((i) => [i.id, i])).values()];
      return { source: "Freepik", total: unique.length, items: unique };
    } catch (err) {
      return safeResult("Freepik", err);
    }
  },
};

export default freepik;
