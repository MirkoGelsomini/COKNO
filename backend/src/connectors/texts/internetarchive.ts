import { Connector, ConnectorResult, safeResult } from "../types";

const internetarchive: Connector = {
  name: "Internet Archive",
  category: "texts",
  type: "api",

  async search(query, page = 1): Promise<ConnectorResult> {
    try {
      const start = (page - 1) * 12;
      const url =
        `https://archive.org/advancedsearch.php` +
        `?q=${encodeURIComponent(query)}+AND+mediatype%3Atexts` +
        `&fl=identifier,title,creator,description&rows=12&start=${start}&output=json`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json() as any;
      const docs = data.response?.docs ?? [];

      const items = docs
        .filter((d: any) => d.identifier && d.title)
        .map((d: any) => ({
          id: d.identifier,
          title: Array.isArray(d.title) ? d.title[0] : d.title,
          url: `https://archive.org/details/${d.identifier}`,
          thumbnailUrl: `https://archive.org/services/img/${d.identifier}`,
          description: Array.isArray(d.description) ? d.description[0] : d.description,
          author: Array.isArray(d.creator) ? d.creator[0] : d.creator,
          source: "Internet Archive",
          category: "texts",
        }));

      return { source: "Internet Archive", total: data.response?.numFound ?? items.length, items };
    } catch (err) {
      return safeResult("Internet Archive", err);
    }
  },
};

export default internetarchive;
