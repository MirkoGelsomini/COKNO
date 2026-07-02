import * as cheerio from "cheerio";
import { scrapePage } from "../../utils/browser";
import { Connector, ConnectorResult, safeResult } from "../types";

const treccani: Connector = {
  name: "Treccani",
  category: "texts",
  type: "scraping",

  async search(query): Promise<ConnectorResult> {
    try {
      const url = `https://www.treccani.it/vocabolario/ricerca/${encodeURIComponent(query)}/`;
      const html = await scrapePage(url, "a[href*='/vocabolario/'], a[href*='/enciclopedia/']");
      const $ = cheerio.load(html);
      const items: any[] = [];

      $("li a[href*='/vocabolario/'], li a[href*='/enciclopedia/']").each((_, el) => {
        const href = $(el).attr("href") ?? "";
        const title = $(el).text().trim();
        const description = $(el).closest("li").find("p, .abstract, span").not($(el)).first().text().trim();
        if (href && title && title.length > 1 && title.length < 120) {
          items.push({
            id: href,
            title,
            url: href.startsWith("http") ? href : `https://www.treccani.it${href}`,
            description: description || undefined,
            source: "Treccani",
            category: "texts",
          });
        }
      });

      const unique = [...new Map(items.map((i) => [i.id, i])).values()];
      return { source: "Treccani", total: unique.length, items: unique.slice(0, 12) };
    } catch (err) {
      return safeResult("Treccani", err);
    }
  },
};

export default treccani;
