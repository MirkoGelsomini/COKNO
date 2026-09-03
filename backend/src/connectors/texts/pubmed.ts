import { Connector, ConnectorResult, safeResult } from "../types";

const EUTILS = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils";

const pubmed: Connector = {
  name: "PubMed",
  category: "texts",
  type: "api",

  async search(query, page = 1): Promise<ConnectorResult> {
    try {
      const retstart = (page - 1) * 12;
      const searchRes = await fetch(
        `${EUTILS}/esearch.fcgi?db=pubmed&term=${encodeURIComponent(query)}&retmax=12&retmode=json&retstart=${retstart}`
      );
      if (!searchRes.ok) throw new Error(`HTTP ${searchRes.status}`);
      const searchData = await searchRes.json() as any;

      const ids: string[] = searchData.esearchresult?.idlist ?? [];
      const total = parseInt(searchData.esearchresult?.count ?? "0");
      if (!ids.length) return { source: "PubMed", total: 0, items: [] };

      const summaryRes = await fetch(
        `${EUTILS}/esummary.fcgi?db=pubmed&id=${ids.join(",")}&retmode=json`
      );
      if (!summaryRes.ok) throw new Error(`HTTP ${summaryRes.status}`);
      const summaryData = await summaryRes.json() as any;
      const result = summaryData.result ?? {};

      const items = ids
        .map((id) => {
          const s = result[id];
          if (!s?.title) return null;
          return {
            id,
            title: s.title,
            url: `https://pubmed.ncbi.nlm.nih.gov/${id}/`,
            description: [s.fulljournalname, s.pubdate].filter(Boolean).join(", "),
            author: s.authors?.[0]?.name,
            source: "PubMed",
            category: "texts" as const,
          };
        })
        .filter((x): x is NonNullable<typeof x> => x !== null);

      return { source: "PubMed", total, items };
    } catch (err) {
      return safeResult("PubMed", err);
    }
  },
};

export default pubmed;
