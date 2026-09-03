import { Connector, ConnectorResult, fetchJsonConnector } from "../types";

const base: Connector = {
  name: "BASE",
  category: "texts",
  type: "api",

  async search(query, page = 1): Promise<ConnectorResult> {
    const offset = (page - 1) * 12;
    const url =
      `https://api.base-search.net/cgi-bin/BaseHttpSearchInterface.fcgi` +
      `?func=PerformSearch&query=${encodeURIComponent(query)}&hits=12&offset=${offset}&fmt=json`;
    return fetchJsonConnector("BASE", url, (data) => {
      const items = (data.response?.docs ?? [])
        .filter((d: any) => d.dctitle)
        .map((d: any) => ({
          id: d.dcidentifier?.[0] ?? d.dctitle,
          title: Array.isArray(d.dctitle) ? d.dctitle[0] : d.dctitle,
          url: d.dclink ?? d.dcidentifier?.[0] ?? `https://www.base-search.net/Search/Results?lookfor=${encodeURIComponent(query)}`,
          description: Array.isArray(d.dcdescription) ? d.dcdescription[0]?.slice(0, 200) : d.dcdescription?.slice(0, 200),
          author: Array.isArray(d.dccreator) ? d.dccreator[0] : d.dccreator,
          source: "BASE",
          category: "texts",
        }));
      return { total: data.response?.numFound ?? items.length, items };
    });
  },
};

export default base;
