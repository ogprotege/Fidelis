# CCC P2 — Personal Catechism Import + Mac Converter + Supersede Implementation Plan

[← Docs index](../../INDEX.md)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the §5 *text* supersede tier — let the owner import a copy of the modern Catechism they own (the `fidelis-ccc-1` paragraph JSON), store it on-device, and render its ¶ text inline in the P1 `CCCSheet` ahead of the bundled Trent, with a Mac-side converter to produce that file from a PDF/EPUB the owner owns.

**Architecture:** A new pure intake parser `parseCccText` (in `src/lib/import-formats.ts`) validates and normalizes the `fidelis-ccc-1` map — it contains **no** Catechism text. `src/lib/data.ts` bumps the existing `fidelis-imported` IndexedDB from `DB_VERSION 1→2`, adding a `ccc` object store **without dropping** the `books` store, plus `idbPutCcc`/`idbGetCcc`/`idbClearCcc` and a memoized `loadCCCText()` whose cache is invalidated on import/remove. The P1 `CCCSheet` gains a Tier-1 "imported" render branch (fed by `pickTier`), the Magisterium Settings section gains an import slot, and the local-only `scripts/build-ccc-text.mjs` converter (modelled on `build-nabre.mjs` + `build-ccc.mjs`'s crop technique) produces the gitignored `ccc.local.json`.

**Tech Stack:** Vite + React 19 + TypeScript (strict, `tsc --noEmit`), `tsx` Node assertion harnesses (`scripts/test-data.ts`), IndexedDB, Poppler `pdftotext` + Calibre `ebook-convert` (local converter only).

## Global Constraints

Every task's requirements implicitly include these (CLAUDE.md standing rules + the spec's §1 bright line + §8.2 two-accent):

- **Copyrighted text is NEVER bundled.** The modern CCC paragraph text reaches a device **only** via the owner's personal import → IndexedDB; it is never committed, never in `dist/`, never read into the repo. The converter and the harness use synthetic fixtures and print counts only — no copyrighted oracle, no body dump. (Mirrors the NABRE/RSV-2CE pattern and the v1.9.0 bright line.)
- **Never hand-edit `public/data/`.** P2 adds **no** file under `public/data/` (the bundled Trent + the §5 index are P1/v1.9.0). No `npm run manifest` reseal is needed for P2.
- **Two-accent rule:** `--purple` ACTS (the ¶ numbers, links, Trent TOC, import buttons), `--gold` HONORS. The Catechism sheet wears **no gold** — source credits are *muted text*, not gold. No element wears both.
- **§13 refusal list (binding):** no accounts/cloud, no AI summaries/paraphrase/chat, no social, no streaks/badges, no ads/IAP, no notification pressure, no red-letter text. The imported CCC is the user's own verbatim licensed copy, presented unaltered — not AI, not paraphrase.
- **The Today page never exceeds five cards.** P2 touches Reader/Settings/sheet only; Today is untouched.
- **No emoji in `.tsx`** (the harness emoji guard); `✠` is forbidden; `✕` is allowed. New glyphs go in `Icon.tsx` as `currentColor` SVG.
- **Green bar = `npm test` (harnesses + manifest verify + `eslint src`) AND `npm run build` (`tsc --noEmit` + vite) AND `npm run check-docs`.** All must pass at every commit. Golden snapshots are **not** touched (no engine/calendar change).
- **Node 22** (matches CI). `ios.yml` builds the iOS app + widget — unaffected by P2 (web-only change).

## Prerequisite: CCC P1 must have landed

This plan is the **second half** of the §5 text tier. It assumes P1 (`docs/superpowers/specs/2026-06-27-ccc-inline-catechism-design.md`, phase P1) has shipped:

- `public/data/trent/trent.json` (bundled, sealed) + `scripts/build-trent.mjs` + `pins.mjs` entry;
- `src/lib/data.ts` `loadTrent(): Promise<TrentFile | null>`;
- `src/lib/catechism.ts` with `pickTier` + `CatechismTier` (Tier-2/Tier-3 exercised; Tier-1 "imported" branch present but always dormant because `loadCCCText` did not yet exist);
- `src/components/CCCSheet.tsx` (Sheet `variant="panel"`) rendering Tier-2 (Trent) + Tier-3 (the vatican.va `¶…` links row), mounted by `src/pages/Reader.tsx` from a Catechism action button;
- the §5 `cccLinksEnabled` master gate + the Magisterium Settings section copy.

If any of these is absent, **stop and implement P1 first.** Task 0 verifies the prerequisite.

---

## File Structure

| File | Responsibility | Task |
|------|----------------|------|
| `src/lib/import-formats.ts` | **new** `CccTextDoc` type + `cleanCccText` + `parseCccText` (pure intake parser, no text) | T1 |
| `src/lib/data.ts` | `CCCText` type; `DB_VERSION 1→2` + `ccc` store (preserve `books`); `idbPutCcc`/`idbGetCcc`/`idbClearCcc`; memoized `loadCCCText()` with cache invalidation | T2 |
| `src/pages/Settings.tsx` | the Magisterium import slot (file input → `parseCccText` → `idbPutCcc`; Remove → `idbClearCcc`) | T3 |
| `src/lib/catechism.ts` | confirm/ensure `pickTier` imported branch (P1-owned; reconciled here) | T4 |
| `src/components/CCCSheet.tsx` | Tier-1 "imported" supersede render branch + `loadCCCText()` wiring | T4 |
| `src/styles.css` | **new** `.ccc-imported`/`.ccc-para`/`.ccc-para-num`/`.ccc-para-text` (purple, no gold); **reuse** P1's `.ccc-credit` and `.import-zone`/`.icon-btn`/`hr.rule` — no new color tokens | T3, T4 |
| `scripts/build-ccc-text.mjs` | **new** local-only Mac converter (PDF/EPUB → `ccc.local.json`, counts only) | T5 |
| `package.json` | `"build-ccc-text"` script; version bump to 1.14.0 | T5, T6 |
| `docs/superpowers/specs/2026-06-27-ccc-text-LOCAL-BUILD-RUNBOOK.md` | **new** owner-run runbook for the converter | T5 |
| `scripts/test-data.ts` | **new §24** assertions (parseCccText, key-space, storage source-grep, pickTier, two-accent) | T1, T2, T4 |
| `CHANGELOG.md`, `README.md`, `CLAUDE.md`, `docs/history/RELEASES.md` | the release record | T6 |

---

## Task 0: Verify the P1 prerequisite + branch base

**Files:** none (read-only verification).

- [ ] **Step: Confirm P1 has landed.** Run:

```bash
cd /Users/biscuit/Fidelis/app && ls public/data/trent/trent.json src/components/CCCSheet.tsx src/lib/catechism.ts scripts/build-trent.mjs && grep -n "loadTrent" src/lib/data.ts && grep -n "pickTier" src/lib/catechism.ts
```

Expected: every path exists; `loadTrent` and `pickTier` are found. **If any is missing, stop — implement the P1 plan first.**

- [ ] **Step: Confirm a green baseline.** Run `npm test && npm run build && npm run check-docs` — all green before starting.
- [ ] **Step: Branch.** `git checkout -b v1.14-ccc-personal-import` (off the P1 head / `main`).

---

## Task 1: `parseCccText` — the pure intake parser (no Catechism text)

The CCC text is not a Bible (no book/chapter/verse), so it cannot ride `parseImport`/`resolveBookSlug`. It gets its own tolerant parser that normalizes the three `fidelis-ccc-1` shapes to `{ edition, language, paragraphs }`, validates integer keys in `[1,2865]`, applies light footnote-apparatus hygiene, and holds no embedded text (output is a pure function of input).

**Files:**
- Modify: `src/lib/import-formats.ts` (append after `parseOsis`, ~line 216).
- Test: `scripts/test-data.ts` (new §24, inserted before the final summary `console.log` — see the note on numbering/line-drift in the first test step).

**Interfaces:**
- Consumes: nothing new (the file already exists; `BOOKS` import stays).
- Produces:
  - `export interface CccTextDoc { edition: string; language: string; paragraphs: Record<string, string>; }`
  - `export function parseCccText(filename: string, text: string): CccTextDoc`
  - (internal) `function cleanCccText(s: string): string`

- [ ] **Step: Write the failing test.** In `scripts/test-data.ts`, insert this block immediately **before** the final `console.log(\`\n${failures ? ...}\`)` summary line. (Anchor on that summary line, **not** the line number — the harness currently ends at §22; P1 adds the §23 Trent/catechism block ahead of P2, which shifts every line down. This plan numbers its block **§24**, the next free section after P1's §23 — if P1 used a different number, bump accordingly.)

```ts
// §24 — the personal-CCC import path (P2). Synthetic fixtures ONLY — never real
// Catechism text. The parser is pure; it normalizes three shapes, validates the
// 1–2865 integer key space (shared with url.json), and strips footnote apparatus.
{
  const { parseCccText } = await import("../src/lib/import-formats");
  const cu = JSON.parse(readFileSync(join(ROOT, "public/data/ccc/url.json"), "utf8")) as Record<string, string>;

  // (a) the header shape normalizes to { edition, language, paragraphs }
  const header = JSON.stringify({ format: "fidelis-ccc-1", edition: "Synthetic Ed.", language: "en", paragraphs: { "1": "alpha", "1817": "beta" } });
  const h = parseCccText("ccc.json", header);
  check("parseCccText: header shape → edition/language/paragraphs", h.edition === "Synthetic Ed." && h.language === "en" && h.paragraphs["1"] === "alpha" && h.paragraphs["1817"] === "beta");

  // (b) a bare flat map is accepted, edition defaulted
  const bare = parseCccText("ccc.json", JSON.stringify({ "1": "gamma" }));
  check("parseCccText: bare flat map accepted", bare.paragraphs["1"] === "gamma" && bare.language === "en" && bare.edition.length > 0);

  // (c) the { ccc: { … } } wrapper is accepted
  const wrapped = parseCccText("ccc.json", JSON.stringify({ ccc: { edition: "Wrapped", paragraphs: { "2865": "omega" } } }));
  check("parseCccText: { ccc: {…} } wrapper accepted", wrapped.paragraphs["2865"] === "omega" && wrapped.edition === "Wrapped");

  // (d) output is a pure function of input — the parser holds no embedded text
  const one = parseCccText("ccc.json", JSON.stringify({ format: "fidelis-ccc-1", paragraphs: { "5": "only-this" } }));
  check("parseCccText: output keys/values come only from input (no injection)", Object.keys(one.paragraphs).join() === "5" && one.paragraphs["5"] === "only-this");

  // (e) footnote apparatus is stripped: superscript digit runs + [n] refs
  const dirty = parseCccText("ccc.json", JSON.stringify({ format: "fidelis-ccc-1", paragraphs: { "1": "Hope is the virtue⁴⁵ by which we desire.[12]" } }));
  check("parseCccText: strips footnote superscripts + [n] refs", dirty.paragraphs["1"] === "Hope is the virtue by which we desire.");

  // (f) rejections — non-integer key, out-of-range, and a Bible-shaped file
  let threwAbc = false; try { parseCccText("x.json", JSON.stringify({ "abc": "x" })); } catch { threwAbc = true; }
  check("parseCccText: rejects a non-integer key", threwAbc);
  let threwRange = false; try { parseCccText("x.json", JSON.stringify({ format: "fidelis-ccc-1", paragraphs: { "3000": "x" } })); } catch { threwRange = true; }
  check("parseCccText: rejects a ¶ outside [1,2865]", threwRange);
  let threwBible = false; try { parseCccText("x.json", JSON.stringify({ books: [{ name: "Mark", chapters: [] }] })); } catch { threwBible = true; }
  check("parseCccText: rejects a Bible-shaped JSON", threwBible);

  // (g) the key space is url.json's: 219/444 are cited by john 3:16, so present in url.json
  const ks = parseCccText("ccc.json", JSON.stringify({ format: "fidelis-ccc-1", paragraphs: { "219": "x", "444": "y" } }));
  check("parseCccText: keys share url.json's string-integer key space", Object.keys(ks.paragraphs).every((k) => /^\d+$/.test(k) && k in cu));
}
```

- [ ] **Step: Run it, expect FAIL.** `npm test` → fails with `parseCccText is not a function` / `not exported` (the function does not exist yet).

- [ ] **Step: Implement `parseCccText`.** Append to `src/lib/import-formats.ts` (after `parseOsis`):

```ts
/* ── CCC text intake (the modern Catechism, a copy the owner imports) ──────── */

/** The normalized shape of a parsed `fidelis-ccc-1` import. Contains the owner's
 *  own licensed text only — never bundled, stored only on their device. */
export interface CccTextDoc {
  edition: string;
  language: string;
  paragraphs: Record<string, string>;
}

/** Intake hygiene only (NOT content derivation): strip the footnote apparatus a
 *  hand- or converter-prepared file may carry — Unicode superscript digit runs
 *  (⁰¹²³⁴-⁹) and bracketed footnote refs like [45] —
 *  then collapse whitespace. The prose itself is untouched. */
function cleanCccText(s: string): string {
  return s
    .replace(/[⁰¹²³⁴-⁹]+/g, "")
    .replace(/\s*\[\d+\]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Parse a `fidelis-ccc-1` import (the modern Catechism, the owner's own copy).
 * Tolerant of three shapes — the header `{ format, edition, language, paragraphs }`,
 * a `{ ccc: { … } }` wrapper, and a bare flat map `{ "1": "…" }` — all normalized
 * to `{ edition, language, paragraphs }`. Keys must be integers in [1, 2865]
 * (url.json's key space), so a mis-dropped Bible file throws a friendly error.
 * Contains NO Catechism text: the output derives only from the supplied file.
 */
export function parseCccText(_filename: string, text: string): CccTextDoc {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error("Not a JSON file — expected a fidelis-ccc-1 Catechism file.");
  }
  if (!json || typeof json !== "object" || Array.isArray(json)) {
    throw new Error("Unrecognized Catechism file — expected a fidelis-ccc-1 paragraph map.");
  }
  const obj = json as Record<string, unknown>;

  let raw: Record<string, unknown> | undefined;
  let edition = "Catechism of the Catholic Church";
  let language = "en";

  if (obj.format === "fidelis-ccc-1" && obj.paragraphs && typeof obj.paragraphs === "object") {
    raw = obj.paragraphs as Record<string, unknown>;
    if (typeof obj.edition === "string") edition = obj.edition;
    if (typeof obj.language === "string") language = obj.language;
  } else if (obj.ccc && typeof obj.ccc === "object" && !Array.isArray(obj.ccc)) {
    const c = obj.ccc as Record<string, unknown>;
    raw = (c.paragraphs && typeof c.paragraphs === "object" ? c.paragraphs : c) as Record<string, unknown>;
    if (typeof c.edition === "string") edition = c.edition;
    if (typeof c.language === "string") language = c.language;
  } else {
    raw = obj; // bare flat map
  }

  const paragraphs: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (k === "format" || k === "edition" || k === "language" || k === "paragraphs") continue;
    if (!/^\d+$/.test(k)) {
      throw new Error(`Not a Catechism file: "${k}" is not a paragraph number.`);
    }
    const n = Number(k);
    if (n < 1 || n > 2865) {
      throw new Error(`Paragraph ${n} is outside the Catechism range 1–2865.`);
    }
    if (typeof v !== "string") {
      throw new Error(`Paragraph ${k} is not text.`);
    }
    const cleaned = cleanCccText(v);
    if (cleaned) paragraphs[String(n)] = cleaned;
  }
  if (Object.keys(paragraphs).length === 0) {
    throw new Error("No Catechism paragraphs found — is this a fidelis-ccc-1 file?");
  }
  return { edition, language, paragraphs };
}
```

- [ ] **Step: Run, expect PASS.** `npm test` → §24 (a)–(g) all green. Then `npm run build` (tsc) green.
- [ ] **Step: Commit.** `git commit -am "ccc(p2): parseCccText — pure fidelis-ccc-1 intake parser (no text) + §24 tests"`

---

## Task 2: IndexedDB `ccc` store + `loadCCCText()` (preserve `books`)

Reuse the existing `fidelis-imported` DB. Bump `DB_VERSION 1→2`, add a `ccc` object store **without dropping** the `books` store (the NABRE/RSV-2CE imports). The whole paragraph map is stored under one key (`"text"`). `loadCCCText()` memoizes the read and **invalidates** its cache on import/remove, so the supersede tier flips live.

**Files:**
- Modify: `src/lib/data.ts` (the DB constants + `openDb` ~lines 42-57; new helpers after `importedTranslations` ~line 126).
- Test: `scripts/test-data.ts` (append §24c after the Task-1 block).

**Interfaces:**
- Consumes: `CccTextDoc` (Task 1, type-only).
- Produces:
  - `export type CCCText = CccTextDoc;`
  - `export async function idbPutCcc(doc: CCCText): Promise<void>`
  - `export async function idbGetCcc(): Promise<CCCText | null>`
  - `export async function idbClearCcc(): Promise<void>`
  - `export function loadCCCText(): Promise<CCCText | null>`

- [ ] **Step: Write the failing test.** Append to `scripts/test-data.ts` inside the same §24 region (after Task 1's closing `}`):

```ts
// §24c — CCC-text storage (data.ts). IndexedDB cannot run under tsx, so these
// guard the upgrade discipline by SOURCE: DB_VERSION bumped, the ccc store
// created WITHOUT dropping books, and loadCCCText's memo invalidated on write.
{
  const ds = readFileSync(join(ROOT, "src/lib/data.ts"), "utf8");
  check("data.ts bumps DB_VERSION to 2", /DB_VERSION\s*=\s*2\b/.test(ds));
  check("data.ts creates the ccc object store", /createObjectStore\(\s*CCC_STORE\s*\)/.test(ds));
  check("data.ts still creates the books store (upgrade preserves imports)", /createObjectStore\(\s*STORE\s*\)/.test(ds));
  check("data.ts exports loadCCCText + idbPutCcc/idbGetCcc/idbClearCcc", /export function loadCCCText/.test(ds) && /export async function idbPutCcc/.test(ds) && /export async function idbGetCcc/.test(ds) && /export async function idbClearCcc/.test(ds));
  check("loadCCCText invalidates its memo on import/remove", (ds.match(/cccTextPromise\s*=\s*null/g) || []).length >= 2);
}
```

- [ ] **Step: Run it, expect FAIL.** `npm test` → §24c fails (`DB_VERSION = 2` not found; the helpers do not exist).

- [ ] **Step: Implement — bump the DB + add the store.** In `src/lib/data.ts`, replace the DB constants + `openDb` (lines 42-57) with:

```ts
const DB_NAME = "fidelis-imported";
const DB_VERSION = 2;
const STORE = "books";
const CCC_STORE = "ccc";
const CCC_KEY = "text";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      // Idempotent: covers a fresh install (oldVersion 0) and the 1→2 upgrade.
      // The books store (NABRE/RSV-2CE imports) is preserved — only added if absent.
      if (!req.result.objectStoreNames.contains(STORE)) {
        req.result.createObjectStore(STORE);
      }
      if (!req.result.objectStoreNames.contains(CCC_STORE)) {
        req.result.createObjectStore(CCC_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
```

- [ ] **Step: Implement — the `ccc`-store helpers + `loadCCCText`.** In `src/lib/data.ts`, add the `CCCText` type import at the top (with the other `./` imports, after line 1):

```ts
import type { CccTextDoc } from "./import-formats";
```

Then, immediately after `importedTranslations()` (~line 126), add:

```ts
/** The modern Catechism the owner imported — never bundled (spec §6). Stored
 *  under one key in the ccc store as { edition, language, paragraphs }. */
export type CCCText = CccTextDoc;

/** Persist the owner's imported CCC text (replaces any prior import). */
export async function idbPutCcc(doc: CCCText): Promise<void> {
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(CCC_STORE, "readwrite");
      tx.objectStore(CCC_STORE).put(doc, CCC_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
  cccTextPromise = null; // a fresh import must be seen by the next loadCCCText()
}

/** Read the owner's imported CCC text, or null if none. */
export async function idbGetCcc(): Promise<CCCText | null> {
  const db = await openDb();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(CCC_STORE, "readonly");
      const req = tx.objectStore(CCC_STORE).get(CCC_KEY);
      req.onsuccess = () => resolve((req.result as CCCText | undefined) ?? null);
      req.onerror = () => reject(req.error);
    });
  } finally {
    db.close();
  }
}

/** Remove the imported Catechism ("Remove imported Catechism"). */
export async function idbClearCcc(): Promise<void> {
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(CCC_STORE, "readwrite");
      tx.objectStore(CCC_STORE).delete(CCC_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
  cccTextPromise = null;
}

let cccTextPromise: Promise<CCCText | null> | null = null;
/** The owner's imported modern CCC, memoized like loadCCC; the memo is cleared
 *  by idbPutCcc/idbClearCcc so the supersede tier flips live after an import. */
export function loadCCCText(): Promise<CCCText | null> {
  cccTextPromise ??= idbGetCcc().catch(() => null);
  return cccTextPromise;
}
```

- [ ] **Step: Run, expect PASS.** `npm test` → §24c green. `npm run build` (tsc) green — confirm the `CccTextDoc` type import resolves and there are no unused-symbol lint errors.
- [ ] **Step: Manual sanity (no node IndexedDB).** Noted for the T4/T6 `/verify` pass: the loaders are exercised in the browser then (import a synthetic file → `loadCCCText()` non-null). No standalone manual check here.
- [ ] **Step: Commit.** `git commit -am "ccc(p2): IndexedDB ccc store (DB v2, preserves books) + loadCCCText with cache invalidation"`

---

## Task 3: The Magisterium import slot (Settings)

Add a Catechism import row to the existing **Magisterium** Settings section (the spec's recommended placement — the CCC is not a translation): a file slot wired exactly like `Translations.onFile`, plus a Remove control and the honest "never bundled" note.

**Files:**
- Modify: `src/pages/Settings.tsx` (imports; new state/handlers near the other import handlers ~line 97; the Magisterium `<section>` ~lines 459-479).
- Modify: `src/styles.css` (reuse `.import-zone`/`.icon-btn`; no new color tokens).

**Interfaces:**
- Consumes: `parseCccText` (T1), `idbPutCcc`/`idbClearCcc`/`loadCCCText` (T2).
- Produces: no new exports (UI only).

- [ ] **Step: Read first.** Re-read `src/pages/Settings.tsx` lines 1-130 (the marginalia import block — note it already uses `useRef` + `await file.text()`, the same pattern this slot mirrors) and the Magisterium `<section id="magisterium">` (currently ~line 460; **P1 has grown it** — it now holds the `cccLinksEnabled` toggle *and* P1's Roman-Catechism edition `<select>`), to confirm the exact state/handler style and the `update`/`settings` names in scope. Line numbers below are pre-P1 and will have drifted — anchor on the markup, not the numbers.

- [ ] **Step: Add imports.** In `src/pages/Settings.tsx`, extend the `../lib/data` import (around lines 6-12) to add `idbPutCcc, idbClearCcc, loadCCCText`, and add a new import for the parser:

```ts
import { parseCccText } from "../lib/import-formats";
```

- [ ] **Step: Add state + handlers.** Inside the component, after the existing marginalia transfer state (~line 99), add:

```ts
  // ── Magisterium: the imported modern Catechism (spec §6, P2) ────────────────
  const cccFileRef = useRef<HTMLInputElement>(null);
  const [cccImported, setCccImported] = useState(false);
  const [cccBusy, setCccBusy] = useState(false);
  const [cccMsg, setCccMsg] = useState<string | null>(null);
  useEffect(() => {
    loadCCCText().then((d) => setCccImported(!!d)).catch(() => {});
  }, []);

  const onCccFile = async (file: File | undefined) => {
    if (!file) return;
    setCccBusy(true);
    setCccMsg(null);
    try {
      const doc = parseCccText(file.name, await file.text());
      await idbPutCcc(doc);
      setCccImported(true);
      setCccMsg(`Imported the Catechism on this device (${Object.keys(doc.paragraphs).length} paragraphs). Stored only here.`);
    } catch (e) {
      setCccMsg(`Import failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setCccBusy(false);
      if (cccFileRef.current) cccFileRef.current.value = "";
    }
  };

  const removeCcc = async () => {
    await idbClearCcc();
    setCccImported(false);
    setCccMsg("Removed the imported Catechism.");
  };
```

- [ ] **Step: Add the import row to the Magisterium section.** In the `<section className="card" id="magisterium">` block, as the **last** child of the section (after the `cccLinksEnabled` toggle and after P1's Roman-Catechism edition `<select>`, immediately before `</section>`), add:

```tsx
        <hr className="rule" />
        <input
          ref={cccFileRef}
          type="file"
          accept=".json,application/json"
          style={{ display: "none" }}
          onChange={(e) => onCccFile(e.target.files?.[0])}
        />
        <div className="setting-label">Import the modern Catechism (a copy you own)</div>
        <p className="catechesis muted small">
          The Catechism of the Catholic Church is under copyright and is never bundled. If you
          own a digital copy, import it here — it is stored only on this device, and a cited
          verse will then show its paragraph text inline instead of a link out. Accepts the{" "}
          <code>fidelis-ccc-1</code> JSON produced by the local converter.
        </p>
        <div className="import-zone">
          {cccImported ? (
            <button className="icon-btn" onClick={removeCcc}>
              Remove imported Catechism
            </button>
          ) : (
            <button className="icon-btn" onClick={() => cccFileRef.current?.click()} disabled={cccBusy}>
              {cccBusy ? "Importing…" : "Import the Catechism"}
            </button>
          )}
          {cccMsg && <p className="muted small" style={{ marginTop: "0.4rem" }}>{cccMsg}</p>}
        </div>
```

- [ ] **Step: Verify.** `npm run build` (tsc + vite) green; `npm test` green (no harness change here, but the eslint pass must be clean — confirm `useRef`/`useEffect`/`useState` are already imported in Settings.tsx, they are at line 1). Then a browser check (`npm run dev`): Settings → Magisterium shows the import row; the file slot accepts `.json` only; an invalid file shows a friendly error; a synthetic `fidelis-ccc-1` file flips the row to "Remove imported Catechism".
- [ ] **Step: Commit.** `git commit -am "ccc(p2): Magisterium import slot — import/remove the modern Catechism on-device"`

---

## Task 4: The Tier-1 supersede render branch in `CCCSheet`

The P1 sheet renders Tier-2 (Trent) + Tier-3 (links). P2 wires `loadCCCText()` into the sheet's open effect and adds the Tier-1 "imported" branch: for each cited ¶, render its imported text (purple ¶ label), or — if the import omits that ¶ — its vatican.va link inline. Tier-3's full `¶…` links row stays the always-present fallback footer (P1 behavior, unchanged).

**Files:**
- Modify: `src/lib/catechism.ts` (confirm/ensure the `pickTier` imported branch).
- Modify: `src/components/CCCSheet.tsx` (state + open effect + the Tier-1 render block).
- Modify: `src/styles.css` (the new `.ccc-imported`/`.ccc-para*` rules — purple, no gold; **reuse** P1's `.ccc-credit`).
- Test: `scripts/test-data.ts` (append §24d to the §24 region).

**Interfaces:**
- Consumes: `pickTier` (catechism.ts), `loadCCCText`/`CCCText` (T2), the P1 `CCCSheet` Props `{ book, chapter, verse, refLabel, titleId, paras: number[], urls: Record<string,string>, edition: TrentEditionId }` (P1 destructures `{ refLabel, titleId, paras, urls, edition }` — P2 leaves the Props unchanged and only adds internal `cccText` state), `capParagraphs` (ccc.ts), `loadTrent`/`TrentFile`/`pickEdition` (P1), `Sheet` (existing).
- Produces: no new exports.

- [ ] **Step: Read first.** Read the whole of `src/components/CCCSheet.tsx` and `src/lib/catechism.ts` (P1 output). Capture: (a) the exact `Props` shape; (b) how the open `useEffect` loads `loadTrent()` and sets state; (c) the tier-render switch (`tier === "trent"` / `"links"` blocks); (d) whether `pickTier` already has the `imported` branch and whether `loadCCCText` is already referenced. The complete code below is written against the spec's documented interface — reconcile names to the actual P1 file (e.g. the Trent state variable, the tier switch markers).

- [ ] **Step: Write the failing test.** Append to `scripts/test-data.ts` inside the §24 region:

```ts
// §24d — pickTier precedence (all branches now that Tier-1 is live) + the CCCSheet
// Tier-1 wiring + two-accent (purple acts, no gold) by source.
{
  const { pickTier } = await import("../src/lib/catechism");
  check("pickTier: import + paras → imported", pickTier({ imported: true, hasParas: true, trent: true }) === "imported");
  check("pickTier: import + no paras → trent", pickTier({ imported: true, hasParas: false, trent: true }) === "trent");
  check("pickTier: no import + trent → trent", pickTier({ imported: false, hasParas: true, trent: true }) === "trent");
  check("pickTier: no import + no trent → links", pickTier({ imported: false, hasParas: true, trent: false }) === "links");

  const sheet = readFileSync(join(ROOT, "src/components/CCCSheet.tsx"), "utf8");
  check("CCCSheet wires loadCCCText (Tier-1 supersede)", /loadCCCText/.test(sheet));
  check("CCCSheet renders the imported ¶ text branch", /tier === "imported"/.test(sheet) && /ccc-para-num/.test(sheet));

  const css = readFileSync(join(ROOT, "src/styles.css"), "utf8");
  check("CCC imported ¶ number acts in purple (two-accent)", /\.ccc-para-num\s*\{[^}]*var\(--purple\)/.test(css));
  check("CCC imported block carries no gold honor mark", !/\.ccc-para[^{]*\{[^}]*var\(--gold\)/.test(css) && !/\.ccc-credit\s*\{[^}]*var\(--gold\)/.test(css));
}
```

- [ ] **Step: Run it, expect FAIL.** `npm test` → §24d fails (the imported branch may be dormant; `loadCCCText`/`ccc-para-num` are not in `CCCSheet.tsx`/`styles.css` yet). *(P1's own catechism section already asserts the `pickTier` branches identically, so those four lines pass; the CCCSheet/CSS lines still fail — that's the real anchor. The duplicate `pickTier` lines are harmless, but if you prefer no duplication, drop them and keep only the CCCSheet/CSS assertions.)*

- [ ] **Step: Implement — confirm `pickTier` (do NOT rewrite the whole file).** `src/lib/catechism.ts` is **P1-owned** and already exports `TrentEditionId`, `TRENT_EDITIONS`, `DEFAULT_TRENT_EDITION`, `isTrentEdition`, `pickEdition`, **and** this `pickTier`. P2 must **not** touch those edition exports — only confirm that the `pickTier` function and `CatechismTier` type below are present and the Tier-1 branch is live (P1 ships it live, since the resolver was always written with the `imported` branch). If P1 somehow stubbed Tier-1 off, repair **just** `pickTier` to match — leave `pickEdition`/`TRENT_EDITIONS`/etc. intact:

```ts
export type CatechismTier = "imported" | "trent" | "links";

/** The §5 precedence chain: an imported modern CCC supersedes the bundled Trent,
 *  which supersedes the bare vatican.va links. Pure — tested in test-data §24d. */
export function pickTier(args: { imported: boolean; hasParas: boolean; trent: boolean }): CatechismTier {
  if (args.imported && args.hasParas) return "imported";
  if (args.trent) return "trent";
  return "links";
}
```

- [ ] **Step: Implement — wire `loadCCCText` into the sheet's open effect.** In `src/components/CCCSheet.tsx`, add `loadCCCText` (and the `CCCText` type) to the `../lib/data` import, add the state, and load it alongside Trent. The state + effect (reconcile with the P1 effect that already loads Trent):

```tsx
  const [cccText, setCccText] = useState<CCCText | null>(null);

  useEffect(() => {
    let alive = true;
    void loadCCCText().then((d) => { if (alive) setCccText(d); });
    return () => { alive = false; };
  }, []);
```

Then compute the tier from the same `pickTier` call P1 uses, now fed by the real import (replace P1's hardcoded `imported: false`):

```tsx
  const tier = pickTier({ imported: !!cccText, hasParas: paras.length > 0, trent: !!trent });
```

(`trent` is P1's loaded `TrentFile | null` state; `paras`/`urls` are the props.)

- [ ] **Step: Implement — the Tier-1 render block.** In the sheet's tier switch (beside P1's `tier === "trent"` / Tier-3 footer), add the imported branch:

```tsx
      {tier === "imported" && cccText && (
        <div className="ccc-imported">
          {paras.map((n) => {
            const body = cccText.paragraphs[String(n)];
            return (
              <div className="ccc-para" key={n}>
                <span className="ccc-para-num">¶{n}</span>
                {body ? (
                  <p className="ccc-para-text" lang={cccText.language}>{body}</p>
                ) : (
                  <p className="ccc-para-text muted small">
                    Not in your imported copy —{" "}
                    <a href={urls[String(n)]} target="_blank" rel="noopener noreferrer">
                      read ¶{n} on vatican.va
                    </a>.
                  </p>
                )}
              </div>
            );
          })}
          <p className="ccc-credit muted small">{cccText.edition} · imported on this device.</p>
        </div>
      )}
```

The Tier-3 links row (P1) stays rendered whenever `paras.length > 0`, in **every** tier — do not gate it on tier. (Confirm P1 already renders it unconditionally; if P1 gated it to `tier !== "imported"`, remove that gate so the precise pointer is never lost.)

- [ ] **Step: Implement — the CSS (purple, no gold).** Append to `src/styles.css` (near the other `.ccc-*` rules P1 added):

```css
/* CCC inline sheet — Tier-1 imported supersede (P2). Purple acts; gold appears
   nowhere here — source credit is muted text, not an honor mark (spec §8.2).
   NOTE: `.ccc-credit` is already defined by P1 (the Trent credit line) — REUSE it,
   do NOT redefine it here (a second rule would create a duplicate selector and
   partially override P1's spacing/border). The imported credit line uses the same
   `.ccc-credit muted small` class. */
.ccc-imported { margin: 0.2rem 0 0; }
.ccc-para { margin: 0 0 1rem; }
.ccc-para-num {
  font-family: var(--sans);
  font-size: 0.78rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: var(--purple);
}
.ccc-para-text { margin: 0.25rem 0 0; line-height: 1.62; }
```

- [ ] **Step: Run, expect PASS.** `npm test` → §24d green. `npm run build` green.
- [ ] **Step: Verify (browser, `/verify`).** With a synthetic `fidelis-ccc-1` import present (Task 3), open a cited verse's Catechism action: the sheet shows the imported ¶ text inline (Tier 1), with the vatican.va `¶…` row still beneath it; a verse whose ¶ the import omits shows the per-¶ vatican.va link; remove the import → the same verse falls back to Trent (Tier 2); desktop right-panel / phone bottom-sheet split intact; no gold anywhere in the sheet.
- [ ] **Step: Commit.** `git commit -am "ccc(p2): Tier-1 supersede — imported CCC ¶ text renders inline ahead of Trent"`

---

## Task 5: The Mac-side converter `scripts/build-ccc-text.mjs` + runbook

A local-only sibling of `build-nabre.mjs` / `build-ccc.mjs`. **Contains no Catechism text.** Reads the owner's owned file (EPUB-derived `.txt` recommended, or a PDF with the body-column crop), splits it with the monotonic ¶ walker (1→2865), normalizes footnote apparatus, and writes the gitignored `ccc.local.json`, printing **counts only** (cited-¶ coverage vs the committed `url.json`, the Part-Four contiguity count, and short incipits to eyeball).

**Files:**
- Create: `scripts/build-ccc-text.mjs`.
- Create: `docs/superpowers/specs/2026-06-27-ccc-text-LOCAL-BUILD-RUNBOOK.md`.
- Modify: `package.json` (`"build-ccc-text"` script).

**Interfaces:**
- Consumes (read-only): `public/data/ccc/url.json` (the cited-¶ completeness oracle).
- Produces: `ccc.local.json` (gitignored — already covered by `.gitignore` `*.local.json`).

- [ ] **Step: Create the converter.** Write `scripts/build-ccc-text.mjs`:

```js
#!/usr/bin/env node
/**
 * Modern CCC (a copy you OWN) → fidelis-ccc-1 import JSON, for the §6 personal
 * import. PARSING LOGIC ONLY — this script contains no Catechism text. It reads a
 * file you supply (EPUB-derived .txt, recommended; or a PDF), extracts a single
 * monotonic paragraph sequence ¶1→¶2865, and writes ccc.local.json (gitignored,
 * never bundled or committed). It then prints COUNTS ONLY (no body dump).
 *
 * Usage:
 *   # EPUB (cleanest — resolves footnote anchors):
 *   ebook-convert "/path/to/ccc.epub" ccc.txt --enable-heuristics --txt-output-formatting plain
 *   node scripts/build-ccc-text.mjs ccc.txt
 *   # PDF (fallback — needs the body-column crop; tune CCC_CROP_* per edition):
 *   node scripts/build-ccc-text.mjs "/path/to/Catechism_2nd-ED.pdf" [ccc.local.json]
 *   #   or:  CCC_TEXT_PDF="/path/to.pdf" node scripts/build-ccc-text.mjs
 *
 * Poppler `pdftotext` is at /opt/homebrew/bin/pdftotext. Calibre is NOT installed —
 * the EPUB path needs `brew install --cask calibre` first (see the runbook).
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const input = process.argv[2] || process.env.CCC_TEXT_PDF;
const out = process.argv[3] || "ccc.local.json";
const edition = process.env.CCC_EDITION || "Catechism of the Catholic Church, 2nd Edition";
if (!input) {
  console.error('Usage: node scripts/build-ccc-text.mjs <ccc.txt|Catechism.pdf> [out.json]  (or set CCC_TEXT_PDF=)');
  process.exit(1);
}

// ── 1. raw text ─────────────────────────────────────────────────────────────
let raw;
if (/\.txt$/i.test(input)) {
  raw = readFileSync(input, "utf8");
} else {
  // PDF: crop to the body column (drop marginal cross-ref numbers via -x/-W) and
  // the page-foot footnote band (via -H), the same region-crop build-ccc.mjs uses.
  // Tune these to YOUR edition (see the runbook) — the defaults are a starting box.
  const X = +(process.env.CCC_CROP_X || 0);
  const W = +(process.env.CCC_CROP_W || 430);
  const H = +(process.env.CCC_CROP_H || 660);
  const FIRST = +(process.env.CCC_FIRST_PAGE || 0); // Part One ¶1; 0 = from start
  const LAST = +(process.env.CCC_LAST_PAGE || 0);   // before the Index of Citations; 0 = to end
  const args = ["-layout", "-nopgbrk", "-x", String(X), "-y", "0", "-W", String(W), "-H", String(H)];
  if (FIRST) args.push("-f", String(FIRST));
  if (LAST) args.push("-l", String(LAST));
  args.push(input, "-");
  try {
    raw = execFileSync("pdftotext", args, { maxBuffer: 1 << 30 }).toString("utf8");
  } catch (e) {
    console.error("pdftotext failed (brew install poppler):", e.message);
    process.exit(1);
  }
}

// ── 2. footnote-apparatus + whitespace normalization (per assembled ¶) ───────
function deApparatus(s) {
  return s
    .replace(/[⁰¹²³⁴-⁹]+/g, "")          // superscript footnote digits
    .replace(/([\p{L}.,;:!?"'”’)])\d{1,3}(?=\s|$)/gu, "$1")  // glued footnote run "life.45" — the HARD PDF case (flagged)
    .replace(/\s+/g, " ")
    .trim();
}

// ── 3. the monotonic ¶ walker (1→2865), lifted from build-nabre's verse splitter ─
const lines = raw.split(/\r?\n/);
const paragraphs = {};
let expected = 1;   // the next ¶ number a line must begin with to open a new ¶
let openNum = 0;    // the ¶ currently accumulating into buf
let buf = [];
const flush = () => {
  if (openNum >= 1 && buf.length) {
    const text = deApparatus(buf.join(" "));
    if (text) paragraphs[String(openNum)] = text;
  }
  buf = [];
};
for (const rawLine of lines) {
  const t = rawLine.replace(/\f/g, "").trim();
  if (!t) continue;
  const m = t.match(/^(\d{1,4})\b\s*(.*)$/);
  if (m && +m[1] === expected) {
    flush();                 // close the previous ¶
    openNum = expected;
    expected++;
    if (m[2]) buf.push(m[2]);
    continue;
  }
  // anything else — stray marginal numbers, headings, in-¶ lists (a), 1°), banners —
  // is body of the OPEN ¶. Lines before ¶1 (openNum 0) are dropped (front matter).
  if (openNum >= 1) buf.push(t);
}
flush();

// ── 4. emit (compact, gitignored) ───────────────────────────────────────────
writeFileSync(out, JSON.stringify({ format: "fidelis-ccc-1", edition, language: "en", paragraphs }, null, 0));

// ── 5. validation — COUNTS ONLY, against the committed url.json (the cited facts) ─
const url = JSON.parse(readFileSync(join(ROOT, "public/data/ccc/url.json"), "utf8"));
const cited = Object.keys(url);
const present = cited.filter((n) => paragraphs[n]);
const missing = cited.filter((n) => !paragraphs[n]);
console.error(`\nWrote ${out} — ${Object.keys(paragraphs).length} of 2865 ¶ parsed.`);
console.error(`cited-¶ coverage (url.json oracle): ${present.length}/${cited.length} present`);
if (missing.length) console.error(`  missing cited ¶ (first 20): ${missing.slice(0, 20).join(", ")}`);
let pf = 0;
for (let n = 2558; n <= 2865; n++) if (paragraphs[String(n)]) pf++;
console.error(`Part Four "Christian Prayer" (¶2558–2865): ${pf}/308 present`);
for (const n of ["1", "1817", "2558", "2865"]) {
  console.error(`  ¶${n} incipit: ${(paragraphs[n] || "(missing)").slice(0, 60)}`);
}
console.error("\nIf coverage is short or a section count is wrong, re-tune the crop box (CCC_CROP_*)");
console.error("and re-run, exactly as build-nabre's 'review the printed counts' gate. Then import");
console.error("the file via Settings → Magisterium → Import the Catechism. It stays on your device.");
```

- [ ] **Step: Add the package script.** In `package.json` `"scripts"`, after `"build-nabre"`, add:

```json
    "build-ccc-text": "node scripts/build-ccc-text.mjs",
```

- [ ] **Step: Create the runbook.** Write `docs/superpowers/specs/2026-06-27-ccc-text-LOCAL-BUILD-RUNBOOK.md`:

```markdown
# §5 (P2) — Modern CCC Import — LOCAL BUILD RUNBOOK

[← Docs index](../../INDEX.md)

**How to turn a copy of the Catechism you OWN into a `fidelis-ccc-1` import file**, on your
own machine. The design is signed off in
`docs/superpowers/specs/2026-06-27-ccc-inline-catechism-design.md` (§6) — this runbook runs it.

> **The bright line (do not cross):** the modern CCC text is © LEV/USCCB and is **never**
> bundled or committed. This converter reads YOUR owned copy and writes `ccc.local.json`
> (gitignored). That file is imported on-device only — it never enters the repo or `dist/`.

## 0. Prerequisites

- **Node 22.** Poppler `pdftotext` (`/opt/homebrew/bin/pdftotext`, already present).
- **EPUB path (recommended):** Calibre is **not** installed — install it once:
  ```sh
  brew install --cask calibre
  ```
  `ebook-convert` then resolves footnote anchors, so the `.txt` is far cleaner than a PDF crop.
- **Your owned CCC file** (EPUB or the USCCB 2nd-Ed PDF) somewhere on disk.

## 1. EPUB → text → JSON (cleanest)

```sh
ebook-convert "/path/to/ccc.epub" ccc.txt --enable-heuristics --txt-output-formatting plain
node scripts/build-ccc-text.mjs ccc.txt
```

## 2. PDF → JSON (fallback — needs the body-column crop)

```sh
node scripts/build-ccc-text.mjs "/path/to/Catechism_2nd-ED.pdf"
#   or:  CCC_TEXT_PDF="/path/to.pdf" node scripts/build-ccc-text.mjs
```

The PDF carries **marginal cross-reference numbers** (right gutter) and a **page-foot footnote
band** that must not leak into the body. The converter crops to the body column with
`pdftotext -layout -x/-W` (drops the margin) and `-H` (drops the foot), the same region-crop
technique `scripts/build-ccc.mjs` uses for the two-column index. Tune per edition:

| Env var | Meaning | Start |
|---|---|---|
| `CCC_CROP_X` | left edge of the body column (px) | `0` |
| `CCC_CROP_W` | body width — **shrink until the right-margin cross-ref numbers disappear** | `430` |
| `CCC_CROP_H` | body height — **shrink until the page-foot footnotes disappear** | `660` |
| `CCC_FIRST_PAGE` / `CCC_LAST_PAGE` | restrict to Parts One–Four (before the Index of Citations) | unset = whole doc |

```sh
CCC_CROP_W=420 CCC_CROP_H=650 CCC_FIRST_PAGE=20 CCC_LAST_PAGE=700 \
  node scripts/build-ccc-text.mjs "/path/to/Catechism_2nd-ED.pdf"
```

## 3. The known hard case — glued footnote digits

In a PDF, a footnote reference can glue to the word before it (`"life.45"`). The converter
strips a 1–3 digit run glued to the end of a word (`deApparatus`), but this is the genuinely
hard normalization case (it can clip a legitimate trailing number). **EPUB avoids it** — prefer
EPUB. If the PDF route leaves artifacts, spot-check the printed incipits and re-tune.

## 4. The gate — read the printed counts (no copyrighted oracle)

The converter prints **counts only** (never the body):

- **cited-¶ coverage** vs the committed `public/data/ccc/url.json` — every ¶ the §5 index cites
  should be present. A short coverage = re-tune the crop and re-run.
- **Part Four contiguity** — ¶2558–2865 is the last block (308 ¶); the count should be 308.
- **incipits** of ¶1 / ¶1817 / ¶2558 / ¶2865 — eyeball that each starts mid-sentence-free.

A failed coverage check or a wrong section count = stop and re-tune, exactly `build-nabre`'s gate.

## 5. Import it

`ccc.local.json` is gitignored. Open the app → **Settings → Magisterium → Import the Catechism**,
select the file. It is stored only on your device (IndexedDB). A cited verse's Catechism sheet
now shows the ¶ text inline (Tier 1) ahead of the bundled Trent. Remove it anytime from the same
row.

## 6. Definition of done

- [ ] `ccc.local.json` written; **no CCC text anywhere in the repo** (`git status` clean of it — it is gitignored).
- [ ] Printed cited-¶ coverage is complete (or the gaps are understood); Part Four = 308.
- [ ] Imported via Settings → Magisterium; a cited verse shows ¶ text inline; Remove works.
```

- [ ] **Step: Verify the converter parses + docs link.** Run:

```bash
cd /Users/biscuit/Fidelis/app && node --check scripts/build-ccc-text.mjs && node scripts/build-ccc-text.mjs 2>&1 | head -1 && npm run check-docs
```

Expected: `node --check` is silent (valid syntax); the no-arg run prints the `Usage:` line and exits non-zero (no crash); `check-docs` green (the runbook's `../../INDEX.md` link resolves). *(The full conversion is owner-run against an owned file and is NOT part of CI — it is documented, not unit-tested, exactly like `build-nabre.mjs`.)*
- [ ] **Step: Commit.** `git commit -am "ccc(p2): local-only build-ccc-text converter (counts only, no text) + runbook"`

---

## Task 6: Cut the release — v1.14.0

**Files:** `package.json` (+ `package-lock.json` via `npm version`), `CHANGELOG.md`, `README.md`, `CLAUDE.md`, `docs/history/RELEASES.md`.

> **Versioning note (see Open Questions):** P1 and P2 are the two halves of the §5 text tier. If P1 has **not** yet been released, P1+P2 co-release as **v1.14.0** (this task names it). If P1 already shipped *as* v1.14.0, bump P2 to **v1.14.1** or **v1.15.0** instead — owner's call; renumber every "1.14.0" below accordingly.

- [ ] **Step: Bump the version.** `npm version 1.14.0 --no-git-tag-version` (updates `package.json` + lockfile, no tag/commit).
- [ ] **Step: Add the CHANGELOG entry** above the current top section in `CHANGELOG.md` (dated 2026-06-27), grouped Added / Changed, covering: the `fidelis-ccc-1` import format + `parseCccText`; the IndexedDB `ccc` store (DB v2, books preserved) + `loadCCCText`; the Magisterium import slot; the Tier-1 supersede render; the local `build-ccc-text` converter + runbook. State plainly that the modern CCC text is never bundled — only the owner's imported copy renders.
- [ ] **Step: Update the README masthead badge** to the new version + name, and add a Highlights line ("import your own Catechism; a cited verse shows its paragraph inline").
- [ ] **Step: Add the RELEASES.md detail section + the CLAUDE.md ledger line.** Add a `docs/history/RELEASES.md` section for v1.14.0 (mirroring the existing per-release blocks) and a one-line entry to the CLAUDE.md release ledger linking to that section's anchor. Keep the wording consistent with the existing ledger voice (the §5 text tier: inline Catechism sheet + personal import + supersede; modern CCC text never bundled).
- [ ] **Step: Final verify.** Run:

```bash
cd /Users/biscuit/Fidelis/app && npm test && npm run build && npm run check-docs
```

Expected: all three green (the new ledger link must resolve — `check-docs` validates it). Then a browser smoke test of every touched surface (import → supersede → remove → Trent fallback).
- [ ] **Step: Commit.** `git commit -am "v1.14.0 — §5 text tier P2: personal Catechism import + Mac converter + supersede"`
- [ ] **Step: Stop.** Ask the owner before pushing / opening a PR (this repo commits/pushes only when asked).

---

## Self-Review

**Spec coverage (§6 P2 scope):**
- §6.1 `fidelis-ccc-1` format — defined (header / bare-map / `{ccc:{…}}`); the integer-string key space `"1".."2865"` shared with `url.json`. ✓ (T1)
- §6.2 `parseCccText` (pure, no text) — three tolerant shapes, integer/range validation, friendly rejections, footnote hygiene, output-from-input-only. ✓ (T1 + §24 a–g)
- §6.3 storage — `DB_VERSION 1→2`, `ccc` store created **without** dropping `books`, one-key map, `idbPutCcc`/`idbGetCcc`/`idbClearCcc`. ✓ (T2 + §24c source-grep)
- §7 `loadCCCText()` — memoized, cache invalidated on import/remove (the `getSettings`-style discipline). ✓ (T2)
- §6.4 import slot — Magisterium section, file input → parse → put, Remove → clear, honest "never bundled" copy. ✓ (T3)
- §8.1 Tier-1 supersede — `pickTier` imported branch live, per-¶ text or per-¶ vatican.va fallback, muted credit; Tier-3 links row stays in every tier. ✓ (T4)
- §6.5 converter — local-only `build-ccc-text.mjs` (EPUB/PDF, body-crop, monotonic ¶ walker, footnote normalization, counts-only validation against `url.json`); runbook with `brew install --cask calibre`. ✓ (T5)
- §11 guardrails — no copyrighted text in the repo, converter prints counts only, tests use synthetic fixtures. ✓ (all)
- §14 tests #3 (pickTier all branches), #4 (parseCccText synthetic), #5 (key-space match) — present; #1/#2/#6 (Trent shape/seal, §5 index untouched) are **P1's** and out of scope here. ✓

**No placeholders:** Every code step shows complete code. The only "read first" steps (T3 Settings layout, T4 P1 `CCCSheet`/`catechism.ts` internals) are reconnaissance against files this plan does not own (P1 output) — they capture exact names before editing, not deferred work. `pickTier` is fully defined in T4 (reconciled with P1) so every referenced symbol is defined.

**Type consistency:** `CccTextDoc` (import-formats.ts) is the single shape; `data.ts` aliases `CCCText = CccTextDoc` (type-only import — no runtime coupling between the pure parser and the fetch/IndexedDB layer). `parseCccText` returns it, `idbPutCcc`/`idbGetCcc`/`loadCCCText` consume/return it, `CCCSheet` reads it. `pickTier`'s `{ imported, hasParas, trent }` matches its T4 call site and §24d assertions.

**Constraint check:** No `public/data/` file added or edited → **no manifest reseal** needed. No Today card. No second accent on one element (the sheet is purple-only; credits are muted text). No emoji in `.tsx`. Golden snapshots untouched (no engine/calendar change). `ccc.local.json` is gitignored (`*.local.json`). The modern CCC text never enters the repo.

**Testability honesty:** IndexedDB has no node global, so `idbPut/Get/ClearCcc` + `loadCCCText` runtime behavior is guarded by **source-grep** assertions (DB v2, both stores created, memo invalidated) plus the browser `/verify` pass — the established pattern for browser-only surfaces. The converter is owner-run/local and **documented, not unit-tested** (only `node --check` + the usage-line smoke test run in this plan), exactly like `build-nabre.mjs`.
