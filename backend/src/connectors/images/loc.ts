import { Connector, ConnectorResult, fetchJsonConnector } from "../types";

const loc: Connector = {
  name: "Library of Congress",
  category: "images",
  type: "api",

  async search(query, page = 1): Promise<ConnectorResult> {
    const url =
      `https://www.loc.gov/search/?q=${encodeURIComponent(query)}` +
      `&fo=json&c=12&sp=${page}&fa=online-format:image`;
    return fetchJsonConnector(
      "Library of Congress",
      url,
      (data) => {
        const items = (data.results ?? [])
          .map((item: any) => {
            const thumb = item.image_url?.[0] || item.aka?.[0] || undefined;
            const title = Array.isArray(item.title) ? item.title[0] : item.title;
            if (!title) return null;
            return {
              id: item.id ?? item.url,
              title: title || "Library of Congress",
              url: item.url ?? item.id,
              thumbnailUrl: thumb,
              description: item.description?.[0],
              source: "Library of Congress",
              category: "images",
            };
          })
          .filter(Boolean);
        return { total: data.pagination?.of ?? items.length, items };
      },
      { headers: { Accept: "application/json" } }
    );
  },
};

export default loc;
