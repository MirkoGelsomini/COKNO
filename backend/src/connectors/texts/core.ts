import { Connector, ConnectorResult, safeResult } from "../types";

const core: Connector = {
  name: "CORE",
  category: "texts",
  type: "api",

  async search(query, page = 1): Promise<ConnectorResult> {
    const key = process.env.CORE_API_KEY;
    if (!key) return safeResult("CORE", "CORE_API_KEY not set");

    try {
      const offset = (page - 1) * 12;
      const url = `https://api.core.ac.uk/v3/search/works?q=${encodeURIComponent(query)}&limit=12&offset=${offset}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${key}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json() as any;
      const items = (data.results ?? [])
        .filter((r: any) => r.title)
        .map((r: any) => ({
          id: String(r.id),
          title: r.title,
          url: r.downloadUrl ?? (r.doi ? `https://doi.org/${r.doi}` : `https://core.ac.uk/works/${r.id}`),
          description: r.abstract ? r.abstract.slice(0, 200) + "…" : r.year ? `Published ${r.year}` : undefined,
          author: r.authors?.[0]?.name,
          source: "CORE",
          category: "texts",
        }));

      return { source: "CORE", total: data.totalHits ?? items.length, items };
    } catch (err) {
      return safeResult("CORE", err);
    }
  },
};

export default core;
