import { Connector, ConnectorResult, fetchJsonConnector } from "../types";

const polyhaven: Connector = {
  name: "Poly Haven",
  category: "models3d",
  type: "api",

  async search(query, page = 1): Promise<ConnectorResult> {
    return fetchJsonConnector("Poly Haven", "https://api.polyhaven.com/assets?t=models", (data) => {
      const terms = query.toLowerCase().split(/\s+/);
      const matched = Object.entries(data)
        .filter(([slug, asset]: [string, any]) => {
          const text = `${slug} ${asset.name ?? ""} ${(asset.tags ?? []).join(" ")} ${(asset.categories ?? []).join(" ")}`.toLowerCase();
          return terms.some((t) => text.includes(t));
        })
        .map(([slug, asset]: [string, any]) => ({
          id: slug,
          title: asset.name ?? slug,
          url: `https://polyhaven.com/a/${slug}`,
          thumbnailUrl: `https://cdn.polyhaven.com/asset_img/thumbs/${slug}.png?height=200`,
          tags: asset.tags ?? [],
          source: "Poly Haven",
          category: "models3d" as const,
        }));

      const pageSize = 12;
      return { total: matched.length, items: matched.slice((page - 1) * pageSize, page * pageSize) };
    });
  },
};

export default polyhaven;
