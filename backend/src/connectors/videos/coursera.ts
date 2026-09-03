import { plainFetchPage } from "../../utils/browser";
import { Connector, ConnectorResult, scrapeConnector } from "../types";

const coursera: Connector = {
  name: "Coursera",
  category: "videos",
  type: "scraping",

  async search(query): Promise<ConnectorResult> {
    const url = `https://www.coursera.org/search?query=${encodeURIComponent(query)}`;
    return scrapeConnector("Coursera", plainFetchPage(url), ($) => {
      const items: any[] = [];
      $("a[href*='/learn/']").each((_, el) => {
        const href = $(el).attr("href") ?? "";
        if (!href.includes("/learn/")) return;
        const img = $(el).find("img").first();
        const src = img.attr("src") || img.attr("data-src") || "";
        const title = img.attr("alt") || $(el).find("h2, h3, [class*='title']").first().text().trim();
        if (href && title) {
          items.push({
            id: href,
            title,
            url: href.startsWith("http") ? href : `https://www.coursera.org${href}`,
            thumbnailUrl: src || undefined,
            source: "Coursera",
            category: "videos",
          });
        }
      });
      return [...new Map(items.map((i) => [i.id, i])).values()];
    });
  },
};

export default coursera;
