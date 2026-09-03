import { scrapePage } from "../../utils/browserLimited";
import { Connector, ConnectorResult, scrapeConnector } from "../types";

const khanacademy: Connector = {
  name: "Khan Academy",
  category: "videos",
  type: "scraping",

  async search(query): Promise<ConnectorResult> {
    const url = `https://www.khanacademy.org/search?page_search_query=${encodeURIComponent(query)}`;
    return scrapeConnector("Khan Academy", scrapePage(url, "a[href*='/v/']"), ($) => {
      const items: any[] = [];
      $("a[href*='/v/']").each((_, el) => {
        const href = $(el).attr("href") ?? "";
        if (!href.includes("/v/")) return;
        const img = $(el).find("img").first();
        const src = img.attr("src") || img.attr("data-src") || "";
        const title = img.attr("alt") || $(el).find("h3, h2, .title").first().text().trim();
        if (href && title) {
          items.push({
            id: href,
            title,
            url: href.startsWith("http") ? href : `https://www.khanacademy.org${href}`,
            thumbnailUrl: src || undefined,
            source: "Khan Academy",
            category: "videos",
          });
        }
      });
      return [...new Map(items.map((i) => [i.id, i])).values()];
    });
  },
};

export default khanacademy;
