import { scrapePage } from "../../utils/browserLimited";
import { Connector, ConnectorResult, scrapeConnector } from "../types";

const stlfinder: Connector = {
  name: "STLfinder",
  category: "models3d",
  type: "scraping",

  async search(query): Promise<ConnectorResult> {
    const url = `https://www.stlfinder.com/3dmodels/${encodeURIComponent(query)}/`;
    return scrapeConnector("STLfinder", scrapePage(url, ".model-item, a[href*='/model/']"), ($) => {
      const items: any[] = [];
      $("a[href*='/model/']").each((_, el) => {
        const href = $(el).attr("href") ?? "";
        const img = $(el).find("img").first();
        const src = img.attr("src") || img.attr("data-src") || img.attr("data-original") || "";
        const title = img.attr("alt") || $(el).find("h3, h2, .model-title").first().text().trim();
        if (href && title) {
          items.push({
            id: href,
            title,
            url: href.startsWith("http") ? href : `https://www.stlfinder.com${href}`,
            thumbnailUrl: src || undefined,
            source: "STLfinder",
            category: "models3d",
          });
        }
      });
      return [...new Map(items.map((i) => [i.id, i])).values()];
    });
  },
};

export default stlfinder;
