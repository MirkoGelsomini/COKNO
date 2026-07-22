import * as cheerio from "cheerio";
import { scrapePage } from "../../utils/browserLimited";
import { Connector, ConnectorResult, safeResult } from "../types";

const lottiefiles: Connector = {
  name: "LottieFiles",
  category: "gifs",
  type: "scraping",

  async search(query): Promise<ConnectorResult> {
    try {
      const url = `https://lottiefiles.com/free-animations?search=${encodeURIComponent(query)}`;
      const html = await scrapePage(url, "a[href*='/animations/']");
      const $ = cheerio.load(html);
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

      const unique = [...new Map(items.map((i) => [i.id, i])).values()];
      return { source: "LottieFiles", total: unique.length, items: unique };
    } catch (err) {
      return safeResult("LottieFiles", err);
    }
  },
};

export default lottiefiles;
