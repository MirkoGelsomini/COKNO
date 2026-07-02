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

let browser: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (browser && browser.connected) return browser;
  const executablePath = process.env.CHROME_PATH || findChrome();
  browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });
  browser.on("disconnected", () => { browser = null; });
  return browser;
}

// Fetches a page using a real Chrome browser — bypasses bot detection and renders JS
export async function scrapePage(url: string, waitFor?: string): Promise<string> {
  const b = await getBrowser();
  const page = await b.newPage();
  await page.setUserAgent(
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
  );
  // Block images/fonts to speed up loading
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
