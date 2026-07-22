import * as cheerio from "cheerio";
import { Connector, ConnectorResult, safeResult } from "../types";

const arxiv: Connector = {
  name: "arXiv",
  category: "texts",
  type: "api",

  async search(query, page = 1): Promise<ConnectorResult> {
    try {
      const start = (page - 1) * 12;
      const url =
        `https://export.arxiv.org/api/query` +
        `?search_query=all:${encodeURIComponent(query)}&start=${start}&max_results=12`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const xml = await res.text();
      const $ = cheerio.load(xml, { xmlMode: true });
      const items: any[] = [];

      $("entry").each((_, el) => {
        const title = $("title", el).first().text().trim();
        const summary = $("summary", el).text().trim();
        const id = $("id", el).text().trim();
        const author = $("author name", el).first().text().trim();
        if (title && id) {
          items.push({
            id,
            title,
            url: id,
            description: summary.slice(0, 200) + (summary.length > 200 ? "…" : ""),
            author: author || undefined,
            source: "arXiv",
            category: "texts",
          });
        }
      });

      const totalMatch = $.root().find("opensearch\\:totalResults, totalResults").first().text();
      return { source: "arXiv", total: parseInt(totalMatch) || items.length, items };
    } catch (err) {
      return safeResult("arXiv", err);
    }
  },
};

export default arxiv;
