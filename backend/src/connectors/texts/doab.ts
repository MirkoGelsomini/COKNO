import { Connector, ConnectorResult, fetchJsonConnector } from "../types";

const doab: Connector = {
  name: "DOAB",
  category: "texts",
  type: "api",

  async search(query, page = 1): Promise<ConnectorResult> {
    const offset = (page - 1) * 12;
    const url =
      `https://directory.doabooks.org/rest/search` +
      `?query=${encodeURIComponent(query)}&expand=metadata&limit=12&offset=${offset}`;
    return fetchJsonConnector(
      "DOAB",
      url,
      (data) => {
        const results = Array.isArray(data) ? data : (data.results ?? []);
        const items = results
          .filter((r: any) => r.name || r.metadata)
          .map((r: any) => {
            const meta = (r.metadata ?? []).reduce((acc: any, m: any) => {
              if (!acc[m.key]) acc[m.key] = m.value;
              return acc;
            }, {});
            const title = r.name || meta["dc.title"] || "DOAB book";
            const handle = r.handle ? `https://directory.doabooks.org/handle/${r.handle}` : undefined;
            return {
              id: r.handle ?? title,
              title,
              url: handle ?? `https://directory.doabooks.org/browse?type=title&value=${encodeURIComponent(title)}`,
              author: meta["dc.contributor.author"],
              description: meta["dc.description"]?.slice(0, 200),
              source: "DOAB",
              category: "texts",
            };
          });
        return { total: items.length, items };
      },
      { headers: { Accept: "application/json" } }
    );
  },
};

export default doab;
