import { Connector, ConnectorResult, safeResult } from "../types";

const nasa: Connector = {
  name: "NASA Images",
  category: "images",
  type: "api",

  async search(query, page = 1): Promise<ConnectorResult> {
    try {
      const url =
        `https://images-api.nasa.gov/search?q=${encodeURIComponent(query)}` +
        `&media_type=image&page=${page}&page_size=12`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json() as any;
      const collection = data?.collection ?? {};
      const rawItems = collection.items ?? [];

      const items = rawItems
        .map((entry: any) => {
          const meta = entry.data?.[0];
          const link = entry.links?.find((l: any) => l.rel === "preview");
          if (!meta || !link) return null;
          return {
            id: meta.nasa_id,
            title: meta.title || "NASA Image",
            url: `https://images.nasa.gov/details/${meta.nasa_id}`,
            thumbnailUrl: link.href,
            description: meta.description,
            author: meta.center,
            source: "NASA Images",
            category: "images",
          };
        })
        .filter(Boolean);

      return { source: "NASA Images", total: collection.metadata?.total_hits ?? items.length, items };
    } catch (err) {
      return safeResult("NASA Images", err);
    }
  },
};

export default nasa;
