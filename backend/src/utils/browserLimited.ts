import { scrapePage as scrapePageRaw } from "./browser";

// Max simultaneous Chrome pages — prevents memory exhaustion when many
// scraping connectors run in parallel via Promise.allSettled.
// Measured on this 8GB machine: real scraping targets (video/3D marketplace
// pages) run heavier than a simple page, so 10 concurrent tabs pushed total
// Chrome RSS to ~3.3GB and the system started swapping. 8 keeps a safer
// margin while still roughly doubling throughput vs the original 5.
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
