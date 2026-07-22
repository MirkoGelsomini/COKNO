import { Connector, ConnectorResult, safeResult } from "../types";

const conceptnet: Connector = {
  name: "ConceptNet",
  category: "texts",
  type: "api",

  async search(query): Promise<ConnectorResult> {
    try {
      const term = query.toLowerCase().trim().replace(/\s+/g, "_");
      const url = `https://api.conceptnet.io/c/en/${encodeURIComponent(term)}?limit=12`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json() as any;
      const edges = data.edges ?? [];

      const items = edges
        .filter((e: any) => e.start?.label && e.end?.label && e.rel?.label)
        .map((e: any) => {
          const start = e.start.label;
          const rel = e.rel.label;
          const end = e.end.label;
          const nodeId = e.end["@id"] ?? e.start["@id"];
          return {
            id: e["@id"],
            title: `${start} → ${rel} → ${end}`,
            url: `https://conceptnet.io${nodeId}`,
            description: `Relation: ${rel} (weight: ${(e.weight ?? 0).toFixed(2)})`,
            source: "ConceptNet",
            category: "texts",
          };
        });

      return { source: "ConceptNet", total: items.length, items };
    } catch (err) {
      return safeResult("ConceptNet", err);
    }
  },
};

export default conceptnet;
