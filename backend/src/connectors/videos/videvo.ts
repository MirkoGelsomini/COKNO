import { scrapePage } from "../../utils/browserLimited";
import { Connector, ConnectorResult, scrapeConnector } from "../types";

const videvo: Connector = {
  name: "Videvo",
  category: "videos",
  type: "scraping",

  async search(query): Promise<ConnectorResult> {
    const url = `https://www.videvo.net/search/?q=${encodeURIComponent(query)}`;
    return scrapeConnector("Videvo", scrapePage(url, "a[href*='/video/']"), ($) => {
      const items: any[] = [];
      $("a[href*='/video/']").each((_, el) => {
        const href = $(el).attr("href") ?? "";
        const img = $(el).find("img").first();
        const src = img.attr("src") || img.attr("data-src") || "";
        const title = img.attr("alt") || $(el).find("h3, h2, p").first().text().trim();
        if (href && title) {
          items.push({
            id: href,
            title,
            url: href.startsWith("http") ? href : `https://www.videvo.net${href}`,
            thumbnailUrl: src || undefined,
            source: "Videvo",
            category: "videos",
          });
        }
      });
      return [...new Map(items.map((i) => [i.id, i])).values()];
    });
  },
};

export default videvo;
