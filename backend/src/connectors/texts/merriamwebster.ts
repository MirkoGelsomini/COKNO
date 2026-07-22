import { Connector, ConnectorResult, safeResult } from "../types";

const merriamwebster: Connector = {
  name: "Merriam-Webster",
  category: "texts",
  type: "api",

  async search(query): Promise<ConnectorResult> {
    const key = process.env.MERRIAM_WEBSTER_KEY;
    if (!key) return safeResult("Merriam-Webster", "MERRIAM_WEBSTER_KEY not set");

    try {
      const word = query.trim().split(/\s+/)[0];
      const url = `https://www.dictionaryapi.com/api/v3/references/collegiate/json/${encodeURIComponent(word)}?key=${key}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json() as any;
      if (!Array.isArray(data) || typeof data[0] === "string") {
        return { source: "Merriam-Webster", total: 0, items: [] };
      }

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

      return { source: "Merriam-Webster", total: items.length, items };
    } catch (err) {
      return safeResult("Merriam-Webster", err);
    }
  },
};

export default merriamwebster;
