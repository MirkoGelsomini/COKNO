import { scrapePage } from "../../utils/browserLimited";
import { Connector, ConnectorResult, scrapeConnector } from "../types";

const pond5: Connector = {
  name: "Pond5",
  category: "videos",
  type: "scraping",

  async search(query): Promise<ConnectorResult> {
    const url = `https://www.pond5.com/search?kw=${encodeURIComponent(query)}&media=footage`;
    return scrapeConnector("Pond5", scrapePage(url, "a[href*='/stock-video-footage/']"), ($) => {
      const items: any[] = [];
      $("a[href*='/stock-video-footage/']").each((_, el) => {
        const href = $(el).attr("href") ?? "";
        if (!href.match(/\/stock-video-footage\/\d+/)) return;
        const img = $(el).find("img").first();
        const src = img.attr("src") || img.attr("data-src") || "";
        const title = img.attr("alt") || $(el).find("h3, h2, .clip-title").first().text().trim();
        if (href && title) {
          items.push({
            id: href,
            title,
            url: href.startsWith("http") ? href : `https://www.pond5.com${href}`,
            thumbnailUrl: src || undefined,
            source: "Pond5",
            category: "videos",
          });
        }
      });
      return [...new Map(items.map((i) => [i.id, i])).values()];
    });
  },
};

export default pond5;
