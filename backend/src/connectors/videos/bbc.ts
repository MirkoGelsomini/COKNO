import { scrapePage } from "../../utils/browserLimited";
import { Connector, ConnectorResult, scrapeConnector } from "../types";

const bbc: Connector = {
  name: "BBC Archive",
  category: "videos",
  type: "scraping",

  async search(query): Promise<ConnectorResult> {
    const url = `https://www.bbc.co.uk/archive/search/?q=${encodeURIComponent(query)}`;
    return scrapeConnector("BBC Archive", scrapePage(url, "a[href*='/archive/']"), ($) => {
      const items: any[] = [];
      $("a[href*='/archive/']").each((_, el) => {
        const href = $(el).attr("href") ?? "";
        if (href === "/archive/" || href.includes("search")) return;
        const img = $(el).find("img").first();
        const src = img.attr("src") || img.attr("data-src") || "";
        const title = img.attr("alt") || $(el).find("h3, h2, .programme__title").first().text().trim();
        if (href && title) {
          items.push({
            id: href,
            title,
            url: href.startsWith("http") ? href : `https://www.bbc.co.uk${href}`,
            thumbnailUrl: src || undefined,
            source: "BBC Archive",
            category: "videos",
          });
        }
      });
      return [...new Map(items.map((i) => [i.id, i])).values()];
    });
  },
};

export default bbc;
