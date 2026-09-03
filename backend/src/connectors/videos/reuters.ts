import { scrapePage } from "../../utils/browserLimited";
import { Connector, ConnectorResult, scrapeConnector } from "../types";

const reuters: Connector = {
  name: "Reuters Video",
  category: "videos",
  type: "scraping",

  async search(query): Promise<ConnectorResult> {
    const url = `https://www.reuters.com/search/news?blob=${encodeURIComponent(query)}&mediaType=video`;
    return scrapeConnector("Reuters Video", scrapePage(url, "a[href*='/video/']"), ($) => {
      const items: any[] = [];
      $("a[href*='/video/']").each((_, el) => {
        const href = $(el).attr("href") ?? "";
        const img = $(el).find("img").first();
        const src = img.attr("src") || img.attr("data-src") || "";
        const title = img.attr("alt") || $(el).find("h3, h2, .story-title").first().text().trim();
        if (href && title) {
          items.push({
            id: href,
            title,
            url: href.startsWith("http") ? href : `https://www.reuters.com${href}`,
            thumbnailUrl: src || undefined,
            source: "Reuters Video",
            category: "videos",
          });
        }
      });
      return [...new Map(items.map((i) => [i.id, i])).values()];
    });
  },
};

export default reuters;
