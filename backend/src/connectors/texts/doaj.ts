import { Connector, ConnectorResult, fetchJsonConnector } from "../types";

const doaj: Connector = {
  name: "DOAJ",
  category: "texts",
  type: "api",

  async search(query, page = 1): Promise<ConnectorResult> {
    const url =
      `https://doaj.org/api/search/articles/${encodeURIComponent(query)}` +
      `?pageSize=12&page=${page}`;
    return fetchJsonConnector("DOAJ", url, (data) => {
      const items = (data.results ?? [])
        .filter((r: any) => r.bibjson?.title)
        .map((r: any) => {
          const bib = r.bibjson;
          const link = bib.link?.find((l: any) => l.type === "fulltext") ?? bib.link?.[0];
          return {
            id: r.id,
            title: bib.title,
            url: link?.url ?? `https://doaj.org/article/${r.id}`,
            description: bib.abstract ? bib.abstract.slice(0, 200) + "…" : undefined,
            author: bib.author?.[0]?.name,
            source: "DOAJ",
            category: "texts",
          };
        });
      return { total: data.total?.value ?? data.total ?? items.length, items };
    });
  },
};

export default doaj;
