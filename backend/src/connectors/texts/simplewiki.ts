import { Connector, ConnectorResult, fetchJsonConnector, stripHtml } from "../types";

const simplewiki: Connector = {
  name: "Simple Wikipedia",
  category: "texts",
  type: "api",

  async search(query, page = 1): Promise<ConnectorResult> {
    const offset = (page - 1) * 12;
    const url =
      `https://simple.wikipedia.org/w/api.php?action=query&list=search` +
      `&srsearch=${encodeURIComponent(query)}&srlimit=12&sroffset=${offset}&format=json&origin=*`;
    return fetchJsonConnector("Simple Wikipedia", url, (data) => ({
      total: data.query?.searchinfo?.totalhits ?? 0,
      items: (data.query?.search ?? []).map((r: any) => ({
        id: String(r.pageid),
        title: r.title,
        url: `https://simple.wikipedia.org/wiki/${encodeURIComponent(r.title.replace(/ /g, "_"))}`,
        description: stripHtml(r.snippet),
        source: "Simple Wikipedia",
        category: "texts",
      })),
    }));
  },
};

export default simplewiki;
