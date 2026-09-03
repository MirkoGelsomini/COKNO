import { Connector, ConnectorResult, fetchJsonConnector } from "../types";

const openverse: Connector = {
  name: "Openverse",
  category: "images",
  type: "api",

  async search(query, page = 1): Promise<ConnectorResult> {
    const url = `https://api.openverse.org/v1/images/?q=${encodeURIComponent(query)}&page_size=12&page=${page}`;
    return fetchJsonConnector(
      "Openverse",
      url,
      (data) => ({
        total: data.result_count ?? 0,
        items: (data.results ?? []).map((r: any) => ({
          id: r.id,
          title: r.title || "Openverse image",
          url: r.foreign_landing_url || r.url,
          thumbnailUrl: r.thumbnail,
          author: r.creator,
          source: "Openverse",
          category: "images",
          tags: (r.tags ?? []).map((t: any) => t.name ?? t),
        })),
      }),
      { headers: { "User-Agent": "Cokno/1.0" } }
    );
  },
};

export default openverse;
