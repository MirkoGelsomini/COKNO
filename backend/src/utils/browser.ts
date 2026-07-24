import puppeteer from "puppeteer-core";
import type { Browser } from "puppeteer-core";
import * as fs from "fs";

const CHROME_PATHS = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium-browser",
];

function findChrome(): string {
  for (const p of CHROME_PATHS) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error(
    "Chrome not found. Install Google Chrome or set CHROME_PATH in .env"
  );
}

// Caches the in-flight launch promise so concurrent callers share one Chrome instance
let browserPromise: Promise<Browser> | null = null;

async function getBrowser(): Promise<Browser> {
  if (browserPromise) {
    const existing = await browserPromise;
    if (existing.connected) return existing;
    browserPromise = null;
  }

  const executablePath = process.env.CHROME_PATH || findChrome();
  browserPromise = puppeteer
    .launch({
      executablePath,
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    })
    .then((b) => {
      b.on("disconnected", () => { browserPromise = null; });
      return b;
    });
  return browserPromise;
}

// Cheap HTTP fetch with browser-like headers; only works on sites without JS rendering or bot-detection
export async function plainFetchPage(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

// Fetches a page using a real Chrome browser — bypasses bot detection and renders JS
export async function scrapePage(url: string, waitFor?: string): Promise<string> {
  const b = await getBrowser();
  const page = await b.newPage();
  await page.setUserAgent(
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
  );
  await page.setRequestInterception(true);
  page.on("request", (req) => {
    const type = req.resourceType();
    if (type === "image" || type === "font" || type === "media") {
      req.abort();
    } else {
      req.continue();
    }
  });

  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15000 });
    if (waitFor) {
      await page.waitForSelector(waitFor, { timeout: 5000 }).catch(() => {});
    }
    return await page.content();
  } finally {
    await page.close();
  }
}
