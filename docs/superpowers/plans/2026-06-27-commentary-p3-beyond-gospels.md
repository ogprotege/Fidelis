# Commentary Phase 3 — The Patristic Chain Beyond the Gospels (v1.15.0) Implementation Plan

[← Docs index](../../INDEX.md)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the patristic commentary chain beyond the four Gospels by ingesting the public-domain `HistoricalChristianFaith/Commentaries-Database` (ANF/NPNF, re-keyed to Scripture) into `public/data/commentary/patristic/{slug}.json` in the **identical** `{ "ch:v": [{ father, text }] }` shape, behind a provably-public-domain three-gate filter, so the existing `CommentarySheet` renders the new corpus unchanged.

**Architecture:** A new local data builder (`scripts/build-patristic.mjs`) downloads the source tarball at a pinned commit, parses each author's verse-keyed TOML, drops every excerpt that does not clear all three public-domain gates, remaps versification onto the bundle's Vulgate/Douay grid (reusing `lectionary.ts`'s `hebrewSpanToVulgate` and `build-catena.mjs`'s in-grid clamp pattern), skips the Gospels (the Catena's lane), and writes a staged subset of books, then reseals the manifest. `src/lib/commentary.ts` grows new dated `FATHERS[]` entries + a `PATRISTIC_BOOKS` gate; the Reader lights the action, and the CommentarySheet widens its Fathers-tab gate to `PATRISTIC_BOOKS`, loads the patristic corpus on non-Gospel books, and switches the source credit. The on-disk shape is byte-identical to the Catena, so `normalizeFather`/`groupCatena`/`fathersOf`/`sortChronological` and the sheet's grouping/chips/filter logic work without change.

**Tech Stack:** Node 22 ESM build scripts (`.mjs`), `tsx`/Node assertion harness (`scripts/test-data.ts`), React 18 + TypeScript (strict, `tsc --noEmit`) + Vite, CSS custom-property token system. No new runtime dependency; the TOML parser is purpose-built and fixture-asserted (the project's established pattern for USFM/OSIS).

## Global Constraints

Every task's requirements implicitly include these (from CLAUDE.md standing rules + the spec's §15 binding-rules section):

- **Never hand-edit `public/data/`.** The patristic corpus and `manifest.json` are written **only** by `scripts/build-patristic.mjs` (which calls `writeManifest(ROOT)` at the end); the harness re-walks the manifest. No `.json` under `public/data/` is ever edited by hand.
- **Copyrighted text is never bundled.** This is the load-bearing rule of the whole phase: the **three-gate public-domain filter** (author death-age ≥ `THIS_YEAR − 96`, a curated PD-author/edition allowlist, and a per-excerpt copyright/fair-use drop) removes every non-PD excerpt before it is written, and the harness proves none survives — mirroring `bundled: false` for NABRE/RSV-2CE.
- **Two-accent rule: `--purple` ACTS, `--gold` HONORS; no element wears both.** Tabs and chips are purple (interactive); attribution labels, dates, and the source credit are gold (honor). The gold dot stays Haydock-only; no new mark color is introduced. The CCC mark stays purple — untouched here.
- **§13 refusal list is binding.** No accounts/cloud, no AI summaries/paraphrase/chat, no social, no streaks/badges, no ads/IAP, no notification pressure, no red-letter text. Every comment is the source's verbatim public-domain text; nothing is generated.
- **The Today page never exceeds five cards.** This phase touches only the Reader and the Commentary sheet; it adds no Today card.
- **Node 22; CI green.** `lint → npm test → npm run build → npm run check-docs` must stay green on every commit (`build-patristic.mjs` is a *local* data build and does **not** run in CI; CI reads the committed `public/data/` and re-walks the manifest, exactly as it does for the Catena/Haydock corpora). `ios.yml` is unaffected (no native change).
- **Golden snapshots are untouched.** `scripts/golden/{2024..2027}.json` pin the computed calendar + Mass-reading resolution, not commentary. Do **not** run `npm run golden`; state this in the PR.
- **Service worker `DATA_CACHE` is NOT bumped.** Per the `pins.mjs` rule, these are *new* files (not changed bytes of existing ones); new files miss the cache and fetch fresh, and `manifest.json` is served network-first.

### Preconditions (read before starting)

- **Phase 1 (chronological ordering, v1.14.0) MUST already be on `main`.** Phase 3 reuses Phase 1's `year`/`circa` fields on `FatherDef`/`Father`, the `yearOf(id)`/`circaOf(id)` functions, `PSEUDO_YEARS`, and `sortChronological`. The new `FATHERS[]` entries in Task 3 carry a `year`, and the §16 coverage guard (Task 6) re-runs Phase 1's "every emitted id has a non-null `yearOf`" guard over the patristic corpus. **Task 0 verifies this**; if Phase 1 is absent, stop and ship it first (see Open Questions).
- This phase runs on the owner's Mac (network + `curl` + `tar` available), consistent with the rest of the data pipeline. `build-patristic.mjs` is run by hand once, its output committed.

---

## File Structure

| File | Responsibility | New? |
|---|---|---|
| `scripts/pins.mjs` | `+ patristic` pin (fixed commit SHA) | Modify |
| `scripts/build-patristic.mjs` | **new** — tarball fetch/cache, TOML parsers, three-gate PD filter, versification remap, in-grid clamp, Gospel skip, staged-book write, manifest reseal | Create |
| `src/lib/commentary.ts` | `+ PATRISTIC_BOOKS`; new dated `FATHERS[]` entries + alias growth for the beyond-Gospels authors | Modify |
| `src/components/CommentarySheet.tsx` | widen the Fathers-tab gate to `(isGospel \|\| PATRISTIC_BOOKS.has(book))` + load the `patristic` corpus on non-Gospel books (**always required**); Gospel/non-Gospel **credit-string switch**; durable **"Church Fathers"** tab label (Phase-2 fold-in, conditional) | Modify |
| `src/pages/Reader.tsx` | action-bar gating `\|\| PATRISTIC_BOOKS.has(bookSlug)` | Modify |
| `src/pages/Settings.tsx` | reword the `commentaryCatena` sub-label (Phase-2 fold-in, conditional) | Modify |
| `scripts/test-data.ts` | new parser+filter fixture (§14-style); patristic data assertions (§15-style); corpus coverage re-run over `patristic/` (§16) | Modify |
| `public/data/commentary/patristic/*.json`, `public/data/manifest.json` | **generated** by the builder — never hand-edited | Generated |
| `package.json` (+lock), `CHANGELOG.md`, `CLAUDE.md` | v1.15.0 release record | Modify |

---

## Task 0: Branch, verify preconditions, and confirm the baseline

**Files:** none modified (verification only).

- [ ] **Step: Branch.** From an up-to-date `main`:

```bash
git checkout main && git pull --ff-only
git checkout -b v1.15-beyond-gospels
```

- [ ] **Step: Verify Phase 1 (v1.14.0) is present.** Confirm the year layer exists — these greps MUST all return a hit:

```bash
grep -n "export function yearOf" src/lib/commentary.ts
grep -n "export function circaOf" src/lib/commentary.ts
grep -n "export function sortChronological" src/lib/commentary.ts
grep -n "year: number" src/lib/commentary.ts   # FatherDef/Father carry a year
```

Expected: a line for each. If any is missing, **stop** — Phase 1 has not shipped; this plan's Task 3 and Task 6 depend on it (see Open Questions for the standalone fallback).

- [ ] **Step: Confirm a green baseline.** `npm test && npm run build` — both green before any change.
- [ ] **Step: Confirm `tar` and `curl` are available** (the builder needs them): `which tar curl` returns two paths.

---

## Task 1: Pin the source in `scripts/pins.mjs`

The source is `HistoricalChristianFaith/Commentaries-Database` (ANF/NPNF, Schaff–Wace, PD by age, re-keyed to Scripture verses; per-author `metadata.toml` carries `default_year`). Default branch is `master`. Pin by **commit**, never a branch.

**Files:** Modify `scripts/pins.mjs` (after the `catena` entry, before the closing `}`).

**Interfaces:** Produces `PINS.patristic = { repo, commit }` consumed by `build-patristic.mjs` and asserted by `test-data.ts` §10's manifest-sources walk.

- [ ] **Step: Re-confirm the pin SHA against the real repo** (a SHA must never be invented). Run:

```bash
gh api repos/HistoricalChristianFaith/Commentaries-Database/commits/master --jq '.sha,.commit.committer.date'
```

Use the returned SHA. **At authoring time this resolved to `aa06110fd2dbe079847fedfe4756b392f78465dc` (committed 2026-06-23).** If `gh api` returns a newer SHA, use that one and note the date — but pin whatever you actually built against.

- [ ] **Step: Add the pin.** In `scripts/pins.mjs`, after the `catena: { ... }` block, add (keep the `aebb0f6…` catena block's trailing comma):

```js
  ,
  // Patristic chain beyond the Gospels (§4.3 Phase 3). ANF/NPNF (Schaff–Wace),
  // public domain by age, re-keyed to Scripture verses; per-author metadata.toml
  // carries default_year (death year), the first gate of the PD filter. The DB
  // ALSO carries still-copyright excerpts (e.g. CS Lewis, d. 1963) with no
  // copyright field — only default_year + source_title distinguish them — so the
  // build's three-gate filter (build-patristic.mjs) is the safety boundary.
  patristic: {
    repo: "HistoricalChristianFaith/Commentaries-Database",
    commit: "aa06110fd2dbe079847fedfe4756b392f78465dc"
  }
```

- [ ] **Step: Verify it parses.** `node -e "import('./scripts/pins.mjs').then(m => console.log(m.PINS.patristic.commit))"` prints the SHA.

- [ ] **Step: Update §10's hard-coded pin assertions (REQUIRED — adding a 5th pin breaks them).** `scripts/test-data.ts` §10 asserts the **exact** pin count and lists each manifest source by name, and `build-manifest.mjs --verify` (run by `npm test`) flags `source pin drift` for any `PINS` key the manifest's `sources` map omits. With a 5th pin these go red unless updated. In `scripts/test-data.ts`:
  - change `check("four 40-hex upstream pins declared in scripts/pins.mjs", declaredPins.length === 4, …)` to `declaredPins.length === 5` and reword the label to **"five 40-hex upstream pins …"**;
  - in the `manifestPins` array add `manifest.sources?.patristic?.commit,` and change the assertion's `manifestPins.length === 4` to `=== 5`.

- [ ] **Step: Reseal the manifest to record the new source (no data files yet).** `node scripts/build-manifest.mjs` (the sanctioned manifest builder — **not** a hand-edit; per the `pins.mjs` rule, re-sealing `manifest.json` needs no `sw.js` cache bump). `writeManifest` writes `sources: PINS`, so this adds the `patristic` entry to `manifest.sources` while the file/hash set is unchanged (no `patristic/*.json` exists until Task 4). This keeps `build-manifest.mjs --verify` green between now and Task 4's data build.

- [ ] **Step: Confirm green.** `npm test` — all harnesses + manifest verify pass (the §10 pin count is now 5; `manifest.sources.patristic` is present; no source-pin-drift).

- [ ] **Step: Commit.**

```bash
git add scripts/pins.mjs scripts/test-data.ts public/data/manifest.json
git commit -m "v1.15.0: pin the patristic commentary source (HCF Commentaries-Database)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Pure TOML parsers + the three-gate PD filter (TDD)

The DB's on-disk shape (verified against the pinned commit): each author is a top-level directory holding `<Book> <chapter>_<verse>.toml` files (ranges as `<Book> <ch>_<v1>-<v2>.toml`); each file is an array of `[[commentary]]` tables with a triple-quoted `quote`, a `source_title`, and a `source_url`. Author metadata is `<Author>/metadata.toml` with `default_year=<int>`. There is **no** structured `copyright`/`fairuse` field — still-copyright authors (CS Lewis, d. 1963; Bonaventure; Cornelius à Lapide; modern translations) are caught by the **year gate**, the **author allowlist**, and a **source denylist**. These three pure functions are the entire safety boundary, so they are written test-first.

**Files:** Create `scripts/build-patristic.mjs` (parsers + filter only this task; orchestration in Task 4); Modify `scripts/test-data.ts` (new §23 fixture block — note: §18 is **already taken** by "Search group filters" and the harness already runs through §22, so the new block is **§23**, appended at the end of the file).

**Interfaces (Produces):**
- `parseMetaToml(text: string): { default_year: number | null }`
- `parseCommentaryToml(text: string): { quote: string; sourceTitle: string; sourceUrl: string }[]`
- `filterExcerpts(args: { author: string; defaultYear: number | null; excerpts: Excerpt[]; allowlist: Set<string> }): { kept: Excerpt[]; age: number; allow: number; flag: number; noSource: number }` where `Excerpt = { quote, sourceTitle, sourceUrl }`.
- `PD_CUTOFF: number` (= `new Date().getFullYear() - 96`), `COPYRIGHT_SOURCE: RegExp`.

- [ ] **Step: Write the failing test.** In `scripts/test-data.ts`, at the **end of the file**, after the §22 import-parsers block (the current last section, ≈ line 1876), add a new block (the harness `check(...)` helper, top-level `await import(...)`, and the static-import style all already exist in this file — §18–§22 use exactly this pattern):

```ts
// §23 — Patristic builder: pure TOML parsers + the three-gate PD filter
//        (scripts/build-patristic.mjs). The filter is the copyright safety
//        boundary, so it is asserted exhaustively against fixtures shaped like
//        the real DB (which carries still-copyright excerpts with NO flag field).
console.log("");
{
  const { parseMetaToml, parseCommentaryToml, filterExcerpts, PD_CUTOFF } =
    await import("./build-patristic.mjs");

  // metadata.toml
  check("parseMetaToml reads default_year", parseMetaToml("default_year=430\nwiki='x'").default_year === 430);
  check("parseMetaToml: missing year → null", parseMetaToml("wiki='x'").default_year === null);

  // verse file: two [[commentary]] tables, triple-quoted quote + titles
  const SAMPLE = [
    "[[commentary]]",
    "quote='''",
    "The reason why love does not envy is because it is not puffed up.",
    "'''",
    "source_url='https://historicalchristian.faith/by_father.php?file=x'",
    'source_title="LETTER 22, To Honoratus"',
    "",
    "[[commentary]]",
    'quote="""A single-line double-triple quote."""',
    "source_url=''",
    'source_title="City of God 14.28"'
  ].join("\n");
  const ex = parseCommentaryToml(SAMPLE);
  check("parseCommentaryToml: two commentary blocks", ex.length === 2);
  check("parseCommentaryToml: triple-quote body trimmed", ex[0].quote === "The reason why love does not envy is because it is not puffed up.");
  check("parseCommentaryToml: source_title captured", ex[0].sourceTitle === "LETTER 22, To Honoratus");
  check("parseCommentaryToml: double-triple-quote body", ex[1].quote === "A single-line double-triple quote.");

  // THE THREE GATES.
  const ALLOW = new Set(["Augustine of Hippo"]);
  const pdEx = { quote: "x", sourceTitle: "NPNF1-02 City of God", sourceUrl: "u" };

  // clean PD excerpt survives all three gates
  const a = filterExcerpts({ author: "Augustine of Hippo", defaultYear: 430, excerpts: [pdEx], allowlist: ALLOW });
  check("filter: clean PD excerpt is kept", a.kept.length === 1 && a.age === 0 && a.allow === 0 && a.flag === 0);

  // GATE 1 — author age: CS Lewis (d. 1963) dropped wholesale (no flag field exists upstream)
  const lewis = filterExcerpts({ author: "CS Lewis", defaultYear: 1963, excerpts: [{ quote: "y", sourceTitle: "Mere Christianity", sourceUrl: "" }], allowlist: new Set(["CS Lewis"]) });
  check("filter GATE 1: too-recent author dropped by age", lewis.kept.length === 0 && lewis.age === 1);
  check("filter GATE 1: missing death year dropped by age", filterExcerpts({ author: "X", defaultYear: null, excerpts: [pdEx], allowlist: new Set(["X"]) }).age === 1);
  check("filter GATE 1: PD_CUTOFF is this year minus 96", PD_CUTOFF === new Date().getFullYear() - 96);

  // GATE 2 — author/edition allowlist: a PD-by-age author NOT on the curated list is dropped
  const lapide = filterExcerpts({ author: "Cornelius a Lapide", defaultYear: 1637, excerpts: [pdEx], allowlist: ALLOW });
  check("filter GATE 2: non-allowlisted PD-age author dropped", lapide.kept.length === 0 && lapide.allow === 1);

  // GATE 3 — per-excerpt copyright/fair-use source drop, even for an allowlisted PD author
  const flagged = filterExcerpts({ author: "Augustine of Hippo", defaultYear: 430, excerpts: [{ quote: "z", sourceTitle: "Ancient Christian Commentary on Scripture, IVP", sourceUrl: "" }], allowlist: ALLOW });
  check("filter GATE 3: copyright-marked source dropped", flagged.kept.length === 0 && flagged.flag === 1);

  // no-source excerpt is NEVER kept (the "kept with no edition" build-error condition)
  const nosrc = filterExcerpts({ author: "Augustine of Hippo", defaultYear: 430, excerpts: [{ quote: "q", sourceTitle: "", sourceUrl: "" }], allowlist: ALLOW });
  check("filter: sourceless excerpt is never kept", nosrc.kept.length === 0 && nosrc.noSource === 1);
}
```

- [ ] **Step: Run it, expect FAIL.** `npm test` — fails with a module-resolution error (`Cannot find module './build-patristic.mjs'`) or, once the file exists with stubs, failing `check`s. Expected first run: the import throws.
- [ ] **Step: Implement the parsers + filter.** Create `scripts/build-patristic.mjs` with the pure layer (orchestration is added in Task 4):

```js
#!/usr/bin/env node
/**
 * Builds the patristic commentary layer BEYOND the Gospels (spec §4.3 Phase 3)
 * into per-book verse-keyed JSON under public/data/commentary/patristic/<slug>.json,
 * shaped IDENTICALLY to the Catena so the CommentarySheet renders it unchanged:
 *
 *   { "1:1": [ { "father": "Augustine of Hippo", "text": "..." }, ... ], ... }
 *
 * Source: HistoricalChristianFaith/Commentaries-Database (ANF/NPNF, Schaff–Wace,
 * public domain by age, re-keyed to Scripture). Pinned by commit in scripts/pins.mjs;
 * the cache is keyed by the pin. The DB ALSO ships still-copyright excerpts (CS
 * Lewis d.1963; modern translations) with NO copyright field — so the three-gate
 * filter (filterExcerpts) is the copyright boundary, proven by scripts/test-data.ts §23.
 *
 * Gospels are skipped (the Catena's lane); a staged subset of books ships first.
 *
 * Usage: node scripts/build-patristic.mjs [--cache-dir <dir>]
 */
import { mkdir, readFile, writeFile, access, readdir } from "node:fs/promises";
import { readFileSync, realpathSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname, basename } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { PINS } from "./pins.mjs";
import { hebrewSpanToVulgate } from "../src/lib/lectionary.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PIN = PINS.patristic;
const cacheArg = process.argv.indexOf("--cache-dir");
const CACHE = cacheArg !== -1 ? process.argv[cacheArg + 1] : join(ROOT, ".cache");

// ── PD safety constants ──────────────────────────────────────────────────────
// life-plus-70 AND the US 95-year rule, with margin: a death year on or before
// this is comfortably public domain everywhere.
export const PD_CUTOFF = new Date().getFullYear() - 96;
// Gate 3 denylist: source titles/urls of known modern/copyright editions and
// series. Any excerpt whose source matches is dropped regardless of gates 1–2.
export const COPYRIGHT_SOURCE =
  /ancient christian commentary|\bACCS\b|ivp|intervarsity|inter-varsity|hendrickson|new city press|catholic university of america|paulist press|baker academic|eerdmans|zondervan|copyright|all rights reserved|\(c\)\s*\d{4}|©/i;

// ── pure TOML parsers (asserted by fixture in scripts/test-data.ts §23) ───────

/** Read one TOML string value: triple-quoted ('''/""") multiline, or '/"-quoted. */
function readTomlString(block, key) {
  const m = new RegExp(`(?:^|\\n)\\s*${key}\\s*=\\s*`).exec(block);
  if (!m) return null;
  const rest = block.slice(m.index + m[0].length);
  const triple = rest.match(/^('''|""")([\s\S]*?)\1/);
  if (triple) return triple[2].replace(/^\r?\n/, "");
  const single = rest.match(/^(['"])([\s\S]*?)\1/);
  return single ? single[2] : null;
}

/** Parse <Author>/metadata.toml → { default_year }. */
export function parseMetaToml(text) {
  const m = text.match(/(?:^|\n)\s*default_year\s*=\s*(-?\d+)/);
  return { default_year: m ? Number(m[1]) : null };
}

/** Parse a verse file's [[commentary]] tables → [{ quote, sourceTitle, sourceUrl }]. */
export function parseCommentaryToml(text) {
  const out = [];
  const parts = text.split(/(?:^|\n)\s*\[\[\s*commentary\s*\]\]\s*(?:\n|$)/);
  for (const block of parts.slice(1)) {
    const quote = (readTomlString(block, "quote") ?? "").trim();
    if (!quote) continue;
    out.push({
      quote,
      sourceTitle: (readTomlString(block, "source_title") ?? "").trim(),
      sourceUrl: (readTomlString(block, "source_url") ?? "").trim()
    });
  }
  return out;
}

// ── the three-gate public-domain filter (the safety boundary) ─────────────────

/**
 * Keep an excerpt only if it clears ALL three gates:
 *   1. author age — defaultYear present AND <= PD_CUTOFF;
 *   2. author allowlist — the curated PD-edition author set (the "edition" gate,
 *      adapted: the DB has no per-excerpt edition field, so we allowlist the
 *      authors whose DB text is verified ANF/NPNF/pre-1928 PD);
 *   3. flag — the excerpt's source is not on the COPYRIGHT_SOURCE denylist and
 *      is not empty (a sourceless excerpt is NEVER kept — the build-error case).
 * Returns the kept excerpts plus drop counts for the build log.
 */
export function filterExcerpts({ author, defaultYear, excerpts, allowlist }) {
  const r = { kept: [], age: 0, allow: 0, flag: 0, noSource: 0 };
  if (defaultYear == null || defaultYear > PD_CUTOFF) { r.age += excerpts.length; return r; }
  if (!allowlist.has(author)) { r.allow += excerpts.length; return r; }
  for (const e of excerpts) {
    if (!e.sourceTitle && !e.sourceUrl) { r.noSource++; continue; }
    if (COPYRIGHT_SOURCE.test(e.sourceTitle) || COPYRIGHT_SOURCE.test(e.sourceUrl)) { r.flag++; continue; }
    r.kept.push(e);
  }
  return r;
}
```

- [ ] **Step: Add `build-patristic` to §10's pinned-fetch guard.** Now that `scripts/build-patristic.mjs` exists (and already imports `PINS` / uses `PINS.patristic`, with no `/master/` URL), add it to the `buildSrcs` list in `scripts/test-data.ts` §10 so its pinned-fetch discipline is asserted like the other builders: change `["build-data", "build-lectionary", "build-haydock", "build-catena"]` to `["build-data", "build-lectionary", "build-haydock", "build-catena", "build-patristic"]`. (The `pinnedFetch` check then requires the new file contain `PINS.` and no `/master/`, which the Task-2 header already satisfies.)

- [ ] **Step: Run, expect PASS.** `npm test` — the §23 block is green; the rest of the harness stays green (the §10 manifest-pin walk was made consistent in Task 1's reseal, so adding the pin did not turn it red).
- [ ] **Step: Commit.**

```bash
git add scripts/build-patristic.mjs scripts/test-data.ts
git commit -m "v1.15.0: patristic TOML parsers + three-gate PD filter (pure, fixture-tested)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Grow the year-table, aliases, allowlist, and `PATRISTIC_BOOKS` (TDD)

The DB names authors in full ("John Chrysostom", "Gregory of Nazianzus", "Augustine of Hippo"), introduces Fathers the Gospel Catena never used (Tertullian, Irenaeus, Ephrem, Theodoret, Caesarius of Arles, …), and uses dir-name forms that the Catena-tuned aliases miss (e.g. "John Chrysostom" does not `startsWith` `"chrysostom"`). Each ingested author must normalize to a **dated** `FATHERS[]` Father (the §16 guard forces it). This task is the forcing function: the allowlist in the builder (Task 4) is **exactly** the set wired here.

**Files:** Modify `src/lib/commentary.ts` (the `FATHERS[]` array, `DOCTOR_IDS`, and a new export `PATRISTIC_BOOKS`); Modify `scripts/test-data.ts` (§23 additions).

**Interfaces:**
- Consumes (Phase 1): `yearOf(id): number | null`, the `FatherDef`/`Father` `year`/`circa?` fields.
- Produces: extended `FATHERS[]` (new ids with `year`/`aliases`/`isDoctor`/`circa?`), new aliases on existing Fathers, `export const PATRISTIC_BOOKS: ReadonlySet<string>`.

- [ ] **Step: Write the failing test.** Append to the §23 block in `scripts/test-data.ts`:

```ts
{
  const { normalizeFather, yearOf, isDoctor, PATRISTIC_BOOKS } = await import("../src/lib/commentary");
  const F = (raw) => normalizeFather(raw);

  // The DB dir-name forms each resolve to a Father (the §16 guard depends on it).
  const DB_NAMES = [
    "Augustine of Hippo", "John Chrysostom", "Jerome", "Ambrose of Milan",
    "Origen of Alexandria", "Basil of Caesarea", "Gregory of Nyssa",
    "Gregory of Nazianzus", "Gregory the Dialogist", "Cyril of Alexandria",
    "Cyril of Jerusalem", "Athanasius of Alexandria", "Hilary of Poitiers",
    "Leo the Great", "Bede", "John Damascene", "Clement of Alexandria",
    "Cyprian", "John Cassian", "Tertullian", "Irenaeus", "Ephrem the Syrian",
    "Theodoret of Cyrus", "Caesarius of Arles", "Justin Martyr",
    "Hippolytus of Rome", "Prosper of Aquitaine", "Fulgentius of Ruspe"
  ];
  check("every allowlisted DB author normalizes to a Father",
    DB_NAMES.every((n) => F(n).kind === "father"),
    DB_NAMES.filter((n) => F(n).kind !== "father").join(", ") || "all father");

  // ...and each resolves to a dated Father (Phase-1 yearOf is non-null), so the
  // chronological sort never silently front-loads a new author at year 0.
  check("every allowlisted DB author has a non-null yearOf",
    DB_NAMES.every((n) => { const f = F(n); return f.kind === "father" && yearOf(f.id) !== null; }),
    DB_NAMES.filter((n) => { const f = F(n); return !(f.kind === "father" && yearOf(f.id) !== null); }).join(", ") || "all dated");

  // identity spot-checks that matter for the Doctors-only filter
  check("'John Chrysostom' → chrysostom (Doctor)", F("John Chrysostom").id === "chrysostom" && F("John Chrysostom").isDoctor === true);
  check("'Gregory of Nazianzus' → gregory-nazianzen, NOT gregory-the-great", F("Gregory of Nazianzus").id === "gregory-nazianzen");
  check("'Gregory the Dialogist' → gregory-the-great (Doctor)", F("Gregory the Dialogist").id === "gregory-the-great" && F("Gregory the Dialogist").isDoctor === true);
  check("'Ephrem the Syrian' → ephrem (a Doctor of the Church)", F("Ephrem the Syrian").id === "ephrem" && isDoctor("ephrem") === true);
  check("'Tertullian' → tertullian (not a Doctor)", F("Tertullian").id === "tertullian" && F("Tertullian").isDoctor === false);
  check("'Cyril of Jerusalem' is distinct from Cyril of Alexandria", F("Cyril of Jerusalem").id === "cyril-of-jerusalem" && F("Cyril of Alexandria").id === "cyril");
  check("'Theodoret of Cyrus' → theodoret, NOT the existing 'theodotus'", F("Theodoret of Cyrus").id === "theodoret");

  // PATRISTIC_BOOKS gates the Reader action on non-Gospel books and excludes Gospels.
  check("PATRISTIC_BOOKS holds the staged books, excludes the Gospels",
    PATRISTIC_BOOKS.has("genesis") && PATRISTIC_BOOKS.has("romans") &&
    !PATRISTIC_BOOKS.has("matthew") && !PATRISTIC_BOOKS.has("john"));
}
```

- [ ] **Step: Run it, expect FAIL.** `npm test` — fails (e.g. `PATRISTIC_BOOKS` undefined; "John Chrysostom" → continuation; "Gregory of Nazianzus" → gregory-the-great; "Tertullian"/"Ephrem" → continuation).
- [ ] **Step: Implement — add new dated Fathers + aliases.** In `src/lib/commentary.ts`, add the new entries to `FATHERS[]`. **Order matters** (top-down `startsWith` resolution): place `cyril-of-jerusalem` *before* the bare `cyril`, and a `gregory-of-nazianzus` alias on the existing `gregory-nazianzen` *before* `gregory-the-great`. Insert this block **immediately before the existing bare `cyril` entry** (`{ id: "cyril", … }`, ≈ line 83). That single placement satisfies every top-down `startsWith` ordering constraint at once: `cyril-of-jerusalem` lands before bare `cyril` (so "cyril of jerusalem" is not absorbed by the bare `cyril` alias), and `theodoret` lands before the existing `theodotus` (whose `theod` alias would otherwise absorb the DB's "Theodoret of Cyrus"). The `year` field is Phase-1's; cross-checked against the DB's `default_year`:

```ts
  // ── Beyond-Gospels Fathers (§4.3 Phase 3). Years cross-checked vs. the DB's
  //    metadata.toml default_year. circa where the death year is approximate. ──
  { id: "irenaeus", name: "Irenaeus of Lyons", aliases: ["irenaeus"], year: 202, circa: true },
  { id: "justin-martyr", name: "Justin Martyr", aliases: ["justin martyr", "justin"], year: 165, circa: true },
  { id: "tertullian", name: "Tertullian", aliases: ["tertullian"], year: 225, circa: true },
  { id: "hippolytus", name: "Hippolytus of Rome", aliases: ["hippolytus"], year: 235, circa: true },
  { id: "ephrem", name: "Ephrem the Syrian", aliases: ["ephrem the syrian", "ephrem", "ephraim", "ephraem"], year: 373 },
  { id: "theodoret", name: "Theodoret of Cyrus", aliases: ["theodoret"], year: 458, circa: true },
  { id: "prosper", name: "Prosper of Aquitaine", aliases: ["prosper"], year: 455, circa: true },
  { id: "caesarius", name: "Caesarius of Arles", aliases: ["caesarius"], year: 542 },
  { id: "fulgentius", name: "Fulgentius of Ruspe", aliases: ["fulgentius"], year: 533 },
  // Cyril of Jerusalem — a Doctor, distinct from Cyril of Alexandria. MUST precede
  // the bare "cyril" entry so "cyril of jerusalem" wins the startsWith match.
  { id: "cyril-of-jerusalem", name: "Cyril of Jerusalem", aliases: ["cyril of jerusalem", "cyril jerus"], year: 386 },
```

Then, on the **existing** entries, extend `aliases` to cover the DB's full-name forms:
- `chrysostom`: add `"john chrysostom"` (so it does not fall to a "john*" miss).
- `gregory-nazianzen`: add `"gregory of nazianzus"` (the DB form).
- `gregory-the-great`: add `"gregory the dialogist"` and `"gregory the great"`.
- `origen`: add `"origen of alexandria"`.
- `clement-of-alexandria` already matches `"clement"`; no change. `clement-of-rome` (a real DB author, fl. c. 99) — add a new entry `{ id: "clement-of-rome", name: "Clement of Rome", aliases: ["clement of rome", "clement rom"], year: 99, circa: true }` placed **before** `clement-of-alexandria`.
- Confirm `john-damascene` (alias `"john of damascus"`), `cyprian`, `cassian`, `bede`, `leo`, `hilary` (alias `"hilary"` matches "hilary of poitiers"), `athanasius`, `basil`, `ambrose`, `augustine`, `jerome` already match their DB dir-name forms via `startsWith` — they do.

Each new entry carries a Phase-1 `year`; verify the `FatherDef`/`Father` interfaces already declare `year: number; circa?: boolean;` (Phase 1). The `cyril` comment block already notes both Cyrils are Doctors — `cyril-of-jerusalem` joins `DOCTOR_IDS`.

- [ ] **Step: Implement — Doctors set.** In `DOCTOR_IDS`, add `"ephrem"` and `"cyril-of-jerusalem"` (both Doctors of the Church). Leave Tertullian, Irenaeus, Justin, Hippolytus, Theodoret, Prosper, Caesarius, Fulgentius, Clement of Rome out (not Doctors).

- [ ] **Step: Implement — `PATRISTIC_BOOKS`.** Below `GOSPELS` in `src/lib/commentary.ts`, add the staged-book gate (must equal `STAGE_BOOKS` in the builder, Task 4):

```ts
/** The non-Gospel books the §4.3 Phase-3 patristic corpus ships (v1.15.0). The
 *  Reader lights the Commentary action on these even before loading the file
 *  (coverage is sparse, so it cannot be assumed verse-by-verse like the Catena).
 *  MUST stay in lockstep with STAGE_BOOKS in scripts/build-patristic.mjs. Never
 *  includes a Gospel — those are the Catena's lane. */
export const PATRISTIC_BOOKS: ReadonlySet<string> = new Set([
  "genesis", "psalms", "isaiah", "acts", "romans",
  "1-corinthians", "2-corinthians", "galatians", "ephesians", "philippians",
  "colossians", "1-thessalonians", "2-thessalonians", "1-timothy", "2-timothy",
  "titus", "philemon", "hebrews", "james", "1-peter", "2-peter",
  "1-john", "2-john", "3-john", "jude", "revelation"
]);
```

- [ ] **Step: Run, expect PASS.** `npm test` — the §23 additions are green. Then `npm run build` — `tsc` clean (the new `FATHERS[]` entries satisfy `FatherDef`; `PATRISTIC_BOOKS` is exported).
- [ ] **Step: Commit.**

```bash
git add src/lib/commentary.ts scripts/test-data.ts
git commit -m "v1.15.0: dated FATHERS[] growth + DB-name aliases + PATRISTIC_BOOKS gate

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: The builder orchestration — fetch, filter, remap, write, reseal

Wire the pure layer (Task 2) and the allowlist (Task 3) into a full builder: download the source tarball at the pin, walk the allowlisted author directories, parse + filter every verse file, remap versification onto the DRC grid (Psalms via `hebrewSpanToVulgate`, identity elsewhere with an in-grid clamp), skip the Gospels, write only the staged books, then reseal the manifest.

**Files:** Modify `scripts/build-patristic.mjs` (append the orchestration + `PD_AUTHORS`/`STAGE_BOOKS`/`BOOK_SLUG` + `main()`); Modify `scripts/test-data.ts` (§15-style patristic data assertions).

**Interfaces:**
- Consumes: `parseMetaToml`, `parseCommentaryToml`, `filterExcerpts` (Task 2); `PINS.patristic` (Task 1); `hebrewSpanToVulgate` (lectionary.ts); `writeManifest` (build-manifest.mjs).
- Produces: `public/data/commentary/patristic/<slug>.json` files; re-sealed `public/data/manifest.json`; build-log counts.

- [ ] **Step: Implement the build constants + helpers.** Append to `scripts/build-patristic.mjs`, after the filter:

```js
// ── allowlist (gate 2) — EXACTLY the authors wired into FATHERS[] (commentary.ts).
//    Each must normalize to a dated Father; the §16 corpus guard re-asserts it.
//    These are the DB dir names whose text is verified ANF/NPNF/pre-1928 PD.
const PD_AUTHORS = new Set([
  "Augustine of Hippo", "John Chrysostom", "Jerome", "Ambrose of Milan",
  "Origen of Alexandria", "Basil of Caesarea", "Gregory of Nyssa",
  "Gregory of Nazianzus", "Gregory the Dialogist", "Cyril of Alexandria",
  "Cyril of Jerusalem", "Athanasius of Alexandria", "Hilary of Poitiers",
  "Leo the Great", "Bede", "John Damascene", "Clement of Alexandria",
  "Clement of Rome", "Cyprian", "John Cassian", "Tertullian", "Irenaeus",
  "Ephrem the Syrian", "Theodoret of Cyrus", "Caesarius of Arles",
  "Justin Martyr", "Hippolytus of Rome", "Prosper of Aquitaine",
  "Fulgentius of Ruspe"
]);

// ── staged books (v1.15.0) — MUST equal PATRISTIC_BOOKS in commentary.ts. The
//    full canon is large; ship Genesis/Psalms/Isaiah/Acts/Epistles/Revelation
//    first and widen in a later release after measuring the bundle.
const STAGE_BOOKS = new Set([
  "genesis", "psalms", "isaiah", "acts", "romans",
  "1-corinthians", "2-corinthians", "galatians", "ephesians", "philippians",
  "colossians", "1-thessalonians", "2-thessalonians", "1-timothy", "2-timothy",
  "titus", "philemon", "hebrews", "james", "1-peter", "2-peter",
  "1-john", "2-john", "3-john", "jude", "revelation"
]);

// The four Gospels stay the Catena's lane — never double-covered here.
const GOSPEL_SLUGS = new Set(["matthew", "mark", "luke", "john"]);

// DB book-name → our DRC slug. The generic rule (lowercase, spaces→'-') already
// yields the staged NT/Genesis/Psalms/Isaiah slugs; explicit aliases cover the
// few names that differ. Anything unresolved is skipped (and logged).
const BOOK_ALIAS = {
  "song of solomon": "song-of-songs",
  "psalm": "psalms",
  "revelation of john": "revelation",
  "acts of the apostles": "acts"
};
function bookSlug(name) {
  const n = name.trim().toLowerCase();
  return BOOK_ALIAS[n] ?? n.replace(/\s+/g, "-");
}

// Filename grammar: "<Book name> <ch>_<v>[-<v2>].toml" (book name may contain
// spaces and a leading ordinal, e.g. "1 Corinthians 13_4.toml").
const FILE_RE = /^(.+) (\d+)_(\d+)(?:-(\d+))?\.toml$/;

const exists = (p) => access(p).then(() => true, () => false);

function sortKeys(obj) {
  const out = {};
  for (const k of Object.keys(obj).sort((a, b) => {
    const [ac, av] = a.split(":").map(Number);
    const [bc, bv] = b.split(":").map(Number);
    return ac - bc || av - bv;
  })) out[k] = obj[k];
  return out;
}

/** Append, dropping an exact duplicate (a remap can collapse two source verses). */
function addComments(book, key, comments) {
  const arr = (book[key] ??= []);
  for (const c of comments) {
    const s = JSON.stringify(c);
    if (!arr.some((x) => JSON.stringify(x) === s)) arr.push(c);
  }
}

/** Psalms: the DB is Hebrew/modern-versified; route every key through the
 *  lectionary's split helper (the SAME helper build-haydock uses for 115/147).
 *  Other staged books align 1:1 with the DRC grid; the in-grid clamp drops any
 *  residual misalignment. (A later stage adding Malachi/Sirach/3-4 Kings/Joel
 *  extends this with an explicit per-book offset map, build-catena style.) */
function remapKey(slug, ch, v) {
  if (slug === "psalms") { const r = hebrewSpanToVulgate(ch, v, v)[0]; return [r[0], r[1]]; }
  return [ch, v];
}

/** Download + extract the source tree at the pin, returning the extracted root. */
async function fetchTree() {
  const sha12 = PIN.commit.slice(0, 12);
  const dir = join(CACHE, `patristic-${sha12}`);
  if (await exists(dir)) return dir;
  await mkdir(CACHE, { recursive: true });
  const tgz = join(CACHE, `patristic-${sha12}.tar.gz`);
  if (!(await exists(tgz))) {
    const url = `https://codeload.github.com/${PIN.repo}/tar.gz/${PIN.commit}`;
    console.log(`  downloading ${url}`);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    await writeFile(tgz, Buffer.from(await res.arrayBuffer()));
  }
  await mkdir(dir, { recursive: true });
  execFileSync("tar", ["-xzf", tgz, "-C", dir, "--strip-components", "1"]);
  return dir;
}
```

- [ ] **Step: Implement `main()` + the entrypoint.** Append:

```js
async function main() {
  const tree = await fetchTree();
  const outDir = join(ROOT, "public", "data", "commentary", "patristic");
  await mkdir(outDir, { recursive: true });

  // Accumulate per-slug books; cache each staged book's DRC grid once.
  const books = {};                       // slug -> { "ch:v": [{father,text}] }
  const drcCache = {};
  const drcGrid = (slug) => (drcCache[slug] ??= JSON.parse(
    readFileSync(join(ROOT, "public", "data", "drc", `${slug}.json`), "utf8")).chapters);

  const counts = { kept: 0, age: 0, allow: 0, flag: 0, noSource: 0, offGrid: 0, gospel: 0, unstaged: 0, unresolved: 0 };
  const offGridSamples = [];

  for (const author of (await readdir(tree, { withFileTypes: true })).filter((d) => d.isDirectory())) {
    const name = author.name;
    if (!PD_AUTHORS.has(name)) continue;  // gate 2, fast-path (also skips biblical-book dirs)
    const authorDir = join(tree, name);
    const metaPath = join(authorDir, "metadata.toml");
    const defaultYear = (await exists(metaPath))
      ? parseMetaToml(await readFile(metaPath, "utf8")).default_year : null;

    for (const fname of await readdir(authorDir)) {
      const fm = FILE_RE.exec(fname);
      if (!fm) continue;                  // metadata.toml and anything non-verse
      const slug = bookSlug(fm[1]);
      if (GOSPEL_SLUGS.has(slug)) { counts.gospel++; continue; }
      if (!STAGE_BOOKS.has(slug)) { counts.unstaged++; continue; }
      if (!drcCache[slug] && !(await exists(join(ROOT, "public", "data", "drc", `${slug}.json`)))) { counts.unresolved++; continue; }

      const excerpts = parseCommentaryToml(await readFile(join(authorDir, fname), "utf8"));
      const f = filterExcerpts({ author: name, defaultYear, excerpts, allowlist: PD_AUTHORS });
      counts.age += f.age; counts.allow += f.allow; counts.flag += f.flag; counts.noSource += f.noSource;
      if (!f.kept.length) continue;

      const ch0 = Number(fm[2]), v1 = Number(fm[3]), v2 = fm[4] ? Number(fm[4]) : v1;
      const grid = drcGrid(slug);
      const comments = f.kept.map((e) => ({ father: name, text: e.quote }));
      for (let v = v1; v <= v2; v++) {
        const [ch, vv] = remapKey(slug, ch0, v);
        const inGrid = ch >= 1 && ch <= grid.length && vv >= 1 && vv <= (grid[ch - 1]?.length ?? 0);
        if (!inGrid) {
          counts.offGrid++;
          if (offGridSamples.length < 12) offGridSamples.push(`${name}: ${slug} ${ch0}:${v}`);
          continue;
        }
        addComments((books[slug] ??= {}), `${ch}:${vv}`, comments);
        counts.kept += comments.length;
      }
    }
  }

  // A sourceless excerpt must NEVER be kept; a non-zero tally is a build error.
  if (counts.noSource > 0) {
    throw new Error(`build-patristic: ${counts.noSource} excerpt(s) of an allowlisted PD author had no source — refusing to bundle unverifiable text (§10.3).`);
  }

  let totalKeys = 0;
  for (const slug of Object.keys(books)) {
    totalKeys += Object.keys(books[slug]).length;
    await writeFile(join(outDir, `${slug}.json`), JSON.stringify(sortKeys(books[slug])));
  }
  console.log(`Patristic: ${Object.keys(books).length} books, ${totalKeys} verse-keys, ${counts.kept} comment-segments kept.`);
  console.log(`  dropped — age:${counts.age} allowlist:${counts.allow} flag:${counts.flag} off-grid:${counts.offGrid} gospel:${counts.gospel} unstaged:${counts.unstaged}`);
  if (offGridSamples.length) console.log(`  off-grid samples: ${offGridSamples.join(", ")}`);

  const { writeManifest } = await import("./build-manifest.mjs");
  await writeManifest(ROOT);
}

const isMain =
  process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href;
if (isMain) await main();
```

- [ ] **Step: Run the builder.** `node scripts/build-patristic.mjs`. Expect: a `Patristic: N books, … verse-keys` summary; non-zero `age`/`allowlist`/`flag` drop counts; `patristic/*.json` files appear under `public/data/commentary/`; the build does NOT throw (`noSource` is 0). Inspect the diff: `git status public/data/commentary/patristic | head` and spot-read one file (`python3 -m json.tool public/data/commentary/patristic/romans.json | head`) to confirm the `{ "ch:v": [{ "father": "...", "text": "..." }] }` shape.
- [ ] **Step: Verify the manifest resealed.** `npm run verify-data` — green (the new files are hashed; `manifest.sources.patristic` is present; `bundles.commentary` byte total grew).
- [ ] **Step: Add a package script (optional convenience).** If a `data:*`/`commentary` script convention exists in `package.json`, add `"build-patristic": "node scripts/build-patristic.mjs"` beside `build-haydock`/`build-catena` if those scripts exist; otherwise skip (the builder runs directly). Do not invent a convention.
- [ ] **Step: Write the §15-style data assertions.** In `scripts/test-data.ts`, inside the existing §15 block (Commentary data), extend the `readLayer`/`countKeys` walk to include `patristic`, and add assertions after the Catena coverage check:

```ts
  // §4.3 Phase 3 — the patristic corpus (beyond the Gospels).
  const patristic = readLayer("patristic");
  const patristicKeys = countKeys(patristic);   // reuses the in-grid keyFaults walk above
  check("every patristic key lands on a real DRC coordinate", keyFaults.length === 0, keyFaults.slice(0, 6).join(", "));
  check("patristic corpus excludes the four Gospels (the Catena's lane)",
    ["matthew", "mark", "luke", "john"].every((g) => !(g in patristic)),
    Object.keys(patristic).filter((b) => ["matthew","mark","luke","john"].includes(b)).join(", "));
  check("patristic corpus covers staged books and is non-trivial",
    "romans" in patristic && "genesis" in patristic && patristicKeys > 500,
    `${Object.keys(patristic).length} books, ${patristicKeys} keys`);
  const sampleP = Object.values(patristic)[0] && Object.values(Object.values(patristic)[0])[0]?.[0];
  check("patristic entries are { father, text } (identical to Catena)",
    !!sampleP && typeof sampleP.text === "string" && "father" in sampleP);
```

(Note: the `keyFaults` array and `countKeys` are defined earlier in §15; calling `countKeys(patristic)` appends any patristic off-grid key to the same `keyFaults`, so the existing "every … key lands on a real DRC coordinate" assertion now covers patristic too. Adjust the first existing assertion's label if it should name patristic, or keep the dedicated one above.)

- [ ] **Step: Run, expect PASS.** `npm test` — §15 patristic assertions green; `npm run build` green.
- [ ] **Step: Commit** (the builder + the generated corpus + manifest + tests, together):

```bash
git add scripts/build-patristic.mjs scripts/test-data.ts public/data/commentary/patristic public/data/manifest.json
git commit -m "v1.15.0: build the patristic corpus (staged), reseal manifest, assert PD + grid

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Corpus-wide PD proof + normaliser coverage over `patristic/` (§16)

The §16 guards (≥93% of entries resolve to a Father; the "source" fallback hides no real Father; every emitted id is dated) must hold over the **patristic** corpus too — and a data-level PD proof must show no surviving `father` maps to a copyright-window author. This is the forcing function that the allowlist and the FATHERS growth are complete.

**Files:** Modify `scripts/test-data.ts` (extend the §16 corpus-wide guard to walk `catena/` **and** `patristic/`; add the PD proof).

- [ ] **Step: Write the failing test.** In the §16 block, after the existing Catena corpus-wide guard (the `cdir`/`labelCounts` loop), add a parallel walk over patristic and a PD proof:

```ts
  // §4.3 Phase 3 — re-run the corpus-wide guards over the patristic corpus, and
  // prove every surviving author is public domain (death year on/before cutoff).
  {
    const { yearOf } = await import("../src/lib/commentary");
    const PD_CUTOFF = new Date().getFullYear() - 96;
    const pdir = join(ROOT, "public/data/commentary/patristic");
    const labels = {};
    for (const fn of readdirSync(pdir)) {
      if (!fn.endsWith(".json")) continue;
      const bk = JSON.parse(readFileSync(join(pdir, fn), "utf8"));
      for (const notes of Object.values(bk)) for (const n of notes) labels[n.father ?? ""] = (labels[n.father ?? ""] ?? 0) + 1;
    }
    let fatherEntries = 0, total = 0;
    const leaked = [];
    const undatedOrModern = [];
    for (const [lbl, c] of Object.entries(labels)) {
      total += c;
      const nf = normalizeFather(lbl);
      if (nf.kind === "father") {
        fatherEntries += c;
        const y = yearOf(nf.id);
        // PD proof + the Phase-1 dated-id guard, both at once.
        if (y === null || y > PD_CUTOFF) undatedOrModern.push(`${lbl} (${nf.id}=${y})`);
      } else {
        leaked.push(lbl);
      }
    }
    check("patristic normaliser: ≥93% of entries resolve to a Father", fatherEntries / total >= 0.93, `${((100 * fatherEntries) / total).toFixed(2)}% of ${total}`);
    check("patristic normaliser: no label leaks to a non-Father fallback", leaked.length === 0, leaked.slice(0, 6).join(" | "));
    check("patristic PD proof: every surviving author is dated and public-domain (≤ cutoff)", undatedOrModern.length === 0, undatedOrModern.slice(0, 6).join(" | "));
  }
```

- [ ] **Step: Run it.** `npm test`. If a label leaks or an author is undated/too-recent, **that is the filter/allowlist telling you it is incomplete** — fix by either adding the author's `FATHERS[]` entry + alias + year (Task 3) and dropping it from `PD_AUTHORS` if not truly PD, then **re-run `node scripts/build-patristic.mjs`** and re-commit the corpus. Iterate until green. (Because `PD_AUTHORS` is the allowlist, this should already hold; this guard is the proof.)
- [ ] **Step: Run, expect PASS.** `npm test` green; `npm run build` green.
- [ ] **Step: Commit.**

```bash
git add scripts/test-data.ts
git commit -m "v1.15.0: §16 corpus guards + data-level PD proof over the patristic corpus

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: Light the Reader action + switch the source credit (and the durable tab label)

The data ships; now the UI must reach it. Beyond the Gospels, patristic coverage is sparse, so the Commentary action is gated coarsely (book-level, matching the existing Gospel pattern); the sheet credit switches from "The Catena Aurea" to the patristic-database credit on a non-Gospel; and the patristic tab is renamed to the durable **"Church Fathers"** (the §4.3 Phase-2 fold-in — honest only because the Phase-3 corpus on Genesis/Romans is *not* the Catena Aurea). The data shape is identical, so the sheet's grouping, chips, and Doctors-only filter need **no** change — the only edits are the tab gate (`catenaTab`) and the loaded corpus name, so the patristic data actually reaches the pane.

No DOM test runner exists; correctness here is `npm run build` (tsc + Vite) + a described manual check, the project's standard for `CommentarySheet`/the gold dot.

**Files:** Modify `src/pages/Reader.tsx:234-236`; `src/components/CommentarySheet.tsx` (line 3 import, line 42 `catenaTab` gate, line 57 corpus load, line 118 tab label, line 144 credit, line 149 empty state); `src/pages/Settings.tsx:424-427` (Phase-2 fold-in).

**Interfaces:** Consumes `PATRISTIC_BOOKS` (Task 3) and the existing `isGospel`/`book` props.

- [ ] **Step: Gate the Reader action.** In `src/pages/Reader.tsx`, import `PATRISTIC_BOOKS` alongside `GOSPELS` (line 5): `import { GOSPELS, PATRISTIC_BOOKS } from "../lib/commentary";`. Then change `commentaryAvailable` (lines 234-236) to:

```tsx
  const commentaryAvailable = (v: number) =>
    settings.commentaryEnabled &&
    ((settings.commentaryHaydock && haydockHas(v)) ||
      (settings.commentaryCatena && (isGospel || PATRISTIC_BOOKS.has(bookSlug))));
```

(Coarse, book-level — like the existing Gospel pattern. Haydock's whole-canon coverage already lights the action on almost every non-Gospel verse, so this is the backstop for the rare Haydock-less verse; the sheet shows the real note or the honest "No commentary on this verse" empty state.)

- [ ] **Step: Wire the patristic corpus into the sheet (REQUIRED — without this, the built data never renders).** `CommentarySheet.tsx` today gates **and** loads only the Catena: `const catenaTab = isGospel && showCatena;` (line 42) and `loadCommentary("catena", book)` (line 57). On a non-Gospel book `isGospel` is false, so `catenaTab` is false → the Fathers pane never renders and the patristic file is never fetched. (The spec's "everything else in `CommentarySheet` is unchanged" overlooked this gate; the data shape is identical, but the gate and the corpus name are not.) Widen the gate and select the corpus by book — the grouping, chips, and Doctors-only filter stay byte-for-byte unchanged because the on-disk shape is identical:
  - **Import `PATRISTIC_BOOKS`** (line 3): `import { fathersOf, groupCatena, PATRISTIC_BOOKS } from "../lib/commentary";`
  - **Widen the tab gate** (line 42): `const catenaTab = (isGospel || PATRISTIC_BOOKS.has(book)) && showCatena;`
  - **Switch the loaded corpus** (line 57): `loadCommentary(isGospel ? "catena" : "patristic", book)` — the internal `"catena"` tab id and `catena` state are reused; only the source file differs.
  - **Honest empty state off the Gospels** (line 149): `{isGospel ? "No Catena commentary on this verse." : "No commentary on this verse."}`.

  This is **Phase-3 wiring and is never a Phase-2 no-op**: Phase 2 only renames the label/credit on the Gospels; extending the pane to non-Gospel books requires this gate + corpus change. (`book` here is the sheet's `book` prop — the slug the Reader passes as `book={bookSlug}`, so `PATRISTIC_BOOKS.has(book)` matches the Reader's `PATRISTIC_BOOKS.has(bookSlug)` gate exactly.)

- [ ] **Step: Switch the source credit + rename the tab in `CommentarySheet.tsx`.** The sheet already receives `book` and `isGospel`. Replace the hard-coded credit (line 144) with a Gospel/non-Gospel switch:

```tsx
          <div className="cmt-credit">
            {isGospel
              ? "The Catena Aurea · the Newman edition"
              : "The Church Fathers · ANF/NPNF (public domain)"}
          </div>
```

And rename the patristic tab label (line 118) from `Catena Aurea` to the durable `Church Fathers`:

```tsx
            Church Fathers
```

(Two-accent compliance unchanged: the tab is purple/interactive; the credit is gold/honor — `.cmt-credit` and `.cmt-tab` already route through the tokens, so no CSS change.)

- [ ] **Step: Reword the Settings sub-label (Phase-2 fold-in).** In `src/pages/Settings.tsx` (lines 424-427), the keys stay verbatim (no migration); only the prose changes so it is honest beyond the Gospels. Change the `setting-label` and `catechesis`:

```tsx
            <div className="setting-label">Church Fathers</div>
            <p className="catechesis muted small">
              The Catena Aurea on the four Gospels; the Church Fathers (ANF/NPNF,
              public domain) on Genesis, the Psalms, the Epistles, and more.
            </p>
```

Leave `aria-label="Catena Aurea commentary"` and the `commentaryCatena` key as-is (no functional change; the toggle now reads as the Church-Fathers source switch).

- [ ] **Step: Guard the credit + tab in the harness (source-grep, the project's CommentarySheet pattern).** In `scripts/test-data.ts`, near the §16 block, add:

```ts
{
  const sheet = readFileSync(join(ROOT, "src/components/CommentarySheet.tsx"), "utf8");
  check("CommentarySheet tab is the durable 'Church Fathers' label", /Church Fathers/.test(sheet));
  check("CommentarySheet switches the credit on a non-Gospel (no bare Catena claim)", /isGospel\s*\?/.test(sheet) && /Catena Aurea/.test(sheet));
  check("CommentarySheet widens the Fathers-tab gate to PATRISTIC_BOOKS", /PATRISTIC_BOOKS\.has\(book\)/.test(sheet));
  check("CommentarySheet loads the patristic corpus on non-Gospel books", /loadCommentary\(\s*isGospel\s*\?\s*"catena"\s*:\s*"patristic"/.test(sheet));
  const reader = readFileSync(join(ROOT, "src/pages/Reader.tsx"), "utf8");
  check("Reader gates the patristic action with PATRISTIC_BOOKS", /PATRISTIC_BOOKS\.has\(bookSlug\)/.test(reader));
}
```

- [ ] **Step: Verify.** `npm test` (the new source-grep guards pass) and `npm run build` (tsc + Vite) both green. **Manual check** (`npm run dev`): open `/read/drc/romans/8` → a verse with a Haydock note shows the Commentary action; the sheet's patristic tab reads **"Church Fathers"** and the credit reads **"The Church Fathers · ANF/NPNF (public domain)"**; an Augustine/Chrysostom note renders. Open `/read/drc/john/3` → tab still reads "Church Fathers" but the credit reads "The Catena Aurea · the Newman edition". Confirm tabs/chips are purple, the credit/attribution gold; no element wears both.
- [ ] **Step: Commit.**

```bash
git add src/pages/Reader.tsx src/components/CommentarySheet.tsx src/pages/Settings.tsx scripts/test-data.ts
git commit -m "v1.15.0: light the patristic action; 'Church Fathers' tab + per-book credit switch

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

> **Conditional:** if the §4.3 Phase-2 tab rename + Settings reword already shipped in v1.14.0 (verify with `grep -n "Church Fathers" src/components/CommentarySheet.tsx`), then **only** the **tab-label / credit-string / Settings-prose** sub-steps are no-ops — mark those `[~]`. The **Reader action-gating** step **and** the **CommentarySheet gate-widening + corpus-switch** step are Phase-3-only and **always required** (Phase 2 is Gospels-only and never touches the `catenaTab` gate or the `loadCommentary` corpus name).

---

## Task 7: Cut the v1.15.0 release

**Files:** Modify `package.json` (+ `package-lock.json`), `CHANGELOG.md`, `CLAUDE.md`. (The `docs/superpowers/INDEX.md` link to this plan/spec is added by the parent orchestration — do **not** edit INDEX here to avoid a concurrent-edit race.)

- [ ] **Step: Bump the version.** `npm version 1.15.0 --no-git-tag-version` — prints `v1.15.0`; `package.json` + lockfile read `1.15.0`.
- [ ] **Step: Add the CHANGELOG entry** above the most recent section (newest-first, dated 2026-06-27), grouped Added / Changed, naming: the patristic corpus beyond the Gospels (staged books), the three-gate PD filter + harness proof, the "Church Fathers" tab + per-book credit, the `PATRISTIC_BOOKS` action gating, and the manifest reseal (with the explicit note that golden snapshots and the service-worker cache are untouched). Propose the release name **"v1.15.0 — the whole counsel"** (Acts 20:27, "the whole counsel of God") — *the name is the owner's call; flagged, not assumed.*
- [ ] **Step: Add the CLAUDE.md ledger.** Add a `v1.15.0` line to the Release ledger and a paragraph in the architecture's commentary section noting: the patristic corpus (`scripts/build-patristic.mjs`, pinned `patristic` source) extends the chain beyond the Gospels under a three-gate PD filter, written to `public/data/commentary/patristic/` in the identical `{father,text}` shape; `PATRISTIC_BOOKS` gates the Reader action; "Church Fathers" is the durable tab label with a per-book credit; staged books only (Genesis/Psalms/Isaiah/Acts/Epistles/Revelation), widening later.
- [ ] **Step: Final verify.** `npm test && npm run build && npm run check-docs` — all green. Re-run `npm run verify-data` once more to confirm the committed corpus + manifest agree.
- [ ] **Step: Confirm golden untouched.** `git status scripts/golden` shows no change. Do **not** run `npm run golden`.
- [ ] **Step: Commit.**

```bash
git add package.json package-lock.json CHANGELOG.md CLAUDE.md
git commit -m "v1.15.0 'the whole counsel' — the patristic chain beyond the Gospels (§4.3 Phase 3)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

- [ ] **Step: Stop and ask the owner before pushing / opening a PR** (repo policy: commit/push only when asked). When approved, the PR body ends with the Claude Code attribution line.

---

## Self-Review

**Spec coverage (§4.3 Phase 3):** §9 source & pin → Task 1 (real SHA `aa06110…`, re-confirmed at build). §10 builder (fetch/cache, parse, PD filter, versification remap, in-grid clamp, Gospel skip, `sortKeys`/write, `writeManifest`) → Tasks 2 + 4. §10.3 three-gate filter → Task 2 (tested) + Task 4 (`PD_AUTHORS`, `noSource` build-error throw). §10.4 versification (Psalms via `hebrewSpanToVulgate`, the build-haydock helper; identity + clamp elsewhere) → Task 4. §11 normaliser/year-table growth → Task 3 (forced green by Task 5's §16 guard). §12 manifest reseal / no sw bump / golden untouched → Task 1 (a sources-only reseal at the pin, so `npm test` stays green before the data exists) + Tasks 4 + 7. §13 lazy load via existing `loadCommentary("patristic", book)` (no `data.ts` change) + `PATRISTIC_BOOKS` action gate + the `catenaTab` **gate-widening / corpus-switch** in `CommentarySheet` (the spec's "everything else unchanged" missed this) + credit switch → Task 6. §14 tests (parser fixture, PD-filter proof, data assertions, normaliser coverage) → Tasks 2/4/5. Bundle-size staging → `STAGE_BOOKS`/`PATRISTIC_BOOKS` (Task 3/4) + Task 7 measurement note.

**Reused, not reinvented:** `hebrewSpanToVulgate` (lectionary.ts) for Psalms exactly as `build-haydock.mjs` does; the `sortKeys`/`addComments`/in-grid-clamp/`writeManifest` pattern from `build-catena.mjs`; `loadCommentary` (data.ts) unchanged — it already takes a corpus name and resolves a 404 to `{}`, so a patristic-less book is silently empty; `normalizeFather`/`groupCatena`/`fathersOf`/`sortChronological` and the `CommentarySheet` grouping/chips/Doctors-only **rendering** unchanged (identical on-disk shape). The only `CommentarySheet` change is the gate (`catenaTab`) and the corpus name (`loadCommentary(isGospel ? "catena" : "patristic", …)`), so the patristic data actually reaches the pane (Task 6).

**Placeholders:** none. Every code step is complete. The one genuine unknown — the exact source structure — was resolved against the live repo (author dirs, `metadata.toml default_year`, `[[commentary]]` `quote`/`source_title`/`source_url`, no copyright flag field) and baked into the parsers, filter, and filename regex.

**Type/interface consistency:** `parseMetaToml`/`parseCommentaryToml`/`filterExcerpts`/`PD_CUTOFF`/`COPYRIGHT_SOURCE` are defined in Task 2 and consumed in Task 4 and the §23 tests. `PATRISTIC_BOOKS` is exported in Task 3 and consumed by Reader **and `CommentarySheet`** (Task 6) and tested in Task 3. New `FATHERS[]` ids carry the Phase-1 `year`/`circa?` fields; `DOCTOR_IDS` gains `ephrem`/`cyril-of-jerusalem`. `PD_AUTHORS` (builder) ≡ the §23 `DB_NAMES` list ≡ the authors wired into `FATHERS[]`; `STAGE_BOOKS` (builder) ≡ `PATRISTIC_BOOKS` (commentary.ts) — both lockstep pairs are asserted or commented.

**Constraint check:** no hand-edit of `public/data/` (builder-only + manifest reseal); copyright text never bundled (three gates + tested + data-level PD proof + `noSource` build-error); two-accent held (purple tab/chips, gold credit/attribution, Haydock-only gold dot — no new color); §13 clean (verbatim PD text, no AI/social/streaks/notifications/red-letter); no Today card added; golden untouched; no sw cache bump; CI surface respected (builder is local, CI reads committed data).

**Key risk flagged:** the spec assumed the DB carried structured `edition`/`copyright` fields; the live repo does **not** (still-copyright authors like CS Lewis are distinguished only by `default_year` + `source_title`). Gates 2 and 3 are therefore implemented as a curated author allowlist + a source-title/url denylist rather than structured-field reads — strictly *more* conservative (an author not affirmatively allowlisted is dropped wholesale). This adaptation is the most important review point; see Open Questions.
