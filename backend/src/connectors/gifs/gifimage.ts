import { scrapePage } from "../../utils/browserLimited";
import { Connector, ConnectorResult, scrapeConnector } from "../types";

const gifimage: Connector = {
  name: "GifImage",
  category: "gifs",
  type: "scraping",

  async search(query): Promise<ConnectorResult> {
    const url = `https://gifimage.net/?s=${encodeURIComponent(query)}`;
    return scrapeConnector("GifImage", scrapePage(url, "article, .post"), ($) => {
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
      return [...new Map(items.map((i) => [i.id, i])).values()];
    });
  },
};

export default gifimage;
