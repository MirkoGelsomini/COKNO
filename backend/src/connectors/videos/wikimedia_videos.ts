import { Connector, ConnectorResult, fetchJsonConnector } from "../types";

const wikimediaVideos: Connector = {
  name: "Wikimedia Videos",
  category: "videos",
  type: "api",

  async search(query, page = 1): Promise<ConnectorResult> {
    const offset = (page - 1) * 12;
    const url =
      `https://commons.wikimedia.org/w/api.php?action=query&list=search` +
      `&srsearch=${encodeURIComponent(query)}+filetype:video&srnamespace=6` +
      `&srlimit=12&sroffset=${offset}&format=json&origin=*`;
    return fetchJsonConnector("Wikimedia Videos", url, (data) => {
      const items = (data.query?.search ?? []).map((r: any) => {
        const filename = r.title.replace("File:", "");
        const encoded = encodeURIComponent(filename.replace(/ /g, "_"));
        return {
          id: String(r.pageid),
          title: filename,
          url: `https://commons.wikimedia.org/wiki/File:${encoded}`,
          description: r.snippet?.replace(/<[^>]+>/g, ""),
          source: "Wikimedia Videos",
          category: "videos" as const,
        };
      });
      return { total: data.query?.searchinfo?.totalhits ?? 0, items };
    });
  },
};

export default wikimediaVideos;
