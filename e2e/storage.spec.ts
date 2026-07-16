/** FID-STOR-002 — the storage shadow, in a real browser: when the device
 *  refuses localStorage writes (quota, private mode), the session must stay
 *  consistent — the banner speaks, the bookmark stays, a later settings change
 *  cannot revert an earlier one, and Export genuinely recovers the refused
 *  marginalia (the browser half of harness §37). Navigation stays in-app
 *  (same-document hash routing) so the session shadow is the thing under test. */
import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

const refuseWrites = (page: import("@playwright/test").Page) =>
  page.addInitScript(() => {
    Storage.prototype.setItem = function () {
      throw new DOMException("full", "QuotaExceededError");
    };
  });

test("a refused write keeps the session consistent: banner, bookmark, both settings", async ({
  page
}) => {
  await refuseWrites(page);
  await page.goto("/#/read/drc/john/3");
  await page.locator(".verse").nth(15).click();

  const bar = page.getByRole("group", { name: "Verse actions" });
  await bar.getByRole("button", { name: "Bookmark" }).click();

  // The banner speaks the shadow contract…
  const banner = page.locator(".storage-banner");
  await expect(banner).toBeVisible();
  await expect(banner).toContainText("kept for this session");
  // …and the bookmark it warned about is really there (reads prefer the shadow).
  await expect(bar.getByRole("button", { name: "Bookmark" })).toHaveAttribute(
    "aria-pressed",
    "true"
  );

  // In-app to Settings (same document — the shadow lives in this session).
  await page.getByRole("button", { name: "More" }).click();
  await page.getByRole("link", { name: "Settings" }).click();

  const theme = page.getByRole("group", { name: "Theme" });
  await theme.getByRole("button", { name: "Night" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "night");

  // The audit's reversion bug: an unrelated later change must NOT rebase onto
  // stale persisted settings and snap the theme back.
  await page.getByRole("switch", { name: "Follow the liturgical year" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "night");
  await expect(theme.getByRole("button", { name: "Night" })).toHaveAttribute(
    "aria-pressed",
    "true"
  );
});

test("Export recovers the refused marginalia", async ({ page }) => {
  await refuseWrites(page);
  await page.goto("/#/read/drc/john/3");
  await page.locator(".verse").nth(15).click();
  await page
    .getByRole("group", { name: "Verse actions" })
    .getByRole("button", { name: "Bookmark" })
    .click();
  await expect(page.locator(".storage-banner")).toBeVisible();

  await page.getByRole("button", { name: "More" }).click();
  // exact: the storage banner's "Export your library" link also matches.
  await page.getByRole("link", { name: "Library", exact: true }).click();

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Export" }).click()
  ]);
  const path = await download.path();
  const doc = JSON.parse(readFileSync(path!, "utf8")) as {
    bookmarks: { book: string; chapter: number }[];
  };
  expect(doc.bookmarks.some((b) => b.book === "john" && b.chapter === 3)).toBe(true);
});
