// Shared timeout-guarded JSON fetch, used by the external lookups behind the knowledge graph.
export async function fetchJson(url: string, timeoutMs = 5000): Promise<any | undefined> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    return res.ok ? await res.json() : undefined;
  } catch {
    return undefined;
  } finally {
    clearTimeout(timer);
  }
}
