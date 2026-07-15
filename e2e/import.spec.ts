/** FID-QUAL-001 — the import-transaction failure, in a real browser: an
 *  injected IndexedDB write failure mid-import must leave the prior corpus
 *  untouched (FID-DATA-001's acceptance, the browser half of harness §33). */
import { expect, test } from "@playwright/test";

const corpus = (marks: Record<string, string>) => ({
  books: Object.entries(marks).map(([name, text]) => ({
    name,
    chapters: [{ verses: [{ text: `${text} verse one.` }, { text: `${text} verse two.` }] }]
  }))
});
const fileOf = (obj: unknown) => ({
  name: "bible.json",
  mimeType: "application/json",
  buffer: Buffer.from(JSON.stringify(obj))
});

async function importFile(
  page: import("@playwright/test").Page,
  button: string | RegExp,
  file: ReturnType<typeof fileOf>
) {
  await page.locator("#nabre").getByRole("button", { name: button }).click();
  await page.setInputFiles('input[accept*="usfm"]', file);
  await expect(page.locator(".notice").first()).toBeVisible({ timeout: 30_000 });
  return page.locator(".notice").first().innerText();
}

test("a mid-import write failure leaves the prior corpus untouched", async ({ page }) => {
  // Fail the second staged put of generation 2 — the replacement import.
  await page.addInitScript(() => {
    const origPut = IDBObjectStore.prototype.put;
    let stagedPuts = 0;
    IDBObjectStore.prototype.put = function (value: unknown, key?: IDBValidKey) {
      if (typeof key === "string" && key.includes("@2/") && ++stagedPuts >= 2) {
        throw new DOMException("quota", "QuotaExceededError");
      }
      return origPut.call(this, value, key as IDBValidKey);
    };
  });
  await page.goto("/#/translations");

  const ok = await importFile(page, /Import your licensed NABRE/, fileOf(corpus({ John: "B-john", Matthew: "B-matthew" })));
  expect(ok).toContain("Imported 2 books into NABRE");

  const failed = await importFile(
    page,
    "Replace imported text",
    fileOf(corpus({ Genesis: "A-genesis", John: "A-john", Mark: "A-mark" }))
  );
  expect(failed).toContain("Import failed");
  expect(failed).toMatch(/storage is full/i); // the cause…
  expect(failed).toMatch(/free up space/i); // …and the recovery, named

  // The marker never flipped: the prior corpus still serves, byte-for-byte.
  await page.goto("/#/read/nabre/john/1");
  await expect(page.locator(".verses")).toContainText("B-john verse one.");
});
