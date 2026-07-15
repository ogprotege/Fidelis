/** FID-QUAL-001 — Search cap/filter correctness: the §29 collector's exact
 *  counts, rendered in a real browser against the sealed DRB corpus. The
 *  numbers are pinned — the corpus regenerates only from pinned upstream
 *  commits, so a count drift means a real regression (the FID-FUNC-001 class:
 *  "NT 0" because the OT filled the display cap first). */
import { expect, test } from "@playwright/test";

test("a full-corpus search reports exact section counts", async ({ page }) => {
  test.setTimeout(120_000); // 73 books, cold cache

  await page.goto("/#/search");
  await page.getByRole("searchbox").fill("mercy");
  await page.getByRole("button", { name: "Search", exact: true }).click();

  // The sweep finishes (the progress line clears), then the chips carry the
  // whole truth for the DRB: All 434 · OT 377 · NT 57 · Gospels 22.
  await expect(page.getByRole("button", { name: "All 434" })).toBeVisible({ timeout: 90_000 });
  await expect(page.getByRole("button", { name: "Old Testament 377" })).toBeVisible();
  await expect(page.getByRole("button", { name: "New Testament 57" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Gospels 22" })).toBeVisible();

  // The NT section really lists results (the audit's failing case).
  await page.getByRole("button", { name: "New Testament 57" }).click();
  await expect(page.locator(".result").first()).toBeVisible();
});
