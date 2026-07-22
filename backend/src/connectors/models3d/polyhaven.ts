import { Connector, ConnectorResult, safeResult } from "../types";

const polyhaven: Connector = {
  name: "Poly Haven",
  category: "models3d",
  type: "api",

  async search(query, page = 1): Promise<ConnectorResult> {
    try {
      const res = await fetch("https://api.polyhaven.com/assets?t=models");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json() as any;
      const terms = query.toLowerCase().split(/\s+/);

      const matched = Object.entries(data)
        .filter(([slug, asset]: [string, any]) => {
          const text = `${slug} ${asset.name ?? ""} ${(asset.tags ?? []).join(" ")} ${(asset.categories ?? []).join(" ")}`.toLowerCase();
          return terms.some((t) => text.includes(t));
        })
        .map(([slug, asset]: [string, any]) => ({
          id: slug,
          title: (asset as any).name ?? slug,
          url: `https://polyhaven.com/a/${slug}`,
          thumbnailUrl: `https://cdn.polyhaven.com/asset_img/thumbs/${slug}.png?height=200`,
          tags: (asset as any).tags ?? [],
          source: "Poly Haven",
          category: "models3d" as const,
        }));

      const pageSize = 12;
      const slice = matched.slice((page - 1) * pageSize, page * pageSize);
      return { source: "Poly Haven", total: matched.length, items: slice };
    } catch (err) {
      return safeResult("Poly Haven", err);
    }
  },
};

export default polyhaven;
