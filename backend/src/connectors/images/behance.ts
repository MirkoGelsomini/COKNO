import { scrapePage } from "../../utils/browserLimited";
import { Connector, ConnectorResult, scrapeConnector } from "../types";

const behance: Connector = {
  name: "Behance",
  category: "images",
  type: "scraping",

  async search(query): Promise<ConnectorResult> {
    const url = `https://www.behance.net/search/projects?search=${encodeURIComponent(query)}`;
    return scrapeConnector("Behance", scrapePage(url, "a[href*='/gallery/']"), ($) => {
      const items: any[] = [];
      $("a[href*='/gallery/']").each((_, el) => {
        const href = $(el).attr("href") ?? "";
        if (!href.match(/\/gallery\/\d+/)) return;
        const img = $(el).find("img").first();
        const src = img.attr("src") || img.attr("data-src") || "";
        const title = img.attr("alt") || $(el).find("h3, h2, .ProjectCoverNeue-title").first().text().trim();
        const author = $(el).find(".owners a, .profile-name").first().text().trim();
        if (href && title && src) {
          items.push({
            id: href,
            title,
            url: href.startsWith("http") ? href : `https://www.behance.net${href}`,
            thumbnailUrl: src,
            author: author || undefined,
            source: "Behance",
            category: "images",
          });
        }
      });
      return [...new Map(items.map((i) => [i.id, i])).values()];
    });
  },
};

export default behance;
