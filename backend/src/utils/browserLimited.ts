import { scrapePage as scrapePageRaw } from "./browser";

// Caps concurrent Chrome tabs to avoid exhausting memory under parallel scraping
const MAX_CONCURRENT = Number(process.env.MAX_CONCURRENT_CHROME_TABS) || 8;
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
