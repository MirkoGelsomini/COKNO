import { plainFetchPage } from "../../utils/browser";
import { Connector, ConnectorResult, scrapeConnector } from "../types";

const stanfordPhilosophy: Connector = {
  name: "Stanford Encyclopedia of Philosophy",
  category: "texts",
  type: "scraping",

  async search(query): Promise<ConnectorResult> {
    const url = `https://plato.stanford.edu/search/searcher.py?query=${encodeURIComponent(query)}`;
    return scrapeConnector("Stanford Encyclopedia of Philosophy", plainFetchPage(url), ($) => {
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
      return [...new Map(items.map((i) => [i.id, i])).values()].slice(0, 12);
    });
  },
};

export default stanfordPhilosophy;
