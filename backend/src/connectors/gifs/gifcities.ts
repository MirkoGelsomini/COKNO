import { scrapePage } from "../../utils/browserLimited";
import { Connector, ConnectorResult, scrapeConnector } from "../types";

const gifcities: Connector = {
  name: "GifCities",
  category: "gifs",
  type: "scraping",

  async search(query): Promise<ConnectorResult> {
    const url = `https://gifcities.org/?q=${encodeURIComponent(query)}`;
    return scrapeConnector("GifCities", scrapePage(url, "img"), ($) => {
      const items: any[] = [];
      $("img").each((_, el) => {
        const src = $(el).attr("src") ?? "";
        const alt = $(el).attr("alt") || "";
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
      return items;
    });
  },
};

export default gifcities;
