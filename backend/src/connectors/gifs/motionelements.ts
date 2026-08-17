import { scrapePage } from "../../utils/browserLimited";
import { Connector, ConnectorResult, scrapeConnector } from "../types";

const motionelements: Connector = {
  name: "MotionElements",
  category: "gifs",
  type: "scraping",

  async search(query): Promise<ConnectorResult> {
    const url = `https://www.motionelements.com/free/free-gifs?q=${encodeURIComponent(query)}`;
    return scrapeConnector("MotionElements", scrapePage(url, "a[href*='/stock-gifs/']"), ($) => {
      const items: any[] = [];
      $("a[href*='/stock-gifs/']").each((_, el) => {
        const href = $(el).attr("href") ?? "";
        const img = $(el).find("img").first();
        const src = img.attr("src") || img.attr("data-src") || "";
        const title = img.attr("alt") || $(el).find("h3, h2, p").first().text().trim();
        if (href && title) {
          items.push({
            id: href,
            title,
            url: href.startsWith("http") ? href : `https://www.motionelements.com${href}`,
            thumbnailUrl: src || undefined,
            source: "MotionElements",
            category: "gifs",
          });
        }
      });
      return [...new Map(items.map((i) => [i.id, i])).values()];
    });
  },
};

export default motionelements;
