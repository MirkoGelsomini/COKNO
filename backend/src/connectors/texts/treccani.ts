import { scrapePage } from "../../utils/browserLimited";
import { Connector, ConnectorResult, scrapeConnector } from "../types";

const treccani: Connector = {
  name: "Treccani",
  category: "texts",
  type: "scraping",

  async search(query): Promise<ConnectorResult> {
    const url = `https://www.treccani.it/vocabolario/ricerca/${encodeURIComponent(query)}/`;
    return scrapeConnector(
      "Treccani",
      scrapePage(url, "a[href*='/vocabolario/'], a[href*='/enciclopedia/']"),
      ($) => {
        const items: any[] = [];
        // Nav links ("Indietro", "Avanti"...) and the bare no-results fallback link share the
        // same href pattern as real entries — filter both out by title/href shape.
        const NAV_TITLES = new Set(["indietro", "avanti", "successivo", "precedente", "vai", "cerca", "home", "vocabolario", "enciclopedia"]);
        const isBareSectionLink = (href: string) => /^\/(vocabolario|enciclopedia)\/?$/.test(href);

        $("li a[href*='/vocabolario/'], li a[href*='/enciclopedia/']").each((_, el) => {
          const href = $(el).attr("href") ?? "";
          const title = $(el).text().trim();
          const description = $(el).closest("li").find("p, .abstract, span").not($(el)).first().text().trim();
          if (
            href &&
            title &&
            title.length > 1 &&
            title.length < 120 &&
            !NAV_TITLES.has(title.toLowerCase()) &&
            !isBareSectionLink(href)
          ) {
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

        return [...new Map(items.map((i) => [i.id, i])).values()].slice(0, 12);
      }
    );
  },
};

export default treccani;
