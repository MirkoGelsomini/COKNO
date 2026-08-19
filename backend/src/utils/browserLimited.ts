import { scrapePage as scrapePageRaw } from "./browser";

// Caps concurrent Chrome tabs so parallel scraping doesn't exhaust memory or queue past the
// per-connector timeout. 16 measured empirically as the sweet spot for ~46 connectors.
const MAX_CONCURRENT = Number(process.env.MAX_CONCURRENT_CHROME_TABS) || 16;
let active = 0;
const queue: Array<() => void> = [];

function acquire(): Promise<void> {
  return new Promise((resolve) => {
    if (active < MAX_CONCURRENT) {
      active++;
      resolve();
    } else {
      queue.push(() => { active++; resolve(); });
    }
  });
}

function release(): void {
  active--;
  queue.shift()?.();
}

export async function scrapePage(url: string, waitFor?: string): Promise<string> {
  await acquire();
  try {
    return await scrapePageRaw(url, waitFor);
  } finally {
    release();
  }
}
