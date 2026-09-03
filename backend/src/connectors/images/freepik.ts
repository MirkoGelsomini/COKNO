import { scrapePage } from "../../utils/browserLimited";
import { Connector, ConnectorResult, scrapeConnector } from "../types";

const freepik: Connector = {
  name: "Freepik",
  category: "images",
  type: "scraping",

  async search(query): Promise<ConnectorResult> {
    const url = `https://www.freepik.com/search?query=${encodeURIComponent(query)}&type=photo`;
    return scrapeConnector("Freepik", scrapePage(url, "figure, [data-id]"), ($) => {
      const items: any[] = [];
      $("a[href*='/free-photo/']").each((_, el) => {
        const href = $(el).attr("href") ?? "";
        const img = $(el).find("img").first();
        const src = img.attr("src") || img.attr("data-src") || "";
        const title = img.attr("alt") || $(el).attr("title") || "";
        if (href && src && src.startsWith("http")) {
          items.push({
            id: href,
            title: title || "Freepik photo",
            url: href.startsWith("http") ? href : `https://www.freepik.com${href}`,
            thumbnailUrl: src,
            source: "Freepik",
            category: "images",
          });
        }
      });
      return [...new Map(items.map((i) => [i.id, i])).values()];
    });
  },
};

export default freepik;
