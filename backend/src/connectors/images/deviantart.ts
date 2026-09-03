import { plainFetchPage } from "../../utils/browser";
import { Connector, ConnectorResult, scrapeConnector } from "../types";

const deviantart: Connector = {
  name: "DeviantArt",
  category: "images",
  type: "scraping",

  async search(query): Promise<ConnectorResult> {
    const url = `https://www.deviantart.com/search?q=${encodeURIComponent(query)}`;
    return scrapeConnector("DeviantArt", plainFetchPage(url), ($) => {
      const items: any[] = [];
      $("a[href*='deviantart.com'][href*='/art/']").each((_, el) => {
        const href = $(el).attr("href") ?? "";
        const img = $(el).find("img").first();
        const src = img.attr("src") || img.attr("data-src") || "";
        const title = img.attr("alt") || $(el).attr("title") || "";
        if (href && src && src.startsWith("http")) {
          items.push({
            id: href,
            title: title || "DeviantArt artwork",
            url: href,
            thumbnailUrl: src,
            source: "DeviantArt",
            category: "images",
          });
        }
      });
      return [...new Map(items.map((i) => [i.id, i])).values()];
    });
  },
};

export default deviantart;
