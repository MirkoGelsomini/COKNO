import * as cheerio from "cheerio";
import { scrapePage } from "../../utils/browserLimited";
import { Connector, ConnectorResult, safeResult } from "../types";

const behance: Connector = {
  name: "Behance",
  category: "images",
  type: "scraping",

  async search(query): Promise<ConnectorResult> {
    try {
      const url = `https://www.behance.net/search/projects?search=${encodeURIComponent(query)}`;
      const html = await scrapePage(url, "a[href*='/gallery/']");
      const $ = cheerio.load(html);
      const items: any[] = [];

      $("a[href*='/gallery/']").each((_, el) => {
        const href = $(el).attr("href") ?? "";
        if (!href.match(/\/gallery\/\d+/)) return;
        const img = $(el).find("img").first();
        const src = img.attr("src") || img.attr("data-src") || "";
        const title = img.attr("alt") || $(el).find("h3, h2, .ProjectCoverNeue-title").first().text().trim();
        const author = $(el).find(".owners a, .profile-name").first().text().trim();
        if (href && title && src) {
          items.push({
            id: href,
            title,
            url: href.startsWith("http") ? href : `https://www.behance.net${href}`,
            thumbnailUrl: src,
            author: author || undefined,
            source: "Behance",
            category: "images",
          });
        }
      });

      const unique = [...new Map(items.map((i) => [i.id, i])).values()];
      return { source: "Behance", total: unique.length, items: unique };
    } catch (err) {
      return safeResult("Behance", err);
    }
  },
};

export default behance;
