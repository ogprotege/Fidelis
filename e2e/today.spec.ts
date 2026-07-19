/** FID-QUAL-001 — Today's load and failure states (the audit's first ask).
 *  The failure test blocks service workers so the route interception below
 *  actually sees the lectionary request (a SW's fetches bypass page routes). */
import { expect, test } from "@playwright/test";

test("Today loads its six cards and the Mass readings settle", async ({ page }) => {
  await page.goto("/#/");
  for (const h of [
    "Today at Mass",
    "Today in the Church",
    "Verse of the Day",
    "Quote of the Day",
    "The Holy Rosary",
    "Continue Reading"
  ]) {
    await expect(page.getByRole("heading", { name: h })).toBeVisible();
  }
  // The Mass skeleton settles into the real reading list…
  await expect(page.locator(".mass-list li").first()).toBeVisible({ timeout: 15_000 });
  // …and the Verse of the Day carries real text (never the bare em dash).
  await expect(page.locator(".votd-text")).toContainText(/\w/);
});

test.describe("Mass failure state", () => {
  test.use({ serviceWorkers: "block" });

  test("a failed lectionary load shows a quiet notice whose Try again recovers", async ({
    page
  }) => {
    let blocked = true;
    await page.route("**/data/lectionary.json", (route) =>
      blocked ? route.abort() : route.continue()
    );
    await page.goto("/#/");
    const notice = page.getByText("Today’s readings couldn’t be loaded.");
    await expect(notice).toBeVisible({ timeout: 15_000 });

    blocked = false;
    await page.getByRole("button", { name: "Try again" }).click();
    await expect(page.locator(".mass-list li").first()).toBeVisible({ timeout: 15_000 });
    await expect(notice).not.toBeVisible();
  });

  test("a failed saints/history load shows the connection notice, never the calm empty line", async ({
    page
  }) => {
    // Transport failure (offline blip), not a 404: the card must say so —
    // every date has a saint, so "being gathered" would be false.
    await page.route("**/data/saints/**", (route) => route.abort());
    await page.route("**/data/history/**", (route) => route.abort());
    await page.goto("/#/");
    await expect(
      page.getByText("Today in the Church couldn’t be loaded — it will return with your connection.")
    ).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/being gathered/)).not.toBeVisible();
  });

  test("an uncovered history day (SPA-fallback shell, not a 404) is calm absence, not a failure", async ({
    page
  }) => {
    // The July-19 report: on a SPA-fallback host (the static PWA host and the
    // Capacitor native shell) a missing per-date file is served as the HTML
    // app shell with HTTP 200 — never a real 404. The saint loads (every date
    // has one), so the card must show it and stay silent about history, never
    // the false "Church history couldn't be loaded" connection notice.
    await page.route("**/data/history/**", (route) =>
      route.fulfill({
        status: 200,
        contentType: "text/html",
        body: "<!doctype html><html><head></head><body>app shell</body></html>"
      })
    );
    await page.goto("/#/");
    // The Saint of the Day lead resolves (proves the card rendered).
    await expect(page.getByText("Saint of the Day")).toBeVisible({ timeout: 15_000 });
    // …and none of the three failure notices show for the missing history day.
    await expect(
      page.getByText("Church history couldn’t be loaded — it will return with your connection.")
    ).not.toBeVisible();
    await expect(
      page.getByText("Today in the Church couldn’t be loaded — it will return with your connection.")
    ).not.toBeVisible();
  });
});
