import { Connector, ConnectorResult, safeResult, fetchJsonConnector } from "../types";

const vimeo: Connector = {
  name: "Vimeo",
  category: "videos",
  type: "api",

  async search(query, page = 1): Promise<ConnectorResult> {
    const token = process.env.VIMEO_ACCESS_TOKEN;
    if (!token) return safeResult("Vimeo", "VIMEO_ACCESS_TOKEN not set");

    const url = `https://api.vimeo.com/videos?query=${encodeURIComponent(query)}&per_page=12&page=${page}&fields=uri,name,description,link,pictures,user`;
    return fetchJsonConnector(
      "Vimeo",
      url,
      (data) => {
        const terms = query.toLowerCase().split(/\s+/);
        const items = (data.data ?? [])
          .map((v: any) => ({
            id: v.uri,
            title: v.name ?? "Vimeo video",
            url: v.link,
            thumbnailUrl: v.pictures?.sizes?.[3]?.link,
            description: v.description,
            author: v.user?.name,
            source: "Vimeo",
            category: "videos",
          }))
          .filter((item: any) => {
            const text = `${item.title} ${item.description ?? ""}`.toLowerCase();
            return terms.some((t) => text.includes(t));
          });
        return { total: items.length, items };
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );
  },
};

export default vimeo;
