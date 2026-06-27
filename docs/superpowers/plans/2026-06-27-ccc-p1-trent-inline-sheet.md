# CCC P1 — Bundled Trent + the Inline Catechism Sheet Implementation Plan

[← Docs index](../../INDEX.md)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the §5 *text* tier the v1.9.0 index deferred — bundle the public-domain Roman Catechism (Trent) in **both** editions (Donovan 1829 default, McHugh-Callan 1923 switchable) and render it inline in a new `CCCSheet`, so the cited-verse Catechism affordance opens a quiet panel (Trent browsable-by-section + the precise vatican.va ¶ links inside it) instead of forcing a redirect out.

**Architecture:** A new build script `scripts/build-trent.mjs` fetches both pinned PD editions from the MediaWiki API, cleans them to structural HTML, and emits one manifest-sealed `public/data/trent/trent.json` keyed by edition. A new memoized `loadTrent()` (mirroring `loadCCC`) feeds a new `CCCSheet` (the `Sheet variant="panel"` primitive, unchanged) whose primary content is resolved by a pure, tested `src/lib/catechism.ts` (`pickTier`/`pickEdition`). The Reader's old inline `.ccc-row` vatican links become a labeled **Catechism action button**; the gutter `.ccc-mark` and `loadCCC()` wiring are untouched. The modern-CCC import (Tier 1 "supersede") is **P2 — out of scope here**; this plan leaves only the `pickTier` seam.

**Tech Stack:** Node 22 ESM build scripts (`node`/`tsx`), React 19 + TypeScript (strict, `tsc --noEmit`) + Vite, `tsx` assertion harnesses (`scripts/test-data.ts`), CSS custom-property token system.

## Global Constraints

Every task implicitly includes these (CLAUDE.md standing rules + design-spec §1/§5/§13):

- **Never hand-edit `public/data/`.** `trent/trent.json` regenerates only via `scripts/build-trent.mjs`; reseal `manifest.json` (`build-manifest.mjs`) and review the diff after any regen.
- **Two-accent rule:** `--purple` ACTS, `--gold` HONORS; no element wears both. The CCC mark is purple; **the `CCCSheet` carries no gold at all** — the Trent TOC buttons, the ¶ links, and the back control are purple; the source credit is *muted text* (`--text-muted`), not gold (unlike `CommentarySheet`'s gold Catena credit). No raw hex/rgba outside the `src/styles.css` day/night token blocks.
- **Copyrighted text never bundled.** Trent is **public domain** → bundled. The **modern CCC text is never bundled** (P2 import / P3 license only). The §5 index (`ccc/index.json` + `ccc/url.json`) stays byte-for-byte as shipped in v1.9.0.
- **§13 refusal list (binding):** no accounts/sync, no AI/paraphrase/chat, no social, no streaks/badges, no ads/IAP, no notification pressure, no red-letter text. Trent is verbatim PD prose presented unaltered — not on the list.
- **§1.5 icon discipline:** no emoji in any `.tsx` (the harness `FORBIDDEN` guard fails on `⚑ ✎ ☾ ☀ ⧉ ✠ ✕ ✓`). New glyphs go in `Icon.tsx` as a single-weight `currentColor` SVG.
- **The Today page never exceeds five cards.** This work touches only the Reader, the sheet, Settings, and the data pipeline — Today is untouched.
- **Motion:** the `Sheet` primitive forbids motion by design; the `CCCSheet` inherits it. No transitions added.
- **Green bar = `npm test` (both harnesses + `build-manifest --verify` + `eslint src`) AND `npm run build` (`tsc --noEmit` + vite) AND `npm run check-docs`.** All must pass at every commit.

**Not touched:** golden-year snapshots (`scripts/golden/{2024..2027}.json`) — no liturgical/lectionary engine change, so no `npm run golden`. The service-worker `DATA_CACHE` in `public/sw.js` — `trent/trent.json` is a **new** file (manifest is network-first; new files miss the cache and fetch fresh), so **no `DATA_CACHE` bump** is needed (per the `pins.mjs` header rule).

---

## File structure

| File | Responsibility | New? |
|---|---|---|
| `scripts/pins.mjs` | Add the structured `trent` pin (both editions, Part→section tree, per-section `oldid`). | Modify |
| `scripts/build-trent.mjs` | Fetch pinned MediaWiki revisions → clean to structural HTML → emit `trent.json` → reseal manifest. | Create |
| `package.json` | Add `"trent"` build script + bump version. | Modify |
| `public/data/trent/trent.json` | The sealed PD corpus, both editions keyed. **Generated — never hand-edited.** | Create (built) |
| `public/data/manifest.json` | Resealed to include `trent/trent.json`. **Generated.** | Modify (built) |
| `src/lib/catechism.ts` | Pure tier resolver + edition vocabulary/picker. | Create |
| `src/lib/data.ts` | `TrentSection`/`TrentPart`/`TrentEdition`/`TrentFile` types + memoized `loadTrent()`. | Modify |
| `src/lib/storage.ts` | `Settings.trentEdition` field + default + validation. | Modify |
| `src/components/Icon.tsx` | Add the `"book"` Catechism mark. | Modify |
| `src/components/CCCSheet.tsx` | The inline catechism sheet (Tier 2 Trent browser + Tier 3 vatican links). | Create |
| `src/pages/Reader.tsx` | Catechism action button; remove the inline `.ccc-row`; mount `CCCSheet`. | Modify |
| `src/pages/Settings.tsx` | Magisterium edition selector + updated copy. | Modify |
| `src/styles.css` | `.ccc-sheet` block (purple acts; credit muted, no gold). | Modify |
| `scripts/test-data.ts` | New §20 assertions (Trent shape, manifest seal, `pickTier`, `pickEdition`, settings default, sheet two-accent, Reader integration). | Modify |
| `CHANGELOG.md`, `README.md`, `CLAUDE.md`, `src/pages/About.tsx` | Release record. | Modify |

---

## Task 1: Pin both Trent editions in `scripts/pins.mjs`

The Roman Catechism is fetched like every other corpus — from a **fixed revision, never a moving title**. Each section is pinned by its MediaWiki `oldid`; the four-Part structure is declared in the pin so `build-trent.mjs` is a pure transform.

**Files:** Modify `scripts/pins.mjs` (append after the `catena` entry, before the closing `}` at line 37).

**Interfaces:** Produces `PINS.trent = { donovan: TrentPin, mchughCallan: TrentPin }` where `TrentPin = { label: string; source: string; license: string; api: string; parts: { id: string; title: string; sections: { id: string; title: string; page: string; oldid: number }[] }[] }`. Consumed by Task 2.

- [ ] **Step: Discover the Donovan subpage tree + revids (reconnaissance, not deferred work).** Run the MediaWiki query to enumerate the Wikisource subpages of the Donovan translation and capture each page's latest revision id:

```sh
# List subpages of the Donovan translation, with their current revid (= the oldid to pin):
curl -s "https://en.wikisource.org/w/api.php?action=query&generator=allpages&gapnamespace=0&gapprefix=The%20catechism%20of%20the%20Council%20of%20Trent/&gaplimit=200&prop=revisions&rvprop=ids&format=json&formatversion=2" | npx --yes json5 2>/dev/null || curl -s "https://en.wikisource.org/w/api.php?action=query&generator=allpages&gapnamespace=0&gapprefix=The%20catechism%20of%20the%20Council%20of%20Trent/&gaplimit=200&prop=revisions&rvprop=ids&format=json&formatversion=2"
```

Record, per subpage, its exact `title` (→ `page`), the `revid` (→ `oldid`), and which of the four Parts it belongs to (Creed / Sacraments / Commandments / Lord's Prayer), in reading order. (If the canonical Wikisource title differs from the guess above, list candidates with `list=prefixsearch&pssearch=catechism of the Council of Trent`.)

- [ ] **Step: Discover the McHugh-Callan source + revids.** Repeat for the 1923 McHugh-Callan edition. Determine its MediaWiki host (`api`) and the subpage tree the same way (it may live under a different title or wiki). If a clean PD-in-US MediaWiki transcription cannot be located, **stop and surface Open Question 1** before fabricating a source — do **not** use the cin.org / James Akin HTML (a 1996 transcription copyright). Record `label`, `source`, `api`, and per-section `page`+`oldid`.

- [ ] **Step: Write the `trent` pin.** Append to `PINS` in `scripts/pins.mjs` (fill the `oldid`/`page`/`title` values from the two steps above — the structure is fixed, the integers are the recorded revids):

```js
  // §5 (continued) — the Roman Catechism (Catechism of the Council of Trent), PD.
  // BOTH editions ship bundled: Donovan 1829 (default, PD worldwide) and
  // McHugh-Callan 1923 (switchable, PD in the U.S. since 2019). Each section is
  // pinned to a fixed MediaWiki revision id (oldid) — never a moving title, like
  // every other pin — and the four-Part structure is declared here so
  // build-trent.mjs is a pure transform. To refresh: rerun the reconnaissance
  // queries in the v1.14 plan (Task 1), bump the oldids, `npm run trent`, and
  // review `git diff public/data/trent`.
  trent: {
    donovan: {
      label: "Catechism of the Council of Trent (Donovan, 1829)",
      source: "en.wikisource.org/wiki/The_catechism_of_the_Council_of_Trent",
      license: "public-domain",
      api: "https://en.wikisource.org/w/api.php",
      parts: [
        {
          id: "creed",
          title: "Part I — The Creed",
          sections: [
            // one entry per Wikisource subpage, in reading order:
            // { id: "creed-art-01", title: "Article I — \"I believe in God\"", page: "<exact title>", oldid: 0 },
          ]
        },
        { id: "sacraments",   title: "Part II — The Sacraments",        sections: [ /* … */ ] },
        { id: "commandments", title: "Part III — The Ten Commandments", sections: [ /* … */ ] },
        { id: "lords-prayer", title: "Part IV — The Lord's Prayer",     sections: [ /* … */ ] }
      ]
    },
    mchughCallan: {
      label: "Catechism of the Council of Trent (McHugh & Callan, 1923)",
      source: "<pinned PD-in-US transcription>",
      license: "public-domain-US",
      api: "https://en.wikisource.org/w/api.php",
      parts: [
        { id: "creed",        title: "Part I — The Creed",             sections: [ /* … */ ] },
        { id: "sacraments",   title: "Part II — The Sacraments",        sections: [ /* … */ ] },
        { id: "commandments", title: "Part III — The Ten Commandments", sections: [ /* … */ ] },
        { id: "lords-prayer", title: "Part IV — The Lord's Prayer",     sections: [ /* … */ ] }
      ]
    }
  }
```

(Each section's `id` must be stable and unique within its edition — `oldid` is an integer, never a `commit: "<40hex>"` string, so the harness "four 40-hex pins" count at `test-data.ts:749` stays `4`.)

- [ ] **Step: Reseal the manifest so the new pin is recorded.** Run: `npm run manifest`. `build-manifest.mjs` writes `sources: PINS` verbatim, so the resealed `manifest.json` now lists the `trent` pin (no `trent/trent.json` file yet — that arrives in Task 2; only `sources.trent` changes here). **This step is required:** `npm test` runs `build-manifest.mjs --verify`, which reads the *committed* manifest and walks `for (const [k, pin] of Object.entries(PINS))` (`build-manifest.mjs:103`). Without the reseal, `manifest.sources.trent` is `undefined`, the `!m` branch fires (`build-manifest.mjs:105`), and verify fails with `source pin drift: trent`.

- [ ] **Step: Run, expect PASS.** `npm test` — `build-manifest.mjs --verify` now finds `manifest.sources.trent` and compares `.commit`/`.repo` (both `undefined` for `trent` on each side → equal → no drift); the `trent` pin uses integer `oldid`s, not a `commit: "<40hex>"` string, so the `test-data.ts:749` "four 40-hex pins" count stays `4`. Expect: `all checks passed`.

- [ ] **Step: Commit.** (The resealed `manifest.json` rides with the pin so every commit stays green.)

```sh
git checkout -b v1.14-inline-catechism
git add scripts/pins.mjs public/data/manifest.json
git commit -m "trent: pin both PD editions (Donovan 1829, McHugh-Callan 1923) by section oldid"
```

---

## Task 2: `scripts/build-trent.mjs` — fetch, clean, emit, reseal

Mirror `build-haydock.mjs`/`build-catena.mjs`: fetch a pinned upstream tree, cache by the pin (here the `oldid`), clean to sealed JSON, then reseal the manifest. No engine, no psalm mapping (Trent has no verse keys), so plain `node` (not `tsx`).

**Files:** Create `scripts/build-trent.mjs`; Modify `package.json` (add the `"trent"` script).

**Interfaces:** Consumes `PINS.trent` (Task 1). Produces `public/data/trent/trent.json` shaped:
`{ editions: { donovan: TrentEdition, mchughCallan: TrentEdition } }`, where `TrentEdition = { edition: string; source: string; license: string; parts: { id: string; title: string; sections: { id: string; title: string; html: string }[] }[] }`. Consumed by Task 4 (`loadTrent`).

- [ ] **Step: Add the npm script.** In `package.json` `scripts`, after the `"catena"` line (line 25), add:

```json
    "trent": "node scripts/build-trent.mjs",
```

- [ ] **Step: Create `scripts/build-trent.mjs`** (complete):

```js
#!/usr/bin/env node
/**
 * Builds the bundled Roman Catechism (Catechism of the Council of Trent) layer
 * into a single sealed public/data/trent/trent.json, keyed by edition:
 *
 *   { "editions": {
 *       "donovan":      { "edition", "source", "license", "parts": [ { id, title,
 *                          sections: [ { id, title, html } ] } ] },
 *       "mchughCallan": { … same shape … } } }
 *
 * Both editions are PUBLIC DOMAIN (Donovan 1829 worldwide; McHugh-Callan 1923
 * PD-in-US since 2019) — so, unlike the modern CCC, Trent may be bundled. Each
 * section is fetched from a FIXED MediaWiki revision (oldid in scripts/pins.mjs),
 * never a moving title; the per-oldid cache makes a stale fetch impossible. The
 * cleaned `html` is paragraphs-only structural HTML (emphasis dropped — acceptable
 * per the design spec §4.1), built once and sealed, so the sheet renders it as
 * trusted-because-build-sealed text.
 *
 * Usage: node scripts/build-trent.mjs [--cache-dir <dir>]
 */
import { mkdir, readFile, writeFile, access } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { realpathSync } from "node:fs";
import { PINS } from "./pins.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const cacheArg = process.argv.indexOf("--cache-dir");
const CACHE = cacheArg !== -1 ? process.argv[cacheArg + 1] : join(ROOT, ".cache");
const EDITION_IDS = ["donovan", "mchughCallan"];

const exists = (p) => access(p).then(() => true, () => false);

/** Fetch one section's rendered HTML by a pinned oldid, cached by that oldid. */
async function fetchSection(api, oldid) {
  if (!oldid || !Number.isInteger(oldid)) throw new Error(`bad oldid: ${oldid}`);
  const cached = join(CACHE, `trent-${oldid}.html`);
  if (await exists(cached)) return readFile(cached, "utf8");
  const url = `${api}?action=parse&oldid=${oldid}&prop=text&format=json&formatversion=2`;
  console.log(`  fetching oldid ${oldid}`);
  const res = await fetch(url, { headers: { "user-agent": "Fidelis-Trent/1.0" } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const json = await res.json();
  const html = json?.parse?.text;
  if (typeof html !== "string" || !html.length) throw new Error(`empty parse for oldid ${oldid}`);
  await mkdir(CACHE, { recursive: true });
  await writeFile(cached, html);
  return html;
}

const ENTITIES = {
  "&nbsp;": " ", "&amp;": "&", "&lt;": "<", "&gt;": ">",
  "&quot;": '"', "&#039;": "'", "&apos;": "'", "&mdash;": "—", "&ndash;": "–"
};

/** Rendered MediaWiki HTML → paragraphs-only structural HTML. Drops reference
 *  superscripts, edit links, tables/figures/styles and all inline markup, decodes
 *  entities, re-escapes the bare text, and re-wraps each non-empty block in <p>. */
function sanitizeToHtml(parseHtml) {
  let s = parseHtml
    .replace(/<(script|style|table|figure)\b[\s\S]*?<\/\1>/gi, " ")
    .replace(/<sup\b[\s\S]*?<\/sup>/gi, " ")
    .replace(/<span\b[^>]*class="mw-editsection"[\s\S]*?<\/span>/gi, " ");
  const paras = [];
  for (const m of s.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)) {
    let t = m[1]
      .replace(/<[^>]+>/g, " ")                                  // strip all inline tags
      .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
      .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
      .replace(/&[a-z]+;/gi, (e) => ENTITIES[e.toLowerCase()] ?? " ")
      .replace(/\s+/g, " ")
      .trim();
    if (!t) continue;
    t = t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); // re-escape bare text
    paras.push(`<p>${t}</p>`);
  }
  return paras.join("");
}

async function buildEdition(id, pin) {
  const parts = [];
  for (const part of pin.parts) {
    const sections = [];
    for (const sec of part.sections) {
      const raw = await fetchSection(pin.api, sec.oldid);
      const html = sanitizeToHtml(raw);
      if (!html) throw new Error(`${id}/${sec.id}: cleaned to empty — re-check oldid ${sec.oldid}`);
      sections.push({ id: sec.id, title: sec.title, html });
    }
    if (!sections.length) throw new Error(`${id}/${part.id}: no sections`);
    parts.push({ id: part.id, title: part.title, sections });
  }
  if (parts.length !== 4) throw new Error(`${id}: expected 4 parts, got ${parts.length}`);
  return { edition: pin.label, source: pin.source, license: pin.license, parts };
}

async function main() {
  const editions = {};
  for (const id of EDITION_IDS) {
    const pin = PINS.trent?.[id];
    if (!pin) throw new Error(`PINS.trent.${id} missing`);
    console.log(`building ${id} …`);
    editions[id] = await buildEdition(id, pin);
  }
  const outDir = join(ROOT, "public", "data", "trent");
  await mkdir(outDir, { recursive: true });
  await writeFile(join(outDir, "trent.json"), JSON.stringify({ editions }));

  // counts + incipit report (Trent IS public domain, so sampling text is fine)
  for (const id of EDITION_IDS) {
    const ed = editions[id];
    const secs = ed.parts.reduce((n, p) => n + p.sections.length, 0);
    console.log(`  ${id}: 4 parts, ${secs} sections`);
    for (const p of ed.parts) {
      const first = p.sections[0];
      const incipit = first.html.replace(/<[^>]+>/g, "").slice(0, 70);
      console.log(`    ${p.id}: ${p.sections.length} secs · "${incipit}…"`);
    }
  }

  // Re-seal the integrity manifest over everything under public/data (P1-10).
  const { writeManifest } = await import("./build-manifest.mjs");
  await writeManifest(ROOT);
}

const isMain =
  process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href;
if (isMain) await main();
```

- [ ] **Step: Build the corpus.** Run: `npm run trent`. Expect the per-edition report to print `4 parts, N sections` for **both** `donovan` and `mchughCallan`, a readable incipit for each Part, and `Wrote …/manifest.json`. **Gate:** if any edition prints `< 4 parts`, an empty incipit, or throws on a fetch/empty-clean → stop, re-check the offending `oldid` in `pins.mjs` (Task 1), and rerun.

- [ ] **Step: Verify the seal.** Run: `npm run verify-data`. Expect: `manifest verified: all data files match` (the new `trent/trent.json` is now hashed + bundle-counted).

- [ ] **Step: Review the diff.** `git diff --stat public/data` — expect only `trent/trent.json` (new) and `manifest.json` (resealed). Spot-read a few sections of `trent.json` to confirm clean prose, no `[edit]` chrome, no leftover `<sup>` footnote digits.

- [ ] **Step: Commit.**

```sh
git add scripts/build-trent.mjs package.json public/data/trent/trent.json public/data/manifest.json
git commit -m "trent: build-trent.mjs fetches+cleans both PD editions into a sealed trent.json"
```

---

## Task 3: `src/lib/catechism.ts` — pure tier + edition logic (TDD)

The sheet's primary-content choice and the edition picker are pure, so they are harness-tested. This module is a **leaf** (only `import type` from `data.ts`, erased at runtime — no import cycle).

**Files:** Create `src/lib/catechism.ts`; Modify `scripts/test-data.ts` (new §20 block).

**Interfaces:** Produces
- `type TrentEditionId = "donovan" | "mchughCallan"`
- `const TRENT_EDITIONS: { id: TrentEditionId; label: string }[]`
- `const DEFAULT_TRENT_EDITION: TrentEditionId`
- `function isTrentEdition(v: unknown): v is TrentEditionId`
- `type CatechismTier = "imported" | "trent" | "links"`
- `function pickTier(args: { imported: boolean; hasParas: boolean; trent: boolean }): CatechismTier`
- `function pickEdition(file: TrentFile, pref: TrentEditionId): TrentEdition | null`

Consumed by `storage.ts` (Task 5), `CCCSheet.tsx` (Task 7), `Reader.tsx`/`Settings.tsx`.

- [ ] **Step: Write the failing test.** In `scripts/test-data.ts`, append a new block at the end of the file, **immediately before** the final `console.log(\`\n${failures ? …}\`)` summary line:

```ts
// §20 — the inline catechism (Trent P1): pure tier/edition logic (src/lib/catechism.ts)
// and the bundled PD Trent corpus (public/data/trent/trent.json). No copyrighted text.
{
  const { pickTier, pickEdition, isTrentEdition, DEFAULT_TRENT_EDITION, TRENT_EDITIONS } =
    await import("../src/lib/catechism");

  // pickTier precedence: imported+paras → imported; else trent → trent; else links.
  check("pickTier: imported copy with cited ¶ supersedes",
    pickTier({ imported: true, hasParas: true, trent: true }) === "imported");
  check("pickTier: imported but no cited ¶ falls to Trent",
    pickTier({ imported: true, hasParas: false, trent: true }) === "trent");
  check("pickTier: no import, Trent present → trent",
    pickTier({ imported: false, hasParas: true, trent: true }) === "trent");
  check("pickTier: nothing bundled/imported → links",
    pickTier({ imported: false, hasParas: true, trent: false }) === "links");

  // edition vocabulary
  check("TRENT_EDITIONS lists donovan + mchughCallan", TRENT_EDITIONS.map((e) => e.id).join(",") === "donovan,mchughCallan");
  check("default Trent edition is Donovan", DEFAULT_TRENT_EDITION === "donovan");
  check("isTrentEdition guards the vocabulary",
    isTrentEdition("donovan") && isTrentEdition("mchughCallan") && !isTrentEdition("kjv") && !isTrentEdition(null));

  // pickEdition picks the preferred edition, else falls back to Donovan, else null
  const fakeFile = {
    editions: {
      donovan: { edition: "D", source: "s", license: "public-domain", parts: [] },
      mchughCallan: { edition: "M", source: "s", license: "public-domain-US", parts: [] }
    }
  } as unknown as Awaited<ReturnType<typeof import("../src/lib/data").loadTrent>>;
  check("pickEdition returns the preferred edition", pickEdition(fakeFile!, "mchughCallan")?.edition === "M");
  check("pickEdition falls back to Donovan for an absent edition",
    pickEdition({ editions: { donovan: fakeFile!.editions.donovan } } as never, "mchughCallan")?.edition === "D");
}
```

- [ ] **Step: Run, expect FAIL.** `npm test` → `Cannot find module '../src/lib/catechism'` (or the §20 checks fail). Confirm red.

- [ ] **Step: Implement `src/lib/catechism.ts`** (complete):

```ts
/**
 * Spec §5 (text tier) — the pure logic behind the inline catechism sheet.
 * No Catechism text lives here, only the precedence rule and the edition picker.
 *
 * pickTier resolves the sheet's PRIMARY content top-down (design spec §2):
 *   imported personal CCC (with cited ¶)  →  bundled Trent  →  vatican.va links.
 * In P1 there is no import path yet, so the sheet always passes `imported: false`
 * and the result is "trent" (or "links" if Trent failed to load). The "imported"
 * branch is the P2 seam, kept here so the resolver never has to change.
 */
import type { TrentFile, TrentEdition } from "./data";

export type TrentEditionId = "donovan" | "mchughCallan";

/** The bundled Trent editions, in display order: the worldwide-PD Donovan 1829
 *  default, then the modern-English McHugh-Callan 1923 (US-PD) option. */
export const TRENT_EDITIONS: { id: TrentEditionId; label: string }[] = [
  { id: "donovan", label: "Donovan (1829)" },
  { id: "mchughCallan", label: "McHugh-Callan (1923)" }
];

export const DEFAULT_TRENT_EDITION: TrentEditionId = "donovan";

export function isTrentEdition(v: unknown): v is TrentEditionId {
  return v === "donovan" || v === "mchughCallan";
}

export type CatechismTier = "imported" | "trent" | "links";

/** The §2 precedence chain. `imported` is the P2 supersede tier (false in P1). */
export function pickTier(args: { imported: boolean; hasParas: boolean; trent: boolean }): CatechismTier {
  if (args.imported && args.hasParas) return "imported";
  if (args.trent) return "trent";
  return "links";
}

/** The preferred bundled edition, else Donovan, else null (no editions present). */
export function pickEdition(file: TrentFile, pref: TrentEditionId): TrentEdition | null {
  return file.editions[pref] ?? file.editions.donovan ?? null;
}
```

- [ ] **Step: Run, expect PASS.** `npm test` → the §20 `pickTier`/`pickEdition`/`isTrentEdition` checks pass. (The Trent-shape checks come in Task 4.)

- [ ] **Step: Commit.**

```sh
git add src/lib/catechism.ts scripts/test-data.ts
git commit -m "catechism: pure pickTier/pickEdition + Trent-edition vocabulary (§20 tests)"
```

---

## Task 4: `loadTrent()` + Trent-shape assertions

**Files:** Modify `src/lib/data.ts` (add types + loader after the `loadCCC` block, ~line 213); Modify `scripts/test-data.ts` (extend the §20 block).

**Interfaces:** Produces in `data.ts`:
- `interface TrentSection { id: string; title: string; html: string }`
- `interface TrentPart { id: string; title: string; sections: TrentSection[] }`
- `interface TrentEdition { edition: string; source: string; license: string; parts: TrentPart[]; refs?: Record<string, string[]> }`
- `interface TrentFile { editions: Record<TrentEditionId, TrentEdition> }`
- `function loadTrent(): Promise<TrentFile | null>`

Consumes `TrentEditionId` (type-only) from `catechism.ts`. Consumed by `CCCSheet.tsx` (Task 7) and the §20 test.

- [ ] **Step: Add the failing assertions.** In `scripts/test-data.ts`, inside the §20 block (after the `pickEdition` checks), append the on-disk Trent-corpus assertions:

```ts
  // The bundled Trent corpus is shaped, complete, and sealed.
  const trent = JSON.parse(readFileSync(join(ROOT, "public/data/trent/trent.json"), "utf8")) as {
    editions: Record<string, { edition: string; license: string; parts: { id: string; title: string; sections: { id: string; title: string; html: string }[] }[] }>;
  };
  const EXPECT_PARTS = ["creed", "sacraments", "commandments", "lords-prayer"];
  for (const id of ["donovan", "mchughCallan"]) {
    const ed = trent.editions[id];
    check(`Trent ${id} edition is present with a label`, !!ed && ed.edition.length > 0, ed?.edition ?? "missing");
    if (!ed) continue;
    check(`Trent ${id} has the four Parts in order`,
      ed.parts.map((p) => p.id).join(",") === EXPECT_PARTS.join(","), ed.parts.map((p) => p.id).join(","));
    const secIds = ed.parts.flatMap((p) => p.sections.map((s) => s.id));
    check(`Trent ${id} section ids are unique`, new Set(secIds).size === secIds.length, `${secIds.length} ids`);
    let bad = 0;
    for (const p of ed.parts) for (const s of p.sections) if (!s.title?.trim() || !s.html?.trim()) bad++;
    check(`Trent ${id} every section has a non-empty title + html`, bad === 0, `${bad} empty`);
    check(`Trent ${id} is public domain`, ed.license.startsWith("public-domain"), ed.license);
    check(`Trent ${id} ships no verse keys (browsable-by-section, design §4)`,
      ed.parts.every((p) => p.sections.every((s) => !/^\d+:\d+$/.test(s.id))));
  }

  // Sealed in the manifest + the §5 index is byte-for-byte untouched.
  const tman = JSON.parse(readFileSync(join(ROOT, "public/data/manifest.json"), "utf8")) as { files: Record<string, string> };
  check("trent/trent.json is sealed in the manifest", !!tman.files["trent/trent.json"]);
  check("§5 index + url remain sealed (unchanged by P1)",
    !!tman.files["ccc/index.json"] && !!tman.files["ccc/url.json"]);
```

- [ ] **Step: Run, expect FAIL.** `npm test` → the new Trent-shape checks fail only if `trent.json` is missing fields (it should already be built from Task 2 — so this likely passes immediately; the *purpose* of this step is the assertion lands while `loadTrent` does not yet exist for the build). Primary red gate is the next build step. Confirm the §20 Trent checks are present in output.

- [ ] **Step: Implement the types + loader.** In `src/lib/data.ts`, after the `loadCCC()` block (ends ~line 213), add:

```ts
/** Spec §5 (text tier) — the bundled PUBLIC-DOMAIN Roman Catechism (Trent),
 *  browsable by Part → section (it has no verse keys; the §5 index keeps verse
 *  precision). Both editions ship in one file; a setting picks which renders.
 *  `refs?` is the optional, explicitly-derived "Trent cites this verse" map
 *  (deferred — see the design spec §4.3). The modern CCC text is NEVER here. */
export interface TrentSection { id: string; title: string; html: string; }
export interface TrentPart { id: string; title: string; sections: TrentSection[]; }
export interface TrentEdition {
  edition: string;
  source: string;
  license: string;
  parts: TrentPart[];
  refs?: Record<string, string[]>;
}
export interface TrentFile {
  editions: Record<import("./catechism").TrentEditionId, TrentEdition>;
}

let trentPromise: Promise<TrentFile | null> | null = null;
/** Load the bundled Trent corpus once, memoized like loadCCC. A 404 (the layer
 *  isn't built) yields null, never an error the sheet must handle. */
export function loadTrent(): Promise<TrentFile | null> {
  trentPromise ??= fetch(`${import.meta.env.BASE_URL}data/trent/trent.json`)
    .then((r) => (r.ok ? (r.json() as Promise<TrentFile>) : null))
    .catch(() => null);
  return trentPromise;
}
```

- [ ] **Step: Run, expect PASS.** `npm run build` (tsc + vite) green; `npm test` green (the §20 Trent-shape + manifest-seal + §5-untouched checks all pass; the existing §19 CCC index checks still pass).

- [ ] **Step: Commit.**

```sh
git add src/lib/data.ts scripts/test-data.ts
git commit -m "data: TrentFile types + memoized loadTrent(); §20 Trent-shape + seal assertions"
```

---

## Task 5: `Settings.trentEdition` — field, default, validation (TDD)

**Files:** Modify `src/lib/storage.ts` (the `Settings` interface ~line 47-87; the `getSettings()` defaults ~line 112-139; the validation block ~line 155); Modify `scripts/test-data.ts` (extend §20).

**Interfaces:** Consumes `DEFAULT_TRENT_EDITION`/`isTrentEdition`/`TrentEditionId` from `catechism.ts`. Produces `Settings.trentEdition: TrentEditionId`.

- [ ] **Step: Write the failing test.** Append to the §20 block in `scripts/test-data.ts`:

```ts
  // The Trent-edition setting defaults to Donovan and rejects a bad stored value.
  {
    const { getSettings } = await import("../src/lib/storage");
    const s = getSettings();
    check("getSettings() defaults trentEdition to donovan", s.trentEdition === "donovan", String(s.trentEdition));
    check("Settings.trentEdition is a valid edition id", isTrentEdition(s.trentEdition));
  }
```

(`getSettings()` runs in the harness today — §9 already calls it — because `localStorage` is unavailable there and `read()` falls back to `{}`, yielding the defaults.)

- [ ] **Step: Run, expect FAIL.** `npm test` → `s.trentEdition` is `undefined` (field doesn't exist). Confirm red.

- [ ] **Step: Implement.** In `src/lib/storage.ts`:
  1. Add the import near the top (with the other `./lib`-sibling imports):
     ```ts
     import { DEFAULT_TRENT_EDITION, isTrentEdition, type TrentEditionId } from "./catechism";
     ```
  2. Add the field to the `Settings` interface, after `cccLinksEnabled` (line 78):
     ```ts
       /** Which bundled Roman-Catechism (Trent) edition the inline sheet renders:
        *  Donovan 1829 (default) or the modern-English McHugh-Callan 1923. */
       trentEdition: TrentEditionId;
     ```
  3. Add the default in `getSettings()`, after `cccLinksEnabled: true,` (line 132):
     ```ts
         trentEdition: DEFAULT_TRENT_EDITION,
     ```
  4. Add validation beside the `scriptureFont` guard (~line 155):
     ```ts
       if (!isTrentEdition(settings.trentEdition)) settings.trentEdition = DEFAULT_TRENT_EDITION;
     ```

- [ ] **Step: Run, expect PASS.** `npm test` green; `npm run build` green.

- [ ] **Step: Commit.**

```sh
git add src/lib/storage.ts scripts/test-data.ts
git commit -m "settings: add trentEdition (donovan default) with validation"
```

---

## Task 6: Add the `"book"` Catechism icon

The Catechism action and the Commentary action can both appear in one verse-actions bar, so the Catechism needs a **distinct** mark, not the shared `commentary` speech-bubble. A single-stroke closed book reads as "the Catechism" without colliding.

**Files:** Modify `src/components/Icon.tsx` (the `IconName` union ~line 16-28; `PATHS` ~line 30-77).

**Interfaces:** Produces a new `IconName` member `"book"`, consumed by `Reader.tsx` (Task 8).

- [ ] **Step: Add to the union.** In `Icon.tsx`, add `"book"` after `"commentary"` (line 21):

```tsx
  | "commentary"
  | "book"
```

- [ ] **Step: Add to `PATHS`.** After the `commentary` block (line 52), add:

```tsx
  book: (
    <>
      <path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z" />
      <path d="M4 5v14" />
      <path d="M9 7h6" />
    </>
  ),
```

- [ ] **Step: Verify.** `npm run build` green; `npm test` green (the §1.5 icon test at `test-data.ts:1014` checks a *subset* of names exists, so adding `book` does not break it; the single-stroke-weight check still passes — no `strokeWidth` added). Browser check deferred to Task 8.

- [ ] **Step: Commit.**

```sh
git add src/components/Icon.tsx
git commit -m "icon: add a single-stroke book mark for the Catechism action"
```

---

## Task 7: `src/components/CCCSheet.tsx` + the `.ccc-sheet` styles

A sibling of `CommentarySheet`, mounted via `Sheet variant="panel"` (no change to `Sheet.tsx` — the panel variant already exists). It loads Trent lazily on open, renders the chosen edition browsable-by-Part (Tier 2), and keeps the precise vatican.va ¶ links as a footer row (Tier 3). **No gold anywhere** — purple acts, the credit is muted text.

**Files:** Create `src/components/CCCSheet.tsx`; Modify `src/styles.css` (append a `.ccc-sheet` block); extend `scripts/test-data.ts` §20.

**Interfaces:** Consumes `loadTrent`/`TrentFile`/`TrentEdition` (Task 4), `pickTier`/`pickEdition`/`TrentEditionId` (Task 3), `capParagraphs` (`src/lib/ccc.ts`). Produces the default-exported `CCCSheet` component, consumed by `Reader.tsx` (Task 8).

- [ ] **Step: Create `src/components/CCCSheet.tsx`** (complete):

```tsx
import { useEffect, useState } from "react";
import { TrentEdition, TrentFile, loadTrent } from "../lib/data";
import { capParagraphs } from "../lib/ccc";
import { pickEdition, pickTier, TrentEditionId } from "../lib/catechism";

interface Props {
  book: string;
  chapter: number;
  verse: number;
  /** e.g. "John 3:16" — the sheet heading; matches Sheet's aria-labelledby. */
  refLabel: string;
  titleId: string;
  /** The CCC ¶ numbers that cite this verse (from the §5 index). */
  paras: number[];
  /** ¶ → vatican.va page (the §5 url map). */
  urls: Record<string, string>;
  /** The reader's chosen Trent edition. */
  edition: TrentEditionId;
}

/**
 * Spec §5 (text tier) — the inline catechism sheet. Tier 2 (default): the bundled
 * PD Roman Catechism (Trent), browsable by Part → section. Tier 3 (always, when
 * the verse is cited): the precise vatican.va ¶ links, now living INSIDE the sheet
 * rather than a forced redirect. Tier 1 ("imported" supersede) is the P2 seam:
 * `imported` is false here, so pickTier never returns "imported" yet.
 *
 * Two-accent (§8.2): everything interactive/structural is purple; the source
 * credit is plain muted provenance — NO gold in this sheet.
 */
export default function CCCSheet({ refLabel, titleId, paras, urls, edition }: Props) {
  const [trent, setTrent] = useState<TrentFile | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<{ partId: string; secId: string } | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let alive = true;
    loadTrent()
      .then((t) => { if (alive) { setTrent(t); setLoading(false); } })
      .catch(() => { if (alive) { setTrent(null); setLoading(false); } });
    return () => { alive = false; };
  }, []);

  const tier = pickTier({ imported: false, hasParas: paras.length > 0, trent: !!trent });
  const ed: TrentEdition | null = trent ? pickEdition(trent, edition) : null;
  const section =
    ed && open
      ? ed.parts.find((p) => p.id === open.partId)?.sections.find((s) => s.id === open.secId) ?? null
      : null;
  const { shown, more } = capParagraphs(paras);

  return (
    <div className="ccc-sheet">
      <h2 id={titleId} className="ccc-sheet-title">{refLabel}</h2>

      {/* Tier 2 — the bundled Roman Catechism (Trent), browsable by Part. Gated on
          `tier !== "imported"`, NOT `=== "trent"`: while Trent is still loading,
          `trent` is null, so pickTier returns "links" (and on a failed fetch it stays
          "links"). A `=== "trent"` gate would therefore hide the `loading` spinner and
          the "isn't available" message until/unless the fetch resolved successfully —
          they'd be dead branches. In P1 `imported` is always false, so this block owns
          every non-supersede state and its inner ladder handles loading/null/section/TOC. */}
      {tier !== "imported" &&
        (loading ? (
          <p className="cmt-loading muted small sans">Opening the Catechism…</p>
        ) : !ed ? (
          <p className="muted small sans">The Roman Catechism isn't available on this device.</p>
        ) : section ? (
          <div className="ccc-section">
            <button type="button" className="ccc-back" onClick={() => setOpen(null)}>
              ← All sections
            </button>
            <h3 className="ccc-sec-title">{section.title}</h3>
            <div className="ccc-prose" dangerouslySetInnerHTML={{ __html: section.html }} />
          </div>
        ) : (
          <div className="ccc-toc">
            <p className="ccc-note muted small sans">
              The Roman Catechism is arranged by the Creed, the Sacraments, the
              Commandments, and the Lord's Prayer rather than by verse — browse below.
            </p>
            {ed.parts.map((p) => (
              <div className="ccc-toc-part" key={p.id}>
                <div className="ccc-toc-part-title">{p.title}</div>
                <ul className="ccc-toc-secs">
                  {p.sections.map((s) => (
                    <li key={s.id}>
                      <button
                        type="button"
                        className="ccc-toc-sec"
                        onClick={() => setOpen({ partId: p.id, secId: s.id })}
                      >
                        {s.title}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            <div className="ccc-credit muted small sans">{ed.edition} · public domain</div>
          </div>
        ))}

      {/* Tier 3 — the §5 vatican.va ¶ links, now inside the sheet (never lost). */}
      {paras.length > 0 && (
        <div className="ccc-row">
          <span className="ccc-label">Read on vatican.va</span>
          {(expanded ? paras : shown).map((p) =>
            urls[String(p)] ? (
              <a
                key={p}
                className="ccc-ref"
                href={urls[String(p)]}
                target="_blank"
                rel="noopener noreferrer"
              >
                ¶{p}
              </a>
            ) : (
              <span key={p} className="ccc-ref muted">¶{p}</span>
            )
          )}
          {!expanded && more > 0 && (
            <button type="button" className="ccc-more" onClick={() => setExpanded(true)}>
              +{more} more
            </button>
          )}
        </div>
      )}
    </div>
  );
}
```

(The `← All sections` arrow `←` U+2190 is **not** on the harness `FORBIDDEN` list — only `⚑ ✎ ☾ ☀ ⧉ ✠ ✕ ✓` are — so the emoji guard stays green. `dangerouslySetInnerHTML` is safe: `html` is build-sealed, paragraph-only, re-escaped text from Task 2.)

- [ ] **Step: Append the `.ccc-sheet` styles** to `src/styles.css` (after the `.cmt-*` block, ~line 1613). Purple acts; the credit is muted, **no gold**:

```css
/* §5 inline catechism sheet (Trent). Purple ACTS (TOC, links, back); the source
   credit is plain muted provenance — NO gold here (unlike the Catena credit). */
.ccc-sheet-title { margin: 0 3rem 0.6rem 0; }
.ccc-note { margin: 0 0 0.9rem; }
.ccc-toc-part { margin: 0 0 1rem; }
.ccc-toc-part-title {
  font-family: var(--sans);
  font-size: 0.72rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-muted);
  margin-bottom: 0.35rem;
}
.ccc-toc-secs { list-style: none; margin: 0; padding: 0; }
.ccc-toc-secs li { margin: 0; }
.ccc-toc-sec {
  display: block;
  width: 100%;
  text-align: left;
  background: none;
  border: none;
  cursor: pointer;
  font: inherit;
  color: var(--purple);
  padding: 0.4rem 0;
  min-height: 44px;
}
@media (hover: hover) { .ccc-toc-sec:hover { text-decoration: underline; } }
.ccc-toc-sec:focus-visible { outline: 2px solid var(--purple); outline-offset: 2px; }
.ccc-back {
  background: none;
  border: none;
  cursor: pointer;
  font-family: var(--sans);
  font-size: 0.85rem;
  color: var(--purple);
  padding: 0.3rem 0;
  margin-bottom: 0.4rem;
}
.ccc-back:focus-visible { outline: 2px solid var(--purple); outline-offset: 2px; }
.ccc-sec-title { margin: 0 0 0.5rem; font-size: 1.05rem; }
.ccc-prose { line-height: 1.62; }
.ccc-prose p { margin: 0 0 0.7rem; }
.ccc-credit {
  margin-top: 0.9rem;
  padding-top: 0.6rem;
  border-top: var(--hairline) solid var(--border);
}
```

- [ ] **Step: Add the two-accent guard.** In `scripts/test-data.ts` §20, append:

```ts
  // Two-accent (§8.2): the sheet ACTS in purple and carries NO gold anywhere.
  const cccSheetSrc = readFileSync(join(ROOT, "src/components/CCCSheet.tsx"), "utf8");
  check("CCCSheet renders no gold honor (purple acts; credit is muted)",
    !/--gold/.test(cccSheetSrc) && !cccSheetSrc.includes("✠"));
  const css = readFileSync(join(ROOT, "src/styles.css"), "utf8");
  check("the Trent TOC button acts in purple", /\.ccc-toc-sec\s*\{[^}]*var\(--purple\)/.test(css));
  check("the Trent credit is muted provenance, not gold", /\.ccc-credit\s*\{[^}]*var\(--text-muted\)|\.ccc-credit\b/.test(css) && /\.ccc-toc-part-title\s*\{[^}]*var\(--text-muted\)/.test(css));
```

- [ ] **Step: Verify.** `npm run build` green; `npm test` green (emoji guard still passes — `←` is allowed; the new two-accent checks pass). Browser deferred to Task 8 (the sheet has no Reader entry point yet).

- [ ] **Step: Commit.**

```sh
git add src/components/CCCSheet.tsx src/styles.css scripts/test-data.ts
git commit -m "ccc: inline CCCSheet (Trent browser + vatican links inside) — purple acts, no gold"
```

---

## Task 8: Reader integration — Catechism action opens the sheet

The v1.9.0 inline `.ccc-row` link block becomes a **Catechism action button** in `.verse-actions` (the "no forced redirect" win); the links move into the sheet (Task 7). The gutter `.ccc-mark` and `loadCCC()` wiring are unchanged.

**Files:** Modify `src/pages/Reader.tsx`.

**Interfaces:** Consumes `CCCSheet` (Task 7), `Icon name="book"` (Task 6), the existing `cccParagraphs`/`isCited` and `ccc`/`settings.trentEdition`.

- [ ] **Step: Update imports.** In `Reader.tsx`:
  - Line 6 — drop `capParagraphs` (it moved into the sheet); keep `cccParagraphs`, `isCited`:
    ```tsx
    import { cccParagraphs, isCited } from "../lib/ccc";
    ```
  - After the `CommentarySheet` import (line 24), add:
    ```tsx
    import CCCSheet from "../components/CCCSheet";
    ```

- [ ] **Step: Swap the CCC state.** Replace the `cccExpanded` state (line 65) with the open-verse state:
  - Remove: `const [cccExpanded, setCccExpanded] = useState(false);`
  - Add (beside `commentaryFor`/`shareFor`, ~line 61): `const [cccFor, setCccFor] = useState<number | null>(null);`

- [ ] **Step: Reset the open verse on re-selection.** In `onSelectVerse` (~line 249), replace `setCccExpanded(false);` with `setCccFor(null);` so tapping a different verse closes any open Catechism sheet.

- [ ] **Step: Reset the sheet on chapter/book navigation.** In the navigation reset effect — the one that already calls `setCommentaryFor(null);` and `setShareFor(null);` (~lines 153–154) — add `setCccFor(null);` beside them. Without it, navigating to a new chapter while the sheet is open leaves it mounted (`{cccFor != null && ccc && …}` doesn't depend on `selected`, which IS reset there) with a stale `refLabel`/`paras` — the exact bug `commentaryFor`/`shareFor` avoid by resetting here.

- [ ] **Step: Replace the inline `.ccc-row` with an action button.** Delete the entire `{cccParas.length > 0 && ( <div className="ccc-row"> … </div> )}` block (Reader lines ~545-571) and, in the action cluster after the Commentary button (after the `commentaryAvailable` block, ~line 541), add:

```tsx
          {cccParas.length > 0 && (
            <button className="icon-btn" onClick={() => setCccFor(selRef.verse)}>
              <Icon name="book" /> Catechism
            </button>
          )}
```

- [ ] **Step: Mount the sheet.** Next to the commentary sheet (after the `commentaryFor != null` `<Sheet>` block, ~line 608), add:

```tsx
      {cccFor != null && ccc && (
        <Sheet variant="panel" titleId="ccc-title" onClose={() => setCccFor(null)}>
          <CCCSheet
            book={bookSlug}
            chapter={chapter}
            verse={cccFor}
            refLabel={`${displayName} ${chapter}:${cccFor}`}
            titleId="ccc-title"
            paras={cccParagraphs(ccc.index, bookSlug, chapter, cccFor)}
            urls={ccc.url}
            edition={settings.trentEdition}
          />
        </Sheet>
      )}
```

- [ ] **Step: Add the Reader-integration guard.** In `scripts/test-data.ts` §20, append:

```ts
  // The Reader exposes the Catechism as a sheet action, not a forced redirect.
  const readerSrc = readFileSync(join(ROOT, "src/pages/Reader.tsx"), "utf8");
  check("Reader opens CCCSheet (no inline ccc-row links)",
    readerSrc.includes("<CCCSheet") && !readerSrc.includes('className="ccc-row"'));
  check("Reader keeps the purple gutter mark + loadCCC", readerSrc.includes("ccc-mark") && readerSrc.includes("loadCCC"));
```

- [ ] **Step: Verify.** `npm run build` green; `npm test` green. Browser (`npm run dev`): open `/read/drc/john/3`, tap verse 16 → the action bar shows a **Catechism** button (book glyph) with no inline ¶ row; tapping it opens the right-docked panel (desktop) / bottom sheet (phone); Trent shows the four-Part TOC + the honest "arranged by topic" note; tapping a section renders its prose with an `← All sections` back; the `Read on vatican.va: ¶219 · ¶444 …` footer is present and links open in a new tab; Escape/backdrop closes and focus returns to the verse. The gutter mark on cited verses is unchanged.

- [ ] **Step: Commit.**

```sh
git add src/pages/Reader.tsx scripts/test-data.ts
git commit -m "reader: Catechism action opens the inline CCCSheet; vatican links move inside it"
```

---

## Task 9: Settings — Magisterium edition selector + updated copy

**Files:** Modify `src/pages/Settings.tsx` (the Magisterium `<section>`, lines 459-479).

**Interfaces:** Consumes `TRENT_EDITIONS`/`TrentEditionId` from `catechism.ts`; the live `settings.trentEdition` + `update()`.

- [ ] **Step: Import the vocabulary.** Add near the top of `Settings.tsx` (with the other `../lib` imports):

```tsx
import { TRENT_EDITIONS } from "../lib/catechism";
```

- [ ] **Step: Update the cross-references copy** (lines 464-468) to reflect the inline sheet:

```tsx
            <div className="setting-label">Catechism cross-references</div>
            <p className="catechesis muted small">
              Show the Catechism on a cited verse — the bundled Roman Catechism (Trent),
              or, in a future release, your own imported copy of the modern Catechism.
              Links to vatican.va remain available inside the sheet. No modern Catechism
              text is bundled.
            </p>
```

- [ ] **Step: Add the edition selector** inside the Magisterium `<section>`, after the cross-references `setting-row` (before `</section>` at line 479), shown only when the master gate is on:

```tsx
        {settings.cccLinksEnabled && (
          <div className="setting-row">
            <div>
              <div className="setting-label">Roman Catechism edition</div>
              <p className="catechesis muted small">
                Donovan (1829) is the classic English; McHugh-Callan (1923) reads in
                more modern English. Both are public domain and bundled.
              </p>
            </div>
            <select
              aria-label="Roman Catechism edition"
              value={settings.trentEdition}
              onChange={(e) => update({ trentEdition: e.target.value as (typeof TRENT_EDITIONS)[number]["id"] })}
            >
              {TRENT_EDITIONS.map((ed) => (
                <option key={ed.id} value={ed.id}>{ed.label}</option>
              ))}
            </select>
          </div>
        )}
```

(Confirmed against the file: the existing Settings selects — Region (`Settings.tsx:348`) and Mass readings (`Settings.tsx:369`) — are **bare `<select>` elements with no class**, styled by the global `select` rule in `styles.css`. So this one carries no class either, only the `aria-label` for the unlabeled control.)

- [ ] **Step: Verify.** `npm run build` green; `npm test` green. Browser: Settings → Magisterium shows the edition `<select>` when cross-references is on (hidden when off); flipping it to McHugh-Callan and reopening a Catechism sheet renders the 1923 prose; the choice persists across reload (localStorage).

- [ ] **Step: Commit.**

```sh
git add src/pages/Settings.tsx
git commit -m "settings: Trent-edition selector + inline-sheet Magisterium copy"
```

---

## Task 10: Release — v1.14.0 "the twin catechisms"

**Files:** Modify `package.json` (+ `package-lock.json` via `npm version`), `CHANGELOG.md`, `README.md`, `CLAUDE.md`; `src/pages/About.tsx` only if a user-facing claim changed.

- [ ] **Step: Bump the version.** Run: `npm version 1.14.0 --no-git-tag-version` (writes `package.json` + lockfile, no tag/commit). Name TBD — proposed **"the twin catechisms"** (renameable).

- [ ] **Step: Add the CHANGELOG entry** above the most recent section (newest-first, dated 2026-06-27), grouped Added / Changed, noting: the bundled PD Roman Catechism (Trent) in both editions; the inline `CCCSheet` (Tier 2 browse + Tier 3 vatican links inside it); the Reader Catechism action replacing the inline link row; the Settings edition selector; that the modern CCC text is still never bundled (P2 import is the next step); that the §5 index is byte-for-byte unchanged.

- [ ] **Step: Update the README masthead** badge to `v1.14.0` and add a Highlights line (inline Catechism: bundled Trent, both editions).

- [ ] **Step: Add the CLAUDE.md ledger paragraph** for v1.14.0 (mirror the existing per-release blocks), and a one-line entry in the release-ledger list. Note: Trent ships **browsable-by-section** (no PD verse→Trent index exists — structural fact); the §5 verse→¶ index keeps verse precision; the modern-CCC import is deferred to P2.

- [ ] **Step: Update About** only if a claim changed (likely none — Trent is bundled PD, no new copyrighted-text claim).

- [ ] **Step: Final verify.** Run: `npm test && npm run build && npm run check-docs` — all green. Browser smoke test of every touched surface (Reader action + sheet, Settings selector).

- [ ] **Step: Commit.**

```sh
git add package.json package-lock.json CHANGELOG.md README.md CLAUDE.md src/pages/About.tsx
git commit -m "v1.14.0 'the twin catechisms' — bundled Trent + the inline catechism sheet (§5 text tier, P1)"
```

- [ ] **Step:** Stop and ask the owner before pushing / opening a PR.

---

## Open questions (for sign-off)

1. **McHugh-Callan 1923 source (Task 1).** Donovan 1829 has a clean Wikisource transcription; a clean, machine-readable, PD-in-US McHugh-Callan MediaWiki transcription must be confirmed. If none exists, choose: (a) ship Donovan-only for P1 and defer McHugh-Callan, or (b) source McHugh-Callan from an archive.org full-text and write a heavier cleaner. The owner decided **both bundled** — surface this before fabricating a pin.
2. **Derived `refs.json` (design §4.3).** This plan **defers** the approximate verse→Trent-section map to P3 (so a verse pre-opens the relevant Trent section). The sheet currently opens to the TOC root. Confirm deferral, or pull it into P1 (adds build surface; must be labeled "Trent cites this verse," never authoritative).
3. **Icon choice (Task 6).** This plan adds a dedicated `"book"` mark rather than reusing `commentary` (which would visually collide with the Commentary action on a verse that has both). Confirm the new icon, or specify a different existing mark to reuse.
4. **Release name.** "the twin catechisms" is proposed for v1.14.0 — trivial to rename.

## Self-review (spec coverage)

- **P1 scope only.** Trent bundled (both editions) + `loadTrent` + `CCCSheet` (Tier 2 + Tier 3) + Reader action + Settings selector + copy. The P2 modern-CCC import path (`fidelis-ccc-1`, `parseCccText`, IndexedDB `ccc` store, `loadCCCText`, the converter, the Tier-1 supersede branch) is **explicitly out of scope**; only the `pickTier({ imported })` seam is left. ✓
- **Test surface honored.** Pure logic (`pickTier`, `pickEdition`, edition vocabulary, settings default, the on-disk Trent shape, the manifest seal, the two-accent/Reader source guards) gets hard `scripts/test-data.ts` §20 assertions via the add-assertion → `npm test` red → implement → `npm test` green loop. UI (`CCCSheet`, Settings selector, Reader wiring) is verified by `npm run build` (tsc + vite) + a described manual `/verify`. No invented pytest/jest. ✓
- **Data discipline.** `trent.json` is built by `scripts/build-trent.mjs` (never hand-edited), sealed by `build-manifest.mjs`, verified by `npm run verify-data` + the §20 hash-seal check. Golden snapshots untouched (no engine change). No `DATA_CACHE` bump (new file, network-first manifest). ✓
- **Two-accent + §13.** The sheet is purple-acts / muted-credit with **no gold** (asserted by source-grep); the gutter mark stays the fixed-purple `.ccc-mark`; the modern CCC text is never bundled; no AI/social/streaks/notifications; Today stays five cards (untouched). ✓
- **Type consistency.** `TrentEditionId`/`TRENT_EDITIONS`/`DEFAULT_TRENT_EDITION`/`isTrentEdition`/`pickTier`/`pickEdition` defined once in `catechism.ts`; `TrentSection`/`TrentPart`/`TrentEdition`/`TrentFile`/`loadTrent` defined once in `data.ts`; `catechism.ts` imports `data.ts` **type-only** (no runtime cycle); `storage.ts` imports the runtime vocab from the leaf `catechism.ts`. Every referenced symbol is produced by a named task. ✓
- **Reconnaissance vs. placeholders.** Task 1's `oldid`/`page` values are genuine environment data captured by explicit reconnaissance commands (the example-plan precedent), not deferred work; Task 9's selector was resolved by reading the file (the Settings selects are bare/classless); every code step shows complete code. ✓
