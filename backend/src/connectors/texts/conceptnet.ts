import { Connector, ConnectorResult, fetchJsonConnector } from "../types";

const conceptnet: Connector = {
  name: "ConceptNet",
  category: "texts",
  type: "api",

  async search(query): Promise<ConnectorResult> {
    const term = query.toLowerCase().trim().replace(/\s+/g, "_");
    const url = `https://api.conceptnet.io/c/en/${encodeURIComponent(term)}?limit=12`;
    return fetchJsonConnector("ConceptNet", url, (data) => {
      const items = (data.edges ?? [])
        .filter((e: any) => e.start?.label && e.end?.label && e.rel?.label)
        .map((e: any) => {
          const nodeId = e.end["@id"] ?? e.start["@id"];
          return {
            id: e["@id"],
            title: `${e.start.label} → ${e.rel.label} → ${e.end.label}`,
            url: `https://conceptnet.io${nodeId}`,
            description: `Relation: ${e.rel.label} (weight: ${(e.weight ?? 0).toFixed(2)})`,
            source: "ConceptNet",
            category: "texts",
          };
        });
      return { total: items.length, items };
    });
  },
};

export default conceptnet;
