import { Connector, ConnectorResult, safeResult, fetchJsonConnector } from "../types";

const flickr: Connector = {
  name: "Flickr",
  category: "images",
  type: "api",

  async search(query, page = 1, safe = true): Promise<ConnectorResult> {
    const key = process.env.FLICKR_API_KEY;
    if (!key) return safeResult("Flickr", "FLICKR_API_KEY not set");

    // Flickr's safe_search: 1 = safe, 3 = restricted content included
    const url =
      `https://www.flickr.com/services/rest/?method=flickr.photos.search` +
      `&api_key=${key}&text=${encodeURIComponent(query)}&format=json&nojsoncallback=1` +
      `&per_page=12&page=${page}&extras=url_m,url_t,owner_name&license=1,2,3,4,5,6,9,10&safe_search=${safe ? 1 : 3}`;
    return fetchJsonConnector("Flickr", url, (data) => {
      const items = (data.photos?.photo ?? [])
        .map((p: any) => {
          if (!p.url_m && !p.url_t) return null;
          return {
            id: p.id,
            title: p.title || "Flickr photo",
            url: `https://www.flickr.com/photos/${p.owner}/${p.id}`,
            thumbnailUrl: p.url_t || p.url_m,
            author: p.ownername,
            source: "Flickr",
            category: "images",
          };
        })
        .filter(Boolean);
      return { total: data.photos?.total ?? items.length, items };
    });
  },
};

export default flickr;
