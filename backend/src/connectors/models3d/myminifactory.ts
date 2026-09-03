import { scrapePage } from "../../utils/browserLimited";
import { Connector, ConnectorResult, scrapeConnector } from "../types";

const myminifactory: Connector = {
  name: "MyMiniFactory",
  category: "models3d",
  type: "scraping",

  async search(query): Promise<ConnectorResult> {
    const url = `https://www.myminifactory.com/search/?search=${encodeURIComponent(query)}`;
    return scrapeConnector("MyMiniFactory", scrapePage(url, ".object-card, a[href*='/object/']"), ($) => {
      const items: any[] = [];
      $("a[href*='/object/']").each((_, el) => {
        const href = $(el).attr("href") ?? "";
        if (!href.includes("/object/")) return;
        const img = $(el).find("img").first();
        const src = img.attr("src") || img.attr("data-src") || img.attr("data-lazy-src") || "";
        const title = img.attr("alt") || $(el).find("h3, h2, .object-name").first().text().trim();
        if (href && title) {
          items.push({
            id: href,
            title,
            url: href.startsWith("http") ? href : `https://www.myminifactory.com${href}`,
            thumbnailUrl: src || undefined,
            source: "MyMiniFactory",
            category: "models3d",
          });
        }
      });
      return [...new Map(items.map((i) => [i.id, i])).values()];
    });
  },
};

export default myminifactory;
