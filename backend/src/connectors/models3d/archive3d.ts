import * as cheerio from "cheerio";
import { scrapePage } from "../../utils/browserLimited";
import { Connector, ConnectorResult, safeResult } from "../types";

const archive3d: Connector = {
  name: "Archive3D",
  category: "models3d",
  type: "scraping",

  async search(query): Promise<ConnectorResult> {
    try {
      const url = `https://archive3d.net/?a=download&q=${encodeURIComponent(query)}`;
      const html = await scrapePage(url, "td a");
      const $ = cheerio.load(html);
      const items: any[] = [];

      $("td a[href*='id=']").each((_, el) => {
        const href = $(el).attr("href") ?? "";
        const title = $(el).text().trim();
        const row = $(el).closest("tr");
        const img = row.find("img").first();
        const src = img.attr("src") || "";
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

      return { source: "Archive3D", total: items.length, items };
    } catch (err) {
      return safeResult("Archive3D", err);
    }
  },
};

export default archive3d;
