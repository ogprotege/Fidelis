/** FID-QUAL-001 — Reader selection, the docked action bar, sheets, and Back.
 *  Includes the audit's "axe on an open sheet" check. */
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("selecting a verse opens the action bar without covering the verse", async ({ page }) => {
  await page.goto("/#/read/drc/john/3");
  await page.locator(".verse").nth(15).click();

  const bar = page.getByRole("group", { name: "Verse actions" });
  await expect(bar).toBeVisible();
  await expect(page.locator(".verse.selected")).toBeVisible();

  // FID-UX-001's fix: the phone bar docks at the bottom and the page scrolls
  // the verse clear — the selected verse's box never intersects the bar's.
  const verseBox = await page.locator(".verse.selected").boundingBox();
  const barBox = await bar.boundingBox();
  expect(verseBox && barBox && verseBox.y + verseBox.height <= barBox.y + 1).toBeTruthy();

  // Close returns the Reader to its resting state.
  await bar.getByRole("button", { name: "Close" }).click();
  await expect(bar).not.toBeVisible();
});

test("the Commentary sheet opens, passes axe, and Escape closes it", async ({ page }) => {
  await page.goto("/#/read/drc/john/3");
  await page.locator(".verse").nth(15).click();
  await page.getByRole("button", { name: "Commentary" }).click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(page.locator(".cmt-tab").first()).toBeVisible({ timeout: 15_000 });
  // Let the sheet's 110ms entrance finish: axe composites colors through the
  // in-flight opacity, which reads as a phantom contrast failure.
  await page
    .locator(".sheet")
    .evaluate((el) => Promise.all(el.getAnimations().map((a) => a.finished)));

  // The audit's "axe on an open sheet".
  const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(axe.violations, JSON.stringify(axe.violations, null, 2)).toEqual([]);

  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
});

test("browser Back with a sheet open navigates AND releases the scroll lock", async ({
  page
}) => {
  await page.goto("/#/");
  await page.goto("/#/read/drc/john/3");
  await page.locator(".verse").nth(15).click();
  await page.getByRole("button", { name: "Commentary" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();

  // In the browser, Back is navigation (the overlay stack serves the NATIVE
  // back button). The v1.14.2 regression class: leaving a page whose sheet
  // pinned the body must not strand the destination pinned or mis-scrolled.
  await page.goBack();
  await expect(page.getByRole("heading", { name: "Today in the Church" })).toBeVisible();
  const overflow = await page.evaluate(() => getComputedStyle(document.body).overflow);
  expect(overflow).not.toBe("hidden");
});
