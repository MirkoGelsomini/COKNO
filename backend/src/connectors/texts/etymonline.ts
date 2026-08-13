import * as cheerio from "cheerio";
import { plainFetchPage } from "../../utils/browser";
import { Connector, ConnectorResult, safeResult } from "../types";

const etymonline: Connector = {
  name: "Etymonline",
  category: "texts",
  type: "scraping",

  async search(query): Promise<ConnectorResult> {
    try {
      const url = `https://www.etymonline.com/search?q=${encodeURIComponent(query)}`;
      const html = await plainFetchPage(url);
      const $ = cheerio.load(html);
      const items: any[] = [];
      // Each word card ends with a "Related entries & more" link pointing at the same
      // /word/ href as the real entry — it matches the same selector as a genuine title,
      // so it has to be filtered out by text rather than by structure.
      const JUNK_TITLES = /related entries|remove ads|advertisement/i;

      $("section, article, [class*='word']").each((_, el) => {
        const link = $(el).find("a[href*='/word/']").first();
        const href = link.attr("href") ?? "";
        const title = link.find("[class*='name'], strong, h3").first().text().trim() || link.text().trim();
        // Each entry's markup includes a "Remove Ads" prompt as a <p> before the actual
        // definition, so grabbing the first match picks up ad copy instead — skip anything
        // too short or matching known boilerplate and take the first real paragraph.
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

      const unique = [...new Map(items.map((i) => [i.id, i])).values()];
      return { source: "Etymonline", total: unique.length, items: unique.slice(0, 12) };
    } catch (err) {
      return safeResult("Etymonline", err);
    }
  },
};

export default etymonline;
