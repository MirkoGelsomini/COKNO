import { Connector, ConnectorResult, safeResult } from "../types";

const gutenberg: Connector = {
  name: "Project Gutenberg",
  category: "texts",
  type: "api",

  async search(query, page = 1): Promise<ConnectorResult> {
    try {
      const url = `https://gutendex.com/books/?search=${encodeURIComponent(query)}&page=${page}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json() as any;
      const items = (data.results ?? []).map((book: any) => {
        const authors = (book.authors ?? []).map((a: any) => a.name).join(", ");
        const thumb = book.formats?.["image/jpeg"];
        const htmlUrl =
          book.formats?.["text/html"] ||
          book.formats?.["text/html; charset=utf-8"] ||
          `https://www.gutenberg.org/ebooks/${book.id}`;
        return {
          id: String(book.id),
          title: book.title || "Gutenberg book",
          url: htmlUrl,
          thumbnailUrl: thumb,
          author: authors || undefined,
          description: (book.subjects ?? []).slice(0, 3).join(", ") || undefined,
          source: "Project Gutenberg",
          category: "texts",
        };
      });

      return { source: "Project Gutenberg", total: data.count ?? items.length, items };
    } catch (err) {
      return safeResult("Project Gutenberg", err);
    }
  },
};

export default gutenberg;
