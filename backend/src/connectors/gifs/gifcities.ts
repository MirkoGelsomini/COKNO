import * as cheerio from "cheerio";
import { scrapePage } from "../../utils/browserLimited";
import { Connector, ConnectorResult, safeResult } from "../types";

const gifcities: Connector = {
  name: "GifCities",
  category: "gifs",
  type: "scraping",

  async search(query): Promise<ConnectorResult> {
    try {
      const url = `https://gifcities.org/?q=${encodeURIComponent(query)}`;
      const html = await scrapePage(url, "img");
      const $ = cheerio.load(html);
      const items: any[] = [];

      $("img").each((_, el) => {
        const src = $(el).attr("src") ?? "";
        const alt = $(el).attr("alt") || "";
        // GifCities images come from archive.org/web
        if (src && (src.includes("archive.org") || src.includes("geocities"))) {
          items.push({
            id: src,
            title: alt || "GifCities GIF",
            url: src,
            thumbnailUrl: src,
            source: "GifCities",
            category: "gifs",
          });
        }
      });

      return { source: "GifCities", total: items.length, items };
    } catch (err) {
      return safeResult("GifCities", err);
    }
  },
};

export default gifcities;
