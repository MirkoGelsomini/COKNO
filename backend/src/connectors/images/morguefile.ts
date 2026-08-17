import { scrapePage } from "../../utils/browserLimited";
import { Connector, ConnectorResult, scrapeConnector } from "../types";

const morguefile: Connector = {
  name: "Morguefile",
  category: "images",
  type: "scraping",

  async search(query): Promise<ConnectorResult> {
    const url = `https://morguefile.com/search?q=${encodeURIComponent(query)}`;
    return scrapeConnector("Morguefile", scrapePage(url, ".photo-tile, figure"), ($) => {
      const items: any[] = [];
      $("figure a, a.photo-tile").each((_, el) => {
        const href = $(el).attr("href") ?? "";
        const img = $(el).find("img").first();
        const src = img.attr("src") || img.attr("data-src") || "";
        const alt = img.attr("alt") || "";
        if (href && src && src.startsWith("http")) {
          items.push({
            id: href,
            title: alt || "Morguefile photo",
            url: href.startsWith("http") ? href : `https://morguefile.com${href}`,
            thumbnailUrl: src,
            source: "Morguefile",
            category: "images",
          });
        }
      });
      return items;
    });
  },
};

export default morguefile;
