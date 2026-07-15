/** FID-QUAL-001 — offline cache state: "Saved" is a claim the cache must back
 *  (FID-FUNC-008). Download → verified Saved; evict one file → Repair; evict
 *  the cache → never Saved again, however loudly the localStorage record
 *  claims it. Drives the real service worker, so this spec needs the BUILT
 *  app (vite preview — the config's webServer). */
import { expect, test } from "@playwright/test";

test("offline Saved is cache truth: download, evict, Repair, never lie", async ({ page }) => {
  test.setTimeout(180_000); // the DRB bundle is ~79 files

  await page.goto("/#/settings");
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload({ waitUntil: "networkidle" });

  const drbRow = page.locator(".download-row", { hasText: "DRB" });
  await drbRow.getByRole("button", { name: "Download" }).click();
  await expect(drbRow.getByRole("button", { name: /Saved/ })).toBeVisible({ timeout: 120_000 });

  // Evict one file the Settings preview won't immediately re-fetch.
  await page.evaluate(async () => {
    const cache = await caches.open("fidelis-data-v2");
    const keys = (await cache.keys()).filter((r) => r.url.includes("/data/drc/"));
    const victim = keys.find((r) => r.url.includes("obadiah")) ?? keys[keys.length - 1];
    await cache.delete(victim);
  });
  await page.reload({ waitUntil: "networkidle" });
  await expect(drbRow.getByRole("button", { name: "Repair (1 missing)" })).toBeVisible({
    timeout: 15_000
  });

  // Repair re-fetches exactly the gap (cache-first skips the rest).
  await drbRow.getByRole("button", { name: /Repair/ }).click();
  await expect(drbRow.getByRole("button", { name: /Saved/ })).toBeVisible({ timeout: 120_000 });

  // The audit's repro: delete the whole data cache. The record still says
  // saved; the row must never claim Saved again.
  await page.evaluate(() => caches.delete("fidelis-data-v2"));
  await page.reload({ waitUntil: "networkidle" });
  await expect(drbRow.getByRole("button", { name: /Repair \(\d+ missing\)|Download/ })).toBeVisible({
    timeout: 15_000
  });
  expect(await page.evaluate(() => localStorage.getItem("fidelis:offline"))).toContain("drc");
  expect(await drbRow.getByRole("button", { name: /Saved/ }).count()).toBe(0);
});
