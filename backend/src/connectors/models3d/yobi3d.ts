import { scrapePage } from "../../utils/browserLimited";
import { Connector, ConnectorResult, scrapeConnector } from "../types";

const yobi3d: Connector = {
  name: "Yobi3D",
  category: "models3d",
  type: "scraping",

  async search(query): Promise<ConnectorResult> {
    const url = `https://www.yobi3d.com/q/${encodeURIComponent(query)}/`;
    return scrapeConnector("Yobi3D", scrapePage(url, ".result-item, a[href*='/f/']"), ($) => {
      const items: any[] = [];
      $("a[href*='/f/']").each((_, el) => {
        const href = $(el).attr("href") ?? "";
        const img = $(el).find("img").first();
        const src = img.attr("src") || img.attr("data-src") || "";
        const title = img.attr("alt") || $(el).find("h3, h2, .title").first().text().trim();
        if (href && title) {
          items.push({
            id: href,
            title,
            url: href.startsWith("http") ? href : `https://www.yobi3d.com${href}`,
            thumbnailUrl: src || undefined,
            source: "Yobi3D",
            category: "models3d",
          });
        }
      });
      return [...new Map(items.map((i) => [i.id, i])).values()];
    });
  },
};

export default yobi3d;
