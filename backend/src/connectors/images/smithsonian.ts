import { Connector, ConnectorResult, safeResult, fetchJsonConnector } from "../types";

const smithsonian: Connector = {
  name: "Smithsonian",
  category: "images",
  type: "api",

  async search(query, page = 1): Promise<ConnectorResult> {
    const key = process.env.SMITHSONIAN_API_KEY;
    if (!key) return safeResult("Smithsonian", "SMITHSONIAN_API_KEY not set");

    const start = (page - 1) * 12;
    const url =
      `https://api.si.edu/openaccess/api/v1.0/search` +
      `?api_key=${key}&q=${encodeURIComponent(query)}&rows=12&start=${start}&online_media_type=Images`;
    return fetchJsonConnector("Smithsonian", url, (data) => {
      const items = (data.response?.rows ?? [])
        .map((row: any) => {
          const dnr = row.content?.descriptiveNonRepeating;
          const media = dnr?.online_media?.media?.[0];
          if (!media?.thumbnail) return null;
          return {
            id: row.id,
            title: row.title || "Smithsonian item",
            url: dnr?.record_link ?? `https://collections.si.edu/search/results.htm?q=${row.id}`,
            thumbnailUrl: media.thumbnail,
            source: "Smithsonian",
            category: "images",
          };
        })
        .filter(Boolean);
      return { total: data.response?.rowCount ?? items.length, items };
    });
  },
};

export default smithsonian;
