import { scrapePage } from "../../utils/browserLimited";
import { Connector, ConnectorResult, scrapeConnector } from "../types";

const lottiefiles: Connector = {
  name: "LottieFiles",
  category: "gifs",
  type: "scraping",

  async search(query): Promise<ConnectorResult> {
    const url = `https://lottiefiles.com/free-animations?search=${encodeURIComponent(query)}`;
    return scrapeConnector("LottieFiles", scrapePage(url, "a[href*='/animations/']"), ($) => {
      const items: any[] = [];
      $("a[href*='/animations/']").each((_, el) => {
        const href = $(el).attr("href") ?? "";
        const img = $(el).find("img, lottie-player").first();
        const src = img.attr("src") || img.attr("data-src") || img.attr("background") || "";
        const title = img.attr("alt") || $(el).find("h3, h2, p, [class*='name']").first().text().trim();
        if (href && title) {
          items.push({
            id: href,
            title,
            url: href.startsWith("http") ? href : `https://lottiefiles.com${href}`,
            thumbnailUrl: src || undefined,
            source: "LottieFiles",
            category: "gifs",
          });
        }
      });
      return [...new Map(items.map((i) => [i.id, i])).values()];
    });
  },
};

export default lottiefiles;
