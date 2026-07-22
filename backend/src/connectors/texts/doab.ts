import { Connector, ConnectorResult, safeResult } from "../types";

const doab: Connector = {
  name: "DOAB",
  category: "texts",
  type: "api",

  async search(query, page = 1): Promise<ConnectorResult> {
    try {
      const offset = (page - 1) * 12;
      const url =
        `https://directory.doabooks.org/rest/search` +
        `?query=${encodeURIComponent(query)}&expand=metadata&limit=12&offset=${offset}`;
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json() as any;
      const results = Array.isArray(data) ? data : (data.results ?? []);

      const items = results
        .filter((r: any) => r.name || r.metadata)
        .map((r: any) => {
          const meta = (r.metadata ?? []).reduce((acc: any, m: any) => {
            if (!acc[m.key]) acc[m.key] = m.value;
            return acc;
          }, {});
          const title = r.name || meta["dc.title"] || "DOAB book";
          const author = meta["dc.contributor.author"];
          const handle = r.handle ? `https://directory.doabooks.org/handle/${r.handle}` : undefined;
          return {
            id: r.handle ?? title,
            title,
            url: handle ?? `https://directory.doabooks.org/browse?type=title&value=${encodeURIComponent(title)}`,
            author,
            description: meta["dc.description"]?.slice(0, 200),
            source: "DOAB",
            category: "texts",
          };
        });

      return { source: "DOAB", total: items.length, items };
    } catch (err) {
      return safeResult("DOAB", err);
    }
  },
};

export default doab;
