import { Connector, ConnectorResult, fetchJsonConnector } from "../types";

const openlibrary: Connector = {
  name: "Open Library",
  category: "texts",
  type: "api",

  async search(query, page = 1): Promise<ConnectorResult> {
    const url =
      `https://openlibrary.org/search.json` +
      `?q=${encodeURIComponent(query)}&limit=12&page=${page}&fields=key,title,author_name,first_publish_year,cover_i`;
    return fetchJsonConnector("Open Library", url, (data) => {
      const items = (data.docs ?? [])
        .filter((d: any) => d.title)
        .map((d: any) => ({
          id: d.key,
          title: d.title,
          url: `https://openlibrary.org${d.key}`,
          thumbnailUrl: d.cover_i ? `https://covers.openlibrary.org/b/id/${d.cover_i}-M.jpg` : undefined,
          author: d.author_name?.[0],
          description: d.first_publish_year ? `First published ${d.first_publish_year}` : undefined,
          source: "Open Library",
          category: "texts",
        }));
      return { total: data.numFound ?? items.length, items };
    });
  },
};

export default openlibrary;
