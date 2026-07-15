/**
 * App Store screenshot capture (FID-REL-001).
 *
 * WHY THIS IS COMMITTED. The set went stale once (the v1.16.0 masthead landed
 * while the store still carried 2026-07-13 frames showing the retired bottom
 * bar) because the capture harness lived only in a session scratchpad. Keeping
 * it in the tree means a maintainer can always regenerate the exact set.
 *
 * WHY A BROWSER CAPTURE IS FAITHFUL. The iOS/Android shells wrap the exact same
 * dist/ web bundle, so a headless-Chrome capture at the device's own pixel
 * geometry reproduces what the native WebView draws. Settings are preset by
 * writing the `fidelis:settings` localStorage blob in an init script that runs
 * BEFORE index.html's pre-paint theme script, so the theme is correct from the
 * first paint (no Day-flash in the night frame).
 *
 *   iPhone 6.9": 428x926  CSS @ 3x -> 1284x2778
 *   iPad  12.9": 1024x1366 CSS @ 2x -> 2048x2732
 *
 * Usage:
 *   npm run build && npm run preview -- --port 4173 --strictPort &   # serve dist/
 *   node scripts/capture-appstore.mjs                                # writes appstore/
 *
 * Output lands in appstore/screenshots (iPhone) and appstore/screenshots-ipad
 * (iPad) — both gitignored (large, regenerable PNGs). Requires Google Chrome
 * (channel "chrome", no Playwright browser download).
 */
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { execSync } from "node:child_process";

const BASE = process.env.PREVIEW_URL ?? "http://localhost:4173";
const ROOT = process.cwd();
const DEFAULTS = { translation: "drc", scriptureFont: "garamond", theme: "day" };

const settle = (page, ms) => page.waitForTimeout(ms);
const fontsReady = (page) => page.evaluate(() => document.fonts.ready.then(() => true));

const readerReady = (page) => page.waitForSelector(".verse", { timeout: 20000 });
const searchReady = (page) => page.waitForSelector('a[href*="/read/"]', { timeout: 20000 });
const pageReady = async (page) => {
  await page.waitForSelector("main", { timeout: 20000 });
  await settle(page, 900);
};

const openCommentary = async (page) => {
  // John 3:16 is the 16th verse -> index 15 (mirrors e2e/reader.spec.ts).
  await page.locator(".verse").nth(15).click();
  await page.getByRole("button", { name: "Commentary" }).click();
  await page.waitForSelector(".cmt-tab", { timeout: 20000 });
  // Let the sheet's 110ms entrance finish before the shot.
  await page
    .locator(".sheet")
    .evaluate((el) => Promise.all(el.getAnimations().map((a) => a.finished)))
    .catch(() => undefined);
  await settle(page, 400);
};

const SHOTS = [
  { name: "01-today", url: "#/", ready: pageReady },
  { name: "02-reader-john1", url: "#/read/drc/john/1", ready: readerReady },
  { name: "03-mass-readings", url: "#/readings", ready: pageReady, settings: { massTranslation: "nabre" } },
  { name: "03b-mass-readings-drb", url: "#/readings", ready: pageReady, settings: { massTranslation: "drc" } },
  { name: "04-commentary-john3", url: "#/read/drc/john/3", ready: readerReady, action: openCommentary },
  { name: "05-search-charity", url: "#/search?q=charity", ready: searchReady },
  { name: "06-reader-psalm22-night", url: "#/read/drc/psalms/22", ready: readerReady, settings: { theme: "night" } },
  { name: "07-settings", url: "#/settings", ready: pageReady },
  { name: "08-canon", url: "#/read", ready: pageReady }
];

const DEVICES = [
  { dir: "appstore/screenshots", w: 428, h: 926, dsf: 3, label: "iPhone" },
  { dir: "appstore/screenshots-ipad", w: 1024, h: 1366, dsf: 2, label: "iPad" }
];

async function main() {
  const browser = await chromium.launch({ channel: "chrome" });
  for (const dev of DEVICES) {
    mkdirSync(`${ROOT}/${dev.dir}`, { recursive: true });
    for (const shot of SHOTS) {
      const settings = { ...DEFAULTS, ...(shot.settings ?? {}) };
      const ctx = await browser.newContext({
        viewport: { width: dev.w, height: dev.h },
        deviceScaleFactor: dev.dsf,
        hasTouch: true,
        colorScheme: settings.theme === "night" ? "dark" : "light"
      });
      await ctx.addInitScript((s) => {
        try {
          localStorage.setItem("fidelis:settings", JSON.stringify(s));
        } catch {
          /* private mode / quota — the shot just falls back to defaults */
        }
      }, settings);
      const page = await ctx.newPage();
      try {
        await page.goto(`${BASE}/${shot.url}`, { waitUntil: "networkidle", timeout: 30000 });
      } catch {
        await page.goto(`${BASE}/${shot.url}`, { waitUntil: "load", timeout: 30000 });
      }
      try {
        await shot.ready(page);
        await fontsReady(page);
        await settle(page, 400);
        if (shot.action) await shot.action(page);
      } catch (e) {
        console.error(`  ! ${dev.label} ${shot.name}: ${e.message}`);
      }
      const out = `${ROOT}/${dev.dir}/${shot.name}.png`;
      await page.screenshot({ path: out });
      const size = execSync(`sips -g pixelWidth -g pixelHeight "${out}" | tail -2 | awk '{print $2}' | paste -sd x -`)
        .toString()
        .trim();
      console.log(`${dev.label.padEnd(6)} ${shot.name.padEnd(24)} ${size}`);
      await ctx.close();
    }
  }
  await browser.close();
  console.log("\nDONE — appstore/screenshots (iPhone 1284x2778), appstore/screenshots-ipad (iPad 2048x2732)");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
