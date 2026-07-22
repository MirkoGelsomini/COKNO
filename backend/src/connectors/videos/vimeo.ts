import { Connector, ConnectorResult, safeResult } from "../types";

const vimeo: Connector = {
  name: "Vimeo",
  category: "videos",
  type: "api",

  async search(query, page = 1): Promise<ConnectorResult> {
    const token = process.env.VIMEO_ACCESS_TOKEN;
    if (!token) return safeResult("Vimeo", "VIMEO_ACCESS_TOKEN not set");

    try {
      const url = `https://api.vimeo.com/videos?query=${encodeURIComponent(query)}&per_page=12&page=${page}&fields=uri,name,description,link,pictures,user`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json() as any;
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

      return { source: "Vimeo", total: items.length, items };
    } catch (err) {
      return safeResult("Vimeo", err);
    }
  },
};

export default vimeo;
