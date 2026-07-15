/** FID-QUAL-001 — axe (WCAG 2 A/AA) on the four main surfaces. The open-sheet
 *  pass lives in reader.spec.ts beside the interaction that opens it. */
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const SURFACES: Array<{ name: string; path: string; settle: string }> = [
  { name: "Today", path: "/#/", settle: ".mass-list li" },
  { name: "Reader", path: "/#/read/drc/john/3", settle: ".verse" },
  { name: "Mass", path: "/#/readings", settle: ".reading-body" },
  { name: "Settings", path: "/#/settings", settle: ".scripture-preview" }
];

for (const s of SURFACES) {
  test(`axe: ${s.name} has no WCAG A/AA violations`, async ({ page }) => {
    await page.goto(s.path);
    await expect(page.locator(s.settle).first()).toBeVisible({ timeout: 20_000 });
    const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    expect(axe.violations, JSON.stringify(axe.violations, null, 2)).toEqual([]);
  });
}
