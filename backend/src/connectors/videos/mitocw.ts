import { scrapePage } from "../../utils/browserLimited";
import { Connector, ConnectorResult, scrapeConnector } from "../types";

const mitocw: Connector = {
  name: "MIT OpenCourseWare",
  category: "videos",
  type: "scraping",

  async search(query): Promise<ConnectorResult> {
    const url = `https://ocw.mit.edu/search/?q=${encodeURIComponent(query)}`;
    return scrapeConnector("MIT OpenCourseWare", scrapePage(url, "a[href*='/courses/']"), ($) => {
      const items: any[] = [];
      $("a[href*='/courses/']").each((_, el) => {
        const href = $(el).attr("href") ?? "";
        if (!href.match(/\/courses\/[a-z0-9-]+\/?$/)) return;
        const img = $(el).find("img").first();
        const src = img.attr("src") || img.attr("data-src") || "";
        const title = img.attr("alt") || $(el).find("h3, h2, .title").first().text().trim();
        if (href && title) {
          items.push({
            id: href,
            title,
            url: href.startsWith("http") ? href : `https://ocw.mit.edu${href}`,
            thumbnailUrl: src || undefined,
            source: "MIT OpenCourseWare",
            category: "videos",
          });
        }
      });
      return [...new Map(items.map((i) => [i.id, i])).values()];
    });
  },
};

export default mitocw;
