import { Connector, ConnectorResult, fetchJsonConnector } from "../types";

const wikimedia: Connector = {
  name: "Wikimedia",
  category: "images",
  type: "api",

  async search(query, page = 1): Promise<ConnectorResult> {
    const offset = (page - 1) * 12;
    const url =
      `https://commons.wikimedia.org/w/api.php?action=query&generator=search` +
      `&gsrsearch=${encodeURIComponent(query)}&gsrnamespace=6&gsrlimit=12&gsroffset=${offset}` +
      `&prop=imageinfo&iiprop=url|thumburl|extmetadata&format=json&origin=*`;
    return fetchJsonConnector("Wikimedia", url, (data) => {
      const pages = Object.values(data.query?.pages ?? {}) as any[];
      const items = pages
        .filter((p: any) => p.imageinfo?.[0]?.url)
        .map((p: any) => {
          const info = p.imageinfo[0];
          const desc = info.extmetadata?.ImageDescription?.value?.replace(/<[^>]+>/g, "");
          return {
            id: String(p.pageid),
            title: p.title.replace("File:", ""),
            url: info.descriptionurl ?? info.url,
            thumbnailUrl: info.thumburl ?? info.url,
            description: desc,
            source: "Wikimedia",
            category: "images" as const,
          };
        });
      return { total: data.query?.searchinfo?.totalhits ?? items.length, items };
    });
  },
};

export default wikimedia;
