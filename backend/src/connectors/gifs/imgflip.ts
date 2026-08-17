import { scrapePage } from "../../utils/browserLimited";
import { Connector, ConnectorResult, scrapeConnector } from "../types";

const imgflip: Connector = {
  name: "Imgflip",
  category: "gifs",
  type: "scraping",

  async search(query): Promise<ConnectorResult> {
    const url = `https://imgflip.com/gif-search?q=${encodeURIComponent(query)}`;
    return scrapeConnector("Imgflip", scrapePage(url, ".gif-wrap"), ($) => {
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
      return [...new Map(items.map((i) => [i.id, i])).values()];
    });
  },
};

export default imgflip;
