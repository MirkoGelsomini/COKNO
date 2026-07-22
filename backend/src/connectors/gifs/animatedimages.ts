import * as cheerio from "cheerio";
import { scrapePage } from "../../utils/browserLimited";
import { Connector, ConnectorResult, safeResult } from "../types";

const animatedimages: Connector = {
  name: "AnimatedImages",
  category: "gifs",
  type: "scraping",

  async search(query): Promise<ConnectorResult> {
    try {
      const url = `https://www.animatedimages.org/search.php?search=${encodeURIComponent(query)}`;
      const html = await scrapePage(url, "img[src*='.gif']");
      const $ = cheerio.load(html);
      const items: any[] = [];

      $("a[href]").each((_, el) => {
        const href = $(el).attr("href") ?? "";
        const img = $(el).find("img").first();
        const src = img.attr("src") || "";
        const title = img.attr("alt") || $(el).attr("title") || "";
        if (src && (src.includes(".gif") || href.includes(".gif"))) {
          const gifUrl = src.includes(".gif") ? src : href;
          items.push({
            id: gifUrl,
            title: title || "AnimatedImages GIF",
            url: href.startsWith("http") ? href : `https://www.animatedimages.org${href}`,
            thumbnailUrl: src.startsWith("http") ? src : `https://www.animatedimages.org${src}`,
            source: "AnimatedImages",
            category: "gifs",
          });
        }
      });

      const unique = [...new Map(items.map((i) => [i.id, i])).values()];
      return { source: "AnimatedImages", total: unique.length, items: unique };
    } catch (err) {
      return safeResult("AnimatedImages", err);
    }
  },
};

export default animatedimages;
