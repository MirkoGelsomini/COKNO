import { Connector, ConnectorResult, safeResult } from "../types";

const loc: Connector = {
  name: "Library of Congress",
  category: "images",
  type: "api",

  async search(query, page = 1): Promise<ConnectorResult> {
    try {
      const url =
        `https://www.loc.gov/search/?q=${encodeURIComponent(query)}` +
        `&fo=json&c=12&sp=${page}&fa=online-format:image`;
      const res = await fetch(url, {
        headers: { Accept: "application/json" },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json() as any;
      const results = data.results ?? [];

      const items = results
        .map((item: any) => {
          const thumb =
            item.image_url?.[0] ||
            item.aka?.[0] ||
            undefined;
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

      return { source: "Library of Congress", total: data.pagination?.of ?? items.length, items };
    } catch (err) {
      return safeResult("Library of Congress", err);
    }
  },
};

export default loc;
