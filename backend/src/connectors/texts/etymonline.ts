import { plainFetchPage } from "../../utils/browser";
import { Connector, ConnectorResult, scrapeConnector } from "../types";

const etymonline: Connector = {
  name: "Etymonline",
  category: "texts",
  type: "scraping",

  async search(query): Promise<ConnectorResult> {
    const url = `https://www.etymonline.com/search?q=${encodeURIComponent(query)}`;
    return scrapeConnector("Etymonline", plainFetchPage(url), ($) => {
      const items: any[] = [];
      // "Related entries & more" links match the same /word/ selector as real titles
      const JUNK_TITLES = /related entries|remove ads|advertisement/i;

      $("section, article, [class*='word']").each((_, el) => {
        const link = $(el).find("a[href*='/word/']").first();
        const href = link.attr("href") ?? "";
        const title = link.find("[class*='name'], strong, h3").first().text().trim() || link.text().trim();
        // Skip the "Remove Ads" boilerplate paragraph, take the first real one
        const description = $(el)
          .find("p, [class*='def']")
          .toArray()
          .map((p) => $(p).text().trim())
          .find((text) => text.length > 15 && !/remove ads|advertisement|premium member/i.test(text));
        if (href && title && title.length < 80 && !JUNK_TITLES.test(title)) {
          items.push({
            id: href,
            title,
            url: href.startsWith("http") ? href : `https://www.etymonline.com${href}`,
            description: description || undefined,
            source: "Etymonline",
            category: "texts",
          });
        }
      });

      return [...new Map(items.map((i) => [i.id, i])).values()].slice(0, 12);
    });
  },
};

export default etymonline;
