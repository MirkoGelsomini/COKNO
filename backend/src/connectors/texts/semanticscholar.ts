import { Connector, ConnectorResult, fetchJsonConnector } from "../types";

const semanticscholar: Connector = {
  name: "Semantic Scholar",
  category: "texts",
  type: "api",

  async search(query, page = 1): Promise<ConnectorResult> {
    const offset = (page - 1) * 12;
    const url =
      `https://api.semanticscholar.org/graph/v1/paper/search` +
      `?query=${encodeURIComponent(query)}&limit=12&offset=${offset}` +
      `&fields=title,url,abstract,authors,year`;
    return fetchJsonConnector("Semantic Scholar", url, (data) => {
      const items = (data.data ?? [])
        .filter((p: any) => p.title)
        .map((p: any) => ({
          id: p.paperId,
          title: p.title,
          url: p.url ?? `https://www.semanticscholar.org/paper/${p.paperId}`,
          description: p.abstract ? p.abstract.slice(0, 200) + "…" : p.year ? `Published ${p.year}` : undefined,
          author: p.authors?.[0]?.name,
          source: "Semantic Scholar",
          category: "texts",
        }));
      return { total: data.total ?? items.length, items };
    });
  },
};

export default semanticscholar;
