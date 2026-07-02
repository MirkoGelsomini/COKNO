import { Connector, ConnectorResult, safeResult } from "../types";

// OpenAlex — open academic paper index, no key required
const openalex: Connector = {
  name: "OpenAlex",
  category: "texts",
  type: "api",

  async search(query, page = 1): Promise<ConnectorResult> {
    try {
      const url =
        `https://api.openalex.org/works?search=${encodeURIComponent(query)}&per-page=12&page=${page}` +
        `&select=id,title,doi,authorships,publication_year,primary_location`;
      const res = await fetch(url, {
        headers: { "User-Agent": "Cokno/1.0 (mailto:cokno@example.com)" },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json() as any;
      return {
        source: "OpenAlex",
        total: data.meta?.count ?? 0,
        items: (data.results ?? []).map((w: any) => {
          const author = w.authorships?.[0]?.author?.display_name;
          const doiUrl = w.doi ? `https://doi.org/${w.doi.replace("https://doi.org/", "")}` : null;
          const landingUrl = w.primary_location?.landing_page_url;
          return {
            id: w.id,
            title: w.title ?? "Academic paper",
            url: doiUrl ?? landingUrl ?? w.id,
            description: w.publication_year ? `Published ${w.publication_year}` : undefined,
            author,
            source: "OpenAlex",
            category: "texts",
          };
        }),
      };
    } catch (err) {
      return safeResult("OpenAlex", err);
    }
  },
};

export default openalex;
