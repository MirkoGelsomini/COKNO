import { scrapePage } from "../../utils/browserLimited";
import { Connector, ConnectorResult, scrapeConnector } from "../types";

const gifer: Connector = {
  name: "Gifer",
  category: "gifs",
  type: "scraping",

  async search(query): Promise<ConnectorResult> {
    const url = `https://gifer.com/search?q=${encodeURIComponent(query)}`;
    return scrapeConnector("Gifer", scrapePage(url, "a[href*='/en/']"), ($) => {
      const items: any[] = [];
      $("a[href*='/en/']").each((_, el) => {
        const href = $(el).attr("href") ?? "";
        const img = $(el).find("img").first();
        const src = img.attr("src") || img.attr("data-src") || "";
        const alt = img.attr("alt") || "";
        if (href && src && src.includes("gifer")) {
          items.push({
            id: href,
            title: alt || "Gifer GIF",
            url: href.startsWith("http") ? href : `https://gifer.com${href}`,
            thumbnailUrl: src,
            source: "Gifer",
            category: "gifs",
          });
        }
      });
      return items;
    });
  },
};

export default gifer;
