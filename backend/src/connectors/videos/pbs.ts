import * as cheerio from "cheerio";
import { scrapePage } from "../../utils/browserLimited";
import { Connector, ConnectorResult, safeResult } from "../types";

const pbs: Connector = {
  name: "PBS Learning Media",
  category: "videos",
  type: "scraping",

  async search(query): Promise<ConnectorResult> {
    try {
      const url = `https://www.pbslearningmedia.org/search/?q=${encodeURIComponent(query)}`;
      const html = await scrapePage(url, "a[href*='/resource/']");
      const $ = cheerio.load(html);
      const items: any[] = [];

      $("a[href*='/resource/']").each((_, el) => {
        const href = $(el).attr("href") ?? "";
        if (!href.includes("/resource/")) return;
        const img = $(el).find("img").first();
        const src = img.attr("src") || img.attr("data-src") || "";
        const title = img.attr("alt") || $(el).find("h3, h2, .title").first().text().trim();
        if (href && title) {
          items.push({
            id: href,
            title,
            url: href.startsWith("http") ? href : `https://www.pbslearningmedia.org${href}`,
            thumbnailUrl: src || undefined,
            source: "PBS Learning Media",
            category: "videos",
          });
        }
      });

      const unique = [...new Map(items.map((i) => [i.id, i])).values()];
      return { source: "PBS Learning Media", total: unique.length, items: unique };
    } catch (err) {
      return safeResult("PBS Learning Media", err);
    }
  },
};

export default pbs;
