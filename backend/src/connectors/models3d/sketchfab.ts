import { Connector, ConnectorResult, safeResult } from "../types";

// Sketchfab public API — no key required for basic search
const sketchfab: Connector = {
  name: "Sketchfab",
  category: "models3d",
  type: "api",

  async search(query, page = 1): Promise<ConnectorResult> {
    try {
      const cursor = (page - 1) * 12;
      const url = `https://api.sketchfab.com/v3/models?q=${encodeURIComponent(query)}&count=12&cursor=${cursor}&sort_by=-likeCount`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json() as any;
      return {
        source: "Sketchfab",
        total: data.results?.length ?? 0,
        items: (data.results ?? []).map((m: any) => ({
          id: m.uid,
          title: m.name ?? "3D Model",
          url: `https://sketchfab.com/models/${m.uid}`,
          thumbnailUrl: m.thumbnails?.images?.[0]?.url,
          description: m.description,
          author: m.user?.displayName,
          source: "Sketchfab",
          category: "models3d",
          tags: (m.tags ?? []).map((t: any) => t.name),
        })),
      };
    } catch (err) {
      return safeResult("Sketchfab", err);
    }
  },
};

export default sketchfab;
