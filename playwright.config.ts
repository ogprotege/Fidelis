import { defineConfig } from "@playwright/test";

/** The committed browser suite (v1.18.1, audit FID-QUAL-001): a narrow layer
 *  over the pure harnesses for the behaviors only a real browser can prove —
 *  Today's failure states, the Reader's action bar and sheets, Search counts,
 *  bookmark translations, import-failure atomicity, offline cache truth, and
 *  axe. Run `npm run build` first (the suite drives the BUILT app through
 *  `vite preview`, service worker included), then `npm run e2e`.
 *
 *  channel "chrome" uses the installed Google Chrome — present on dev Macs and
 *  GitHub's ubuntu runners alike — so no Playwright browser download is needed.
 */
export default defineConfig({
  testDir: "e2e",
  reporter: [["list"]],
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: "http://localhost:4173",
    channel: "chrome",
    viewport: { width: 390, height: 844 },
    hasTouch: true
  },
  webServer: {
    command: "npm run preview -- --port 4173 --strictPort",
    url: "http://localhost:4173",
    reuseExistingServer: !process.env.CI,
    timeout: 30_000
  }
});
