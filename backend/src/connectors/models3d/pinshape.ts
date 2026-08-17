import { plainFetchPage } from "../../utils/browser";
import { Connector, ConnectorResult, scrapeConnector } from "../types";

const pinshape: Connector = {
  name: "Pinshape",
  category: "models3d",
  type: "scraping",

  async search(query): Promise<ConnectorResult> {
    const url = `https://pinshape.com/items?search=${encodeURIComponent(query)}`;
    return scrapeConnector("Pinshape", plainFetchPage(url), ($) => {
      const items: any[] = [];
      $("a[href*='/items/']").each((_, el) => {
        const href = $(el).attr("href") ?? "";
        if (!href.match(/\/items\/\d+/)) return;
        const img = $(el).find("img").first();
        const src = img.attr("src") || img.attr("data-src") || "";
        const title = img.attr("alt") || $(el).find("h3, h2, p").first().text().trim();
        if (href && title) {
          items.push({
            id: href,
            title,
            url: href.startsWith("http") ? href : `https://pinshape.com${href}`,
            thumbnailUrl: src || undefined,
            source: "Pinshape",
            category: "models3d",
          });
        }
      });
      return [...new Map(items.map((i) => [i.id, i])).values()];
    });
  },
};

export default pinshape;
