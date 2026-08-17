import { scrapePage } from "../../utils/browserLimited";
import { Connector, ConnectorResult, scrapeConnector } from "../types";

const makerworld: Connector = {
  name: "MakerWorld",
  category: "models3d",
  type: "scraping",

  async search(query): Promise<ConnectorResult> {
    const url = `https://makerworld.com/en/search?keyword=${encodeURIComponent(query)}`;
    return scrapeConnector("MakerWorld", scrapePage(url, "a[href*='/models/']"), ($) => {
      const items: any[] = [];
      $("a[href*='/models/']").each((_, el) => {
        const href = $(el).attr("href") ?? "";
        if (href === "/en/models" || !href.match(/\/models\/\d+/)) return;
        const img = $(el).find("img").first();
        const src = img.attr("src") || img.attr("data-src") || "";
        const title = img.attr("alt") || $(el).find("h3, h2, p").first().text().trim();
        if (href && title) {
          items.push({
            id: href,
            title,
            url: href.startsWith("http") ? href : `https://makerworld.com${href}`,
            thumbnailUrl: src || undefined,
            source: "MakerWorld",
            category: "models3d",
          });
        }
      });
      return [...new Map(items.map((i) => [i.id, i])).values()];
    });
  },
};

export default makerworld;
