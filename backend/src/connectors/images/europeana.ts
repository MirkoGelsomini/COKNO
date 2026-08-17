import { Connector, ConnectorResult, safeResult, fetchJsonConnector } from "../types";

const europeana: Connector = {
  name: "Europeana",
  category: "images",
  type: "api",

  async search(query, page = 1): Promise<ConnectorResult> {
    const key = process.env.EUROPEANA_API_KEY;
    if (!key) return safeResult("Europeana", "EUROPEANA_API_KEY not set");

    const start = (page - 1) * 12 + 1;
    const url =
      `https://api.europeana.eu/record/v2/search.json?wskey=${key}` +
      `&query=${encodeURIComponent(query)}&rows=12&start=${start}` +
      `&reusability=open&media=true&qf=TYPE%3AIMAGE`;
    return fetchJsonConnector("Europeana", url, (data) => {
      const items = (data.items ?? [])
        .map((item: any) => {
          const thumb = item.edmPreview?.[0];
          const title = Array.isArray(item.title) ? item.title[0] : item.title;
          if (!thumb) return null;
          return {
            id: item.id,
            title: title || "Europeana item",
            url: item.guid ?? `https://www.europeana.eu/item${item.id}`,
            thumbnailUrl: thumb,
            author: item.dataProvider?.[0],
            source: "Europeana",
            category: "images",
          };
        })
        .filter(Boolean);
      return { total: data.totalResults ?? items.length, items };
    });
  },
};

export default europeana;
