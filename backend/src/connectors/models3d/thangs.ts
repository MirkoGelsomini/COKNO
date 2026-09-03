import { scrapePage } from "../../utils/browserLimited";
import { Connector, ConnectorResult, scrapeConnector } from "../types";

const thangs: Connector = {
  name: "Thangs",
  category: "models3d",
  type: "scraping",

  async search(query): Promise<ConnectorResult> {
    const url = `https://thangs.com/search?q=${encodeURIComponent(query)}`;
    return scrapeConnector("Thangs", scrapePage(url, "a[href*='/model/'], a[href*='/thangs/']"), ($) => {
      const items: any[] = [];
      $("a[href*='/model/']").each((_, el) => {
        const href = $(el).attr("href") ?? "";
        const img = $(el).find("img").first();
        const src = img.attr("src") || img.attr("data-src") || "";
        const title = img.attr("alt") || $(el).find("h3, h2, p").first().text().trim();
        if (href && title) {
          items.push({
            id: href,
            title,
            url: href.startsWith("http") ? href : `https://thangs.com${href}`,
            thumbnailUrl: src || undefined,
            source: "Thangs",
            category: "models3d",
          });
        }
      });
      return [...new Map(items.map((i) => [i.id, i])).values()];
    });
  },
};

export default thangs;
