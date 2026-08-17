import { scrapePage } from "../../utils/browserLimited";
import { Connector, ConnectorResult, scrapeConnector } from "../types";

const tumblr: Connector = {
  name: "Tumblr",
  category: "gifs",
  type: "scraping",

  async search(query): Promise<ConnectorResult> {
    const url = `https://www.tumblr.com/search/${encodeURIComponent(query)}/gif`;
    return scrapeConnector("Tumblr", scrapePage(url, "article, [data-type='photo']"), ($) => {
      const items: any[] = [];
      $("article a[href*='tumblr.com']").each((_, el) => {
        const href = $(el).attr("href") ?? "";
        const img = $(el).find("img").first();
        const src = img.attr("src") || img.attr("data-src") || "";
        const title = img.attr("alt") || $(el).attr("title") || "Tumblr GIF";
        if (href && src && (src.includes(".gif") || src.includes("tumblr"))) {
          items.push({
            id: href,
            title,
            url: href,
            thumbnailUrl: src,
            source: "Tumblr",
            category: "gifs",
          });
        }
      });
      return [...new Map(items.map((i) => [i.id, i])).values()];
    });
  },
};

export default tumblr;
