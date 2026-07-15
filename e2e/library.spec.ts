/** FID-QUAL-001 — a bookmark opens in the translation it was SAVED in
 *  (FID-FUNC-003's fix), even when the reading default has moved on. */
import { expect, test } from "@playwright/test";

test("a bookmark opens in its saved translation, not the current default", async ({ page }) => {
  await page.addInitScript(() => {
    // The reader default is CPDV *now*; the bookmark was saved in the DRB.
    localStorage.setItem("fidelis:settings", JSON.stringify({ translation: "cpdv" }));
    localStorage.setItem(
      "fidelis:bookmarks",
      JSON.stringify([{ translation: "drc", book: "john", chapter: 3, verse: 16, createdAt: 1 }])
    );
  });
  await page.goto("/#/library");

  // The row names the differing translation quietly (a muted suffix beside
  // the link) and the link itself carries the SAVED translation.
  const row = page.locator(".lib-item").first();
  await expect(row).toContainText("· DRB");
  const link = row.locator("a").first();
  await expect(link).toHaveAttribute("href", /\/read\/drc\/john\/3/);

  await link.click();
  // The DRB rendering ("as to give"), not the CPDV's ("so as to give").
  await expect(page.locator(".verses")).toContainText("as to give his only begotten Son", {
    timeout: 15_000
  });
});
