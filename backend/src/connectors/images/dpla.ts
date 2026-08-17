import { Connector, ConnectorResult, safeResult, fetchJsonConnector } from "../types";

const dpla: Connector = {
  name: "DPLA",
  category: "images",
  type: "api",

  async search(query, page = 1): Promise<ConnectorResult> {
    const key = process.env.DPLA_API_KEY;
    if (!key) return safeResult("DPLA", "DPLA_API_KEY not set");

    const url =
      `https://api.dp.la/v2/items?q=${encodeURIComponent(query)}` +
      `&api_key=${key}&page_size=12&page=${page}&sourceResource.type=image`;
    return fetchJsonConnector("DPLA", url, (data) => {
      const items = (data.docs ?? [])
        .map((doc: any) => {
          const sr = doc.sourceResource ?? {};
          const title = Array.isArray(sr.title) ? sr.title[0] : sr.title;
          if (!title) return null;
          return {
            id: doc.id,
            title: title || "DPLA item",
            url: doc.isShownAt,
            thumbnailUrl: doc.object,
            description: Array.isArray(sr.description) ? sr.description[0] : sr.description,
            author: Array.isArray(sr.creator) ? sr.creator[0] : sr.creator,
            source: "DPLA",
            category: "images",
          };
        })
        .filter(Boolean);
      return { total: data.count ?? items.length, items };
    });
  },
};

export default dpla;
