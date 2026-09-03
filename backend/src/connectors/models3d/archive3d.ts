import { scrapePage } from "../../utils/browserLimited";
import { Connector, ConnectorResult, scrapeConnector } from "../types";

const archive3d: Connector = {
  name: "Archive3D",
  category: "models3d",
  type: "scraping",

  async search(query): Promise<ConnectorResult> {
    const url = `https://archive3d.net/?a=download&q=${encodeURIComponent(query)}`;
    return scrapeConnector("Archive3D", scrapePage(url, "td a"), ($) => {
      const items: any[] = [];
      $("td a[href*='id=']").each((_, el) => {
        const href = $(el).attr("href") ?? "";
        const title = $(el).text().trim();
        const src = $(el).closest("tr").find("img").first().attr("src") || "";
        if (href && title && title.length > 1) {
          items.push({
            id: href,
            title,
            url: href.startsWith("http") ? href : `https://archive3d.net/${href}`,
            thumbnailUrl: src ? (src.startsWith("http") ? src : `https://archive3d.net/${src}`) : undefined,
            source: "Archive3D",
            category: "models3d",
          });
        }
      });
      return items;
    });
  },
};

export default archive3d;
