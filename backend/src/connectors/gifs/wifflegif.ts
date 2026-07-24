import * as cheerio from "cheerio";
import { plainFetchPage } from "../../utils/browser";
import { Connector, ConnectorResult, safeResult } from "../types";

function titleFromSlug(href: string): string {
  const match = href.match(/\/gifs\/\d+-(.+)$/);
  if (!match) return "";
  const slug = match[1].replace(/-gif$/, "").replace(/-/g, " ").trim();
  return slug ? slug.charAt(0).toUpperCase() + slug.slice(1) : "";
}

const wifflegif: Connector = {
  name: "Wifflegif",
  category: "gifs",
  type: "scraping",

  async search(query): Promise<ConnectorResult> {
    try {
      const url = `https://wifflegif.com/gifs/search?q=${encodeURIComponent(query)}`;
      const html = await plainFetchPage(url);
      const $ = cheerio.load(html);
      const items: any[] = [];

      $("a[href*='/gifs/']").each((_, el) => {
        const href = $(el).attr("href") ?? "";
        if (href === "/gifs/" || href.endsWith("/search") || href.includes("?")) return;
        const img = $(el).find("img").first();
        const src = img.attr("src") || img.attr("data-src") || img.attr("data-gif") || "";
        const title = titleFromSlug(href) || img.attr("alt") || $(el).attr("title") || "";
        if (href && src) {
          items.push({
            id: href,
            title: title || "Wifflegif GIF",
            url: href.startsWith("http") ? href : `https://wifflegif.com${href}`,
            thumbnailUrl: src.startsWith("http") ? src : `https://wifflegif.com${src}`,
            source: "Wifflegif",
            category: "gifs",
          });
        }
      });

      const unique = [...new Map(items.map((i) => [i.id, i])).values()];
      return { source: "Wifflegif", total: unique.length, items: unique };
    } catch (err) {
      return safeResult("Wifflegif", err);
    }
  },
};

export default wifflegif;
