import { Connector, ConnectorResult, fetchJsonConnector } from "../types";

const openalex: Connector = {
  name: "OpenAlex",
  category: "texts",
  type: "api",

  async search(query, page = 1): Promise<ConnectorResult> {
    const url =
      `https://api.openalex.org/works?search=${encodeURIComponent(query)}&per-page=12&page=${page}` +
      `&select=id,title,doi,authorships,publication_year,primary_location`;
    return fetchJsonConnector(
      "OpenAlex",
      url,
      (data) => ({
        total: data.meta?.count ?? 0,
        items: (data.results ?? []).map((w: any) => {
          const doiUrl = w.doi ? `https://doi.org/${w.doi.replace("https://doi.org/", "")}` : null;
          return {
            id: w.id,
            title: w.title ?? "Academic paper",
            url: doiUrl ?? w.primary_location?.landing_page_url ?? w.id,
            description: w.publication_year ? `Published ${w.publication_year}` : undefined,
            author: w.authorships?.[0]?.author?.display_name,
            source: "OpenAlex",
            category: "texts",
          };
        }),
      }),
      { headers: { "User-Agent": "Cokno/1.0 (mailto:cokno@example.com)" } }
    );
  },
};

export default openalex;
