import { Connector, ConnectorResult, safeResult, fetchJsonConnector } from "../types";

const merriamwebster: Connector = {
  name: "Merriam-Webster",
  category: "texts",
  type: "api",

  async search(query): Promise<ConnectorResult> {
    const key = process.env.MERRIAM_WEBSTER_KEY;
    if (!key) return safeResult("Merriam-Webster", "MERRIAM_WEBSTER_KEY not set");

    const word = query.trim().split(/\s+/)[0];
    const url = `https://www.dictionaryapi.com/api/v3/references/collegiate/json/${encodeURIComponent(word)}?key=${key}`;
    return fetchJsonConnector("Merriam-Webster", url, (data) => {
      if (!Array.isArray(data) || typeof data[0] === "string") return { total: 0, items: [] };

      const items = data
        .filter((entry: any) => entry.meta?.id && entry.shortdef?.length)
        .slice(0, 12)
        .map((entry: any) => ({
          id: entry.meta.uuid,
          title: entry.hwi?.hw?.replace(/\*/g, "") ?? word,
          url: `https://www.merriam-webster.com/dictionary/${encodeURIComponent(word)}`,
          description: entry.shortdef.join("; "),
          source: "Merriam-Webster",
          category: "texts" as const,
        }));
      return { total: items.length, items };
    });
  },
};

export default merriamwebster;
