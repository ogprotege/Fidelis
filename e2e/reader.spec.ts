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

test("verse keyboard navigation is roving and enters the action bar", async ({ page }) => {
  await page.goto("/#/read/drc/john/3");
  await page.evaluate(() => {
    const state = window as typeof window & { readerKeyboardScroll?: ScrollBehavior };
    Element.prototype.scrollIntoView = function (options?: boolean | ScrollIntoViewOptions) {
      state.readerKeyboardScroll = typeof options === "object" ? options.behavior : undefined;
    };
  });
  const first = page.locator(".verse").first();
  await first.focus();
  await expect(first).toBeFocused();

  await page.keyboard.press("ArrowDown");
  const second = page.locator(".verse").nth(1);
  await expect(second).toBeFocused();
  await expect(first).toHaveAttribute("tabindex", "-1");
  await expect(second).toHaveAttribute("tabindex", "0");
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as typeof window & { readerKeyboardScroll?: string }).readerKeyboardScroll
      )
    )
    .toBe("auto");

  await page.keyboard.press("Enter");
  const actions = page.getByRole("group", { name: "Verse actions" });
  await expect(actions.getByRole("button", { name: "Bookmark" })).toBeFocused();

  await actions.getByRole("button", { name: "Close" }).click();
  await expect(second).toBeFocused();
});

test("coarse-pointer navigation controls keep 44px targets on phone and tablet", async ({
  page
}) => {
  for (const width of [390, 768]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/#/");

    const primaryTargets = page.locator(".tabbar > a, .tabbar .more-btn");
    await expect(primaryTargets.first()).toBeVisible();
    const primaryHeights = await primaryTargets.evaluateAll((elements) =>
      elements.map((element) => element.getBoundingClientRect().height)
    );
    expect(primaryHeights.every((height) => height >= 44)).toBeTruthy();

    await page.locator(".tabbar .more-btn").click();
    const menuHeights = await page.locator(".more-menu a").evaluateAll((elements) =>
      elements.map((element) => element.getBoundingClientRect().height)
    );
    expect(menuHeights.length).toBeGreaterThan(0);
    expect(menuHeights.every((height) => height >= 44)).toBeTruthy();

    await page.goto("/#/read/drc/john/3");
    await expect(page.locator(".chapter-nav a").first()).toBeVisible({ timeout: 15_000 });
    const readerHeights = await page
      .locator(".folio-pick, .chapter-pick, .folio-type, .chapter-nav a")
      .evaluateAll((elements) =>
        elements.map((element) => element.getBoundingClientRect().height)
      );
    expect(readerHeights.every((height) => height >= 44)).toBeTruthy();
  }
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
  await expect(page.locator(".sheet-backdrop")).toHaveClass(/closing/);
  await expect(dialog).not.toBeVisible();

  // The preference is read when dismissal is requested, not captured when the
  // sheet mounted. A live change therefore takes the instant path.
  await page.getByRole("button", { name: "Commentary" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.keyboard.press("Escape");
  await expect(page.locator(".sheet-backdrop")).toHaveCount(0);
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
