import { scrapePage } from "../../utils/browserLimited";
import { Connector, ConnectorResult, scrapeConnector } from "../types";

const gifsec: Connector = {
  name: "Gifsec",
  category: "gifs",
  type: "scraping",

  async search(query): Promise<ConnectorResult> {
    const url = `https://gifsec.com/?q=${encodeURIComponent(query)}&s=search`;
    return scrapeConnector("Gifsec", scrapePage(url, "article, .gif-item"), ($) => {
      const items: any[] = [];
      $("a[href]").each((_, el) => {
        const href = $(el).attr("href") ?? "";
        if (!href.includes("gifsec.com/") || href === "https://gifsec.com/") return;
        const img = $(el).find("img").first();
        const src = img.attr("src") || img.attr("data-src") || "";
        const title = img.attr("alt") || $(el).text().trim();
        if (href && src) {
          items.push({
            id: href,
            title: title || "Gifsec GIF",
            url: href,
            thumbnailUrl: src,
            source: "Gifsec",
            category: "gifs",
          });
        }
      });
      return [...new Map(items.map((i) => [i.id, i])).values()];
    });
  },
};

export default gifsec;
