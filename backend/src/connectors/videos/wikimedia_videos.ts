import { Connector, ConnectorResult, safeResult } from "../types";

const wikimediaVideos: Connector = {
  name: "Wikimedia Videos",
  category: "videos",
  type: "api",

  async search(query, page = 1): Promise<ConnectorResult> {
    try {
      const offset = (page - 1) * 12;
      const url =
        `https://commons.wikimedia.org/w/api.php?action=query&list=search` +
        `&srsearch=${encodeURIComponent(query)}+filetype:video&srnamespace=6` +
        `&srlimit=12&sroffset=${offset}&format=json&origin=*`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json() as any;
      const results = data.query?.search ?? [];

      const items = results.map((r: any) => {
        const filename = r.title.replace("File:", "");
        const encoded = encodeURIComponent(filename.replace(/ /g, "_"));
        return {
          id: String(r.pageid),
          title: filename,
          url: `https://commons.wikimedia.org/wiki/File:${encoded}`,
          description: r.snippet?.replace(/<[^>]+>/g, ""),
          source: "Wikimedia Videos",
          category: "videos",
        };
      });

      return { source: "Wikimedia Videos", total: data.query?.searchinfo?.totalhits ?? 0, items };
    } catch (err) {
      return safeResult("Wikimedia Videos", err);
    }
  },
};

export default wikimediaVideos;
