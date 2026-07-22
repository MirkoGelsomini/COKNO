import * as cheerio from "cheerio";
import { plainFetchPage } from "../../utils/browser";
import { Connector, ConnectorResult, safeResult } from "../types";

const stanfordPhilosophy: Connector = {
  name: "Stanford Encyclopedia of Philosophy",
  category: "texts",
  type: "scraping",

  async search(query): Promise<ConnectorResult> {
    try {
      const url = `https://plato.stanford.edu/search/searcher.py?query=${encodeURIComponent(query)}`;
      const html = await plainFetchPage(url);
      const $ = cheerio.load(html);
      const items: any[] = [];

      $(".result_listing").each((_, el) => {
        const title = $(el).find(".result_title a").first().text().trim();
        const description = $(el).find(".result_snippet").first().text().trim().replace(/\s+/g, " ");
        const url = $(el).find(".result_url a").first().text().trim();
        if (title && url) {
          items.push({
            id: url,
            title,
            url,
            description: description || undefined,
            source: "Stanford Encyclopedia of Philosophy",
            category: "texts",
          });
        }
      });

      const unique = [...new Map(items.map((i) => [i.id, i])).values()];
      return { source: "Stanford Encyclopedia of Philosophy", total: unique.length, items: unique.slice(0, 12) };
    } catch (err) {
      return safeResult("Stanford Encyclopedia of Philosophy", err);
    }
  },
};

export default stanfordPhilosophy;
