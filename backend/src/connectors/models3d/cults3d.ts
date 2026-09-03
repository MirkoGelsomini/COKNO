import { scrapePage } from "../../utils/browserLimited";
import { Connector, ConnectorResult, scrapeConnector } from "../types";

const cults3d: Connector = {
  name: "Cults3D",
  category: "models3d",
  type: "scraping",

  async search(query): Promise<ConnectorResult> {
    const url = `https://cults3d.com/en/search?q=${encodeURIComponent(query)}`;
    return scrapeConnector("Cults3D", scrapePage(url, "article, a[href*='/3d-model/']"), ($) => {
      const items: any[] = [];
      $("a[href*='/3d-model/']").each((_, el) => {
        const href = $(el).attr("href") ?? "";
        const img = $(el).find("img").first();
        const src = img.attr("src") || img.attr("data-src") || "";
        const title = img.attr("alt") || $(el).find("h3, h2, .creation-name").first().text().trim();
        if (href && title) {
          items.push({
            id: href,
            title,
            url: href.startsWith("http") ? href : `https://cults3d.com${href}`,
            thumbnailUrl: src || undefined,
            source: "Cults3D",
            category: "models3d",
          });
        }
      });
      return [...new Map(items.map((i) => [i.id, i])).values()];
    });
  },
};

export default cults3d;
