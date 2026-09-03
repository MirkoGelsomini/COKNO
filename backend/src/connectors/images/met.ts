import { Connector, ConnectorResult, safeResult } from "../types";

const BASE = "https://collectionapi.metmuseum.org/public/collection/v1";

const met: Connector = {
  name: "The Met",
  category: "images",
  type: "api",

  async search(query, page = 1): Promise<ConnectorResult> {
    try {
      const searchRes = await fetch(
        `${BASE}/search?q=${encodeURIComponent(query)}&hasImages=true`
      );
      if (!searchRes.ok) throw new Error(`HTTP ${searchRes.status}`);
      const { objectIDs, total } = await searchRes.json() as any;
      if (!objectIDs?.length) return { source: "The Met", total: 0, items: [] };

      const pageSize = 12;
      const slice = objectIDs.slice((page - 1) * pageSize, page * pageSize);

      const settled = await Promise.allSettled(
        slice.map((id: number) => fetch(`${BASE}/objects/${id}`).then((r) => r.json()))
      );

      const items = settled
        .filter((r) => r.status === "fulfilled")
        .map((r: any) => {
          const obj = r.value;
          if (!obj.primaryImageSmall) return null;
          return {
            id: String(obj.objectID),
            title: obj.title || "The Met artwork",
            url: obj.objectURL,
            thumbnailUrl: obj.primaryImageSmall,
            author: obj.artistDisplayName || undefined,
            source: "The Met",
            category: "images" as const,
          };
        })
        .filter((x): x is NonNullable<typeof x> => x !== null);

      return { source: "The Met", total: total ?? items.length, items };
    } catch (err) {
      return safeResult("The Met", err);
    }
  },
};

export default met;
