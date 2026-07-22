import { Connector, ConnectorResult, safeResult } from "../types";

const doaj: Connector = {
  name: "DOAJ",
  category: "texts",
  type: "api",

  async search(query, page = 1): Promise<ConnectorResult> {
    try {
      const url =
        `https://doaj.org/api/search/articles/${encodeURIComponent(query)}` +
        `?pageSize=12&page=${page}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json() as any;
      const results = data.results ?? [];

      const items = results
        .filter((r: any) => r.bibjson?.title)
        .map((r: any) => {
          const bib = r.bibjson;
          const link = bib.link?.find((l: any) => l.type === "fulltext") ?? bib.link?.[0];
          const author = bib.author?.[0]?.name;
          return {
            id: r.id,
            title: bib.title,
            url: link?.url ?? `https://doaj.org/article/${r.id}`,
            description: bib.abstract ? bib.abstract.slice(0, 200) + "…" : undefined,
            author,
            source: "DOAJ",
            category: "texts",
          };
        });

      return { source: "DOAJ", total: data.total?.value ?? data.total ?? items.length, items };
    } catch (err) {
      return safeResult("DOAJ", err);
    }
  },
};

export default doaj;
