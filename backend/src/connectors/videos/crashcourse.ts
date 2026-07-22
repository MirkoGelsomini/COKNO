import * as cheerio from "cheerio";
import { scrapePage } from "../../utils/browserLimited";
import { Connector, ConnectorResult, safeResult } from "../types";

const crashcourse: Connector = {
  name: "CrashCourse",
  category: "videos",
  type: "scraping",

  async search(query): Promise<ConnectorResult> {
    try {
      const url = `https://thecrashcourse.com/topic/${encodeURIComponent(query.split(" ")[0].toLowerCase())}`;
      const html = await scrapePage(url, "a[href*='/courses/']");
      const $ = cheerio.load(html);
      const items: any[] = [];

      $("a[href*='/courses/']").each((_, el) => {
        const href = $(el).attr("href") ?? "";
        const img = $(el).find("img").first();
        const src = img.attr("src") || img.attr("data-src") || "";
        const title = img.attr("alt") || $(el).find("h3, h2, p").first().text().trim();
        if (href && title) {
          items.push({
            id: href,
            title,
            url: href.startsWith("http") ? href : `https://thecrashcourse.com${href}`,
            thumbnailUrl: src || undefined,
            source: "CrashCourse",
            category: "videos",
          });
        }
      });

      const unique = [...new Map(items.map((i) => [i.id, i])).values()];
      return { source: "CrashCourse", total: unique.length, items: unique };
    } catch (err) {
      return safeResult("CrashCourse", err);
    }
  },
};

export default crashcourse;
