import { scrapePage } from "../../utils/browserLimited";
import { Connector, ConnectorResult, scrapeConnector } from "../types";

const nih3d: Connector = {
  name: "NIH 3D Print Exchange",
  category: "models3d",
  type: "scraping",

  async search(query): Promise<ConnectorResult> {
    const url = `https://3d.nih.gov/search/?q=${encodeURIComponent(query)}`;
    return scrapeConnector("NIH 3D Print Exchange", scrapePage(url, "a[href*='/entries/']"), ($) => {
      const items: any[] = [];
      $("a[href*='/entries/']").each((_, el) => {
        const href = $(el).attr("href") ?? "";
        if (href === "/entries/" || !href.match(/\/entries\/\d+/)) return;
        const img = $(el).find("img").first();
        const src = img.attr("src") || img.attr("data-src") || "";
        const title = img.attr("alt") || $(el).find("h3, h2, .entry-title").first().text().trim();
        if (href && title) {
          items.push({
            id: href,
            title,
            url: href.startsWith("http") ? href : `https://3d.nih.gov${href}`,
            thumbnailUrl: src || undefined,
            source: "NIH 3D Print Exchange",
            category: "models3d",
          });
        }
      });
      return [...new Map(items.map((i) => [i.id, i])).values()];
    });
  },
};

export default nih3d;
