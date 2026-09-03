import { plainFetchPage } from "../../utils/browser";
import { Connector, ConnectorResult, scrapeConnector } from "../types";

const coverr: Connector = {
  name: "Coverr",
  category: "videos",
  type: "scraping",

  async search(query): Promise<ConnectorResult> {
    const url = `https://coverr.co/s?q=${encodeURIComponent(query)}`;
    return scrapeConnector("Coverr", plainFetchPage(url), ($) => {
      const items: any[] = [];
      $("a[href*='/videos/']").each((_, el) => {
        const href = $(el).attr("href") ?? "";
        if (!href || href === "/videos/") return;
        const img = $(el).find("img, video").first();
        const src = img.attr("src") || img.attr("poster") || "";
        const title = img.attr("alt") || $(el).find("h3, p, .title").first().text().trim();
        if (href && title) {
          items.push({
            id: href,
            title,
            url: href.startsWith("http") ? href : `https://coverr.co${href}`,
            thumbnailUrl: src || undefined,
            source: "Coverr",
            category: "videos",
          });
        }
      });
      return [...new Map(items.map((i) => [i.id, i])).values()];
    });
  },
};

export default coverr;
