import * as cheerio from "cheerio";
import { plainFetchPage } from "../../utils/browser";
import { Connector, ConnectorResult, safeResult } from "../types";

// Getty's thumbnails carry a generic localized alt text (e.g. German
// "Video-Miniaturansicht"), not a real title — the actual description lives
// in the URL slug, e.g. /detail/video/elephant-in-serengeti-stock-filmmaterial/123
function titleFromSlug(href: string): string {
  const match = href.match(/\/detail\/video\/([^/]+)\/\d+/);
  if (!match) return "";
  const slug = match[1].replace(/-stock-(filmmaterial|video-footage|footage|video)$/i, "").replace(/-/g, " ").trim();
  return slug ? slug.charAt(0).toUpperCase() + slug.slice(1) : "";
}

// Getty Images Video — shows publicly visible previews (content requires license)
const gettyVideos: Connector = {
  name: "Getty Videos",
  category: "videos",
  type: "scraping",

  async search(query): Promise<ConnectorResult> {
    try {
      const url = `https://www.gettyimages.com/videos/${encodeURIComponent(query)}`;
      const html = await plainFetchPage(url);
      const $ = cheerio.load(html);
      const items: any[] = [];

      $("a[href*='/detail/video/']").each((_, el) => {
        const href = $(el).attr("href") ?? "";
        const img = $(el).find("img").first();
        const src = img.attr("src") || img.attr("data-src") || "";
        const title =
          titleFromSlug(href) ||
          $(el).find("h3, h2, [class*='title']").first().text().trim() ||
          img.attr("alt") ||
          "";
        if (href && title) {
          items.push({
            id: href,
            title,
            url: href.startsWith("http") ? href : `https://www.gettyimages.com${href}`,
            thumbnailUrl: src || undefined,
            source: "Getty Videos",
            category: "videos",
          });
        }
      });

      const unique = [...new Map(items.map((i) => [i.id, i])).values()];
      return { source: "Getty Videos", total: unique.length, items: unique };
    } catch (err) {
      return safeResult("Getty Videos", err);
    }
  },
};

export default gettyVideos;
