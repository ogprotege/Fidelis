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
});
