import { Connector, ConnectorResult, fetchJsonConnector } from "../types";

const wikisource: Connector = {
  name: "Wikisource",
  category: "texts",
  type: "api",

  async search(query, page = 1): Promise<ConnectorResult> {
    const offset = (page - 1) * 12;
    const url =
      `https://en.wikisource.org/w/api.php?action=query&list=search` +
      `&srsearch=${encodeURIComponent(query)}&srlimit=12&sroffset=${offset}&format=json&origin=*`;
    return fetchJsonConnector("Wikisource", url, (data) => ({
      total: data.query?.searchinfo?.totalhits ?? 0,
      items: (data.query?.search ?? []).map((r: any) => ({
        id: String(r.pageid),
        title: r.title,
        url: `https://en.wikisource.org/wiki/${encodeURIComponent(r.title.replace(/ /g, "_"))}`,
        description: r.snippet?.replace(/<[^>]+>/g, ""),
        source: "Wikisource",
        category: "texts",
      })),
    }));
  },
};

export default wikisource;
