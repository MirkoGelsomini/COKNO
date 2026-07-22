import { Connector, ConnectorResult, safeResult } from "../types";

const wikisource: Connector = {
  name: "Wikisource",
  category: "texts",
  type: "api",

  async search(query, page = 1): Promise<ConnectorResult> {
    try {
      const offset = (page - 1) * 12;
      const url =
        `https://en.wikisource.org/w/api.php?action=query&list=search` +
        `&srsearch=${encodeURIComponent(query)}&srlimit=12&sroffset=${offset}&format=json&origin=*`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json() as any;
      const results = data.query?.search ?? [];

      const items = results.map((r: any) => ({
        id: String(r.pageid),
        title: r.title,
        url: `https://en.wikisource.org/wiki/${encodeURIComponent(r.title.replace(/ /g, "_"))}`,
        description: r.snippet?.replace(/<[^>]+>/g, ""),
        source: "Wikisource",
        category: "texts",
      }));

      return { source: "Wikisource", total: data.query?.searchinfo?.totalhits ?? 0, items };
    } catch (err) {
      return safeResult("Wikisource", err);
    }
  },
};

export default wikisource;
