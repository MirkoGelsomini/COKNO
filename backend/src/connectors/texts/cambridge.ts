import * as cheerio from "cheerio";
import { plainFetchPage } from "../../utils/browser";
import { Connector, ConnectorResult, safeResult } from "../types";

const cambridge: Connector = {
  name: "Cambridge Dictionary",
  category: "texts",
  type: "scraping",

  async search(query): Promise<ConnectorResult> {
    try {
      const word = query.trim().split(/\s+/)[0];
      const url = `https://dictionary.cambridge.org/dictionary/english/${encodeURIComponent(word)}`;
      const html = await plainFetchPage(url);
      const $ = cheerio.load(html);
      const items: any[] = [];

      $(".entry-body__el").each((_, el) => {
        const headword = $(".dhw, .hw", el).first().text().trim();
        const partOfSpeech = $(".pos", el).first().text().trim();
        const definition = $(".def", el).first().text().trim();
        const example = $(".eg", el).first().text().trim();
        if (headword && definition) {
          items.push({
            id: `cambridge-${headword}-${items.length}`,
            title: partOfSpeech ? `${headword} (${partOfSpeech})` : headword,
            url,
            description: definition + (example ? ` — "${example}"` : ""),
            source: "Cambridge Dictionary",
            category: "texts",
          });
        }
      });

      return { source: "Cambridge Dictionary", total: items.length, items: items.slice(0, 12) };
    } catch (err) {
      return safeResult("Cambridge Dictionary", err);
    }
  },
};

export default cambridge;
