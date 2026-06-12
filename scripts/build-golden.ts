/**
 * Regenerates the committed golden-year calendar snapshots (review §B.2).
 * Run: npm run golden — then review `git diff scripts/golden/` like a
 * calendar change: every moved feast, relabeled day, or reshuffled reading
 * must be explainable, or the engine has regressed.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { GOLDEN_REGIONS, GOLDEN_YEARS, goldenYear } from "./golden";
import { LectionaryData } from "../src/lib/lectionary";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const lect: LectionaryData = JSON.parse(
  readFileSync(join(ROOT, "public/data/lectionary.json"), "utf8")
);

mkdirSync(join(ROOT, "scripts", "golden"), { recursive: true });
for (const year of GOLDEN_YEARS) {
  const out = Object.fromEntries(
    GOLDEN_REGIONS.map((region) => [region, goldenYear(year, region, lect)])
  );
  const dest = join(ROOT, "scripts", "golden", `${year}.json`);
  writeFileSync(dest, JSON.stringify(out, null, 1));
  console.log(`wrote ${dest}`);
}
