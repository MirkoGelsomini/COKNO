import { Connector, ConnectorResult, fetchJsonConnector } from "../types";

const gutenberg: Connector = {
  name: "Project Gutenberg",
  category: "texts",
  type: "api",

  async search(query, page = 1): Promise<ConnectorResult> {
    const url = `https://gutendex.com/books/?search=${encodeURIComponent(query)}&page=${page}`;
    return fetchJsonConnector("Project Gutenberg", url, (data) => {
      const items = (data.results ?? []).map((book: any) => {
        const authors = (book.authors ?? []).map((a: any) => a.name).join(", ");
        const htmlUrl =
          book.formats?.["text/html"] ||
          book.formats?.["text/html; charset=utf-8"] ||
          `https://www.gutenberg.org/ebooks/${book.id}`;
        return {
          id: String(book.id),
          title: book.title || "Gutenberg book",
          url: htmlUrl,
          thumbnailUrl: book.formats?.["image/jpeg"],
          author: authors || undefined,
          description: (book.subjects ?? []).slice(0, 3).join(", ") || undefined,
          source: "Project Gutenberg",
          category: "texts",
        };
      });
      return { total: data.count ?? items.length, items };
    });
  },
};

export default gutenberg;
