import { plainFetchPage } from "../../utils/browser";
import { Connector, ConnectorResult, scrapeConnector } from "../types";

const cambridge: Connector = {
  name: "Cambridge Dictionary",
  category: "texts",
  type: "scraping",

  async search(query): Promise<ConnectorResult> {
    const word = query.trim().split(/\s+/)[0];
    const url = `https://dictionary.cambridge.org/dictionary/english/${encodeURIComponent(word)}`;
    return scrapeConnector("Cambridge Dictionary", plainFetchPage(url), ($) => {
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
      return items.slice(0, 12);
    });
  },
};

export default cambridge;
