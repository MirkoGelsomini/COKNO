import { Connector, ConnectorResult, fetchJsonConnector } from "../types";

const internetarchive: Connector = {
  name: "Internet Archive",
  category: "texts",
  type: "api",

  async search(query, page = 1): Promise<ConnectorResult> {
    const start = (page - 1) * 12;
    const url =
      `https://archive.org/advancedsearch.php` +
      `?q=${encodeURIComponent(query)}+AND+mediatype%3Atexts` +
      `&fl=identifier,title,creator,description&rows=12&start=${start}&output=json`;
    return fetchJsonConnector("Internet Archive", url, (data) => {
      const items = (data.response?.docs ?? [])
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
      return { total: data.response?.numFound ?? items.length, items };
    });
  },
};

export default internetarchive;
