# §3 — The Quote-of-the-Day Intake & Build Contract

[← Docs index](../../INDEX.md)

**Date:** 2026-06-27
**Spec section:** Feature Design Spec §3 (Quote of the Day) — the intake/build half
**Branch:** `quotes-corpus-intake`
**Status:** the pipeline is **already shipped** (corpus, validator, selector, widget
sync, harness — §3 in v1.4.0, §3.4 verification ledger closed in v1.8.3 with all 47
entries verified). This is **not** a new feature. It is the **handoff contract**: the
product owner is authoring/expanding `scripts/quotes.corpus.json` himself, and this
doc pins the exact schema, rules, build steps, and on-receipt checks so the corpus
hand-back is clean and the manifest/harness stay green. **No engine changes.**

The selection engine (`src/lib/quotes.ts`), the validator (`scripts/build-quotes.mjs`),
and the harness section (`scripts/test-data.ts`, the §3 block at ~L809) already exist
and are the source of truth; this spec describes what they enforce, not what to build.

---

## 1. The one editable file

| File | Role |
|------|------|
| `scripts/quotes.corpus.json` | **The source. Edit here.** `{ "_readme": [...], "quotes": [...] }` |
| `public/data/quotes.json` | **Emitted. Never hand-edit** (standing rule 1). `{ "quotes": [...] }`, minified, manifest-sealed. |

`public/data/quotes.json` is byte-for-byte `JSON.stringify({ quotes: corpus.quotes })`
— the harness asserts that exact equality, so the only way to change it is to edit the
corpus and re-run the build.

---

## 2. Entry schema (§3.1)

Each element of `quotes[]` is an object. **Required string fields** (non-empty;
`build-quotes.mjs` throws on a missing/blank one): `id`, `text`, `author`,
`authorTitle`, `work`, `locus`, `sourceEdition`. **Required-but-nullable** (the *key*
must be present; value is the typed value **or** `null`): `feast`, `season`.
**Optional**: `tags[]`, `verified`.

| Field | Type | Notes |
|-------|------|-------|
| `id` | string | Stable kebab slug, unique. Convention: `author-work-locus`, e.g. `augustine-conf-1-1`. Duplicate ids throw. |
| `text` | string | The quotation, in English, no surrounding quote-marks (the UI/widget supplies the gold ❝❞). |
| `author` | string | Display name, e.g. `St. Augustine of Hippo`. The red list (§3) is matched against this. |
| `authorTitle` | string | Honorific line, e.g. `Bishop and Doctor of the Church`. |
| `work` | string | The work cited, e.g. `Confessions`. |
| `locus` | string | The in-work reference, e.g. `I, 1`. |
| `sourceEdition` | string | The **public-domain** translation/edition + the words `public domain`, e.g. `trans. E. B. Pusey (1838), public domain`. This is the PD provenance line (§3). |
| `feast` | `"MM-DD"` \| `null` | The author's sanctoral feast for tier-1 matching. Must match `^\d{2}-\d{2}$` or be `null`. |
| `season` | `advent`\|`christmastide`\|`lent`\|`eastertide`\|`null` | The tier-2 pool. Any other value throws. |
| `tags` | string[] | Optional themes (`["desire","rest","conversion"]`). Not used by selection today; future search/filter. |
| `verified` | boolean | `true` once checked against a printed/scanned copy of the named edition (§3.4). The harness counts verified vs draft so the debt stays visible. |

**Real example (the canonical first entry — copy its shape):**

```json
{
  "id": "augustine-conf-1-1",
  "text": "Thou madest us for Thyself, and our heart is restless, until it repose in Thee.",
  "author": "St. Augustine of Hippo",
  "authorTitle": "Bishop and Doctor of the Church",
  "work": "Confessions",
  "locus": "I, 1",
  "sourceEdition": "trans. E. B. Pusey (1838), public domain",
  "feast": "08-28",
  "season": null,
  "tags": ["desire", "rest", "conversion"],
  "verified": true
}
```

> Build-validator gap to know: `build-quotes.mjs` currently hard-enforces the **six**
> fields `id/text/author/work/locus/sourceEdition` (not `authorTitle`). `authorTitle`
> is required by the `DailyQuote` TS type and present in all 47 shipped entries; the
> owner must keep filling it. (Optional cleanup: add `authorTitle` to `REQUIRED` in
> both `build-quotes.mjs` and the harness — see Open questions.)

---

## 3. The binding public-domain rule + red list (§3.3)

**Rule:** every quotation must come from a **public-domain work in a public-domain
translation/edition**, and `sourceEdition` must name that PD translation/edition. A
line being beautiful or shareable does **not** make it admissible.

**Build-time red list** (`scripts/build-quotes.mjs`, matched case-insensitively
against `author`, with the leading `St.`/`Pope St.` stripped before re-testing):

```
/fulton\s+sheen/      /escriv/         /padre\s+pio|pietrelcina/
/john\s+paul/         /benedict\s+xvi|ratzinger/
/^(pope\s+)?francis$/ /bergoglio/
```

These reject living/recent authors whose works are still in copyright (Sheen,
Escrivá, Padre Pio's writings, John Paul II, Benedict XVI/Ratzinger, Pope Francis).
The pope-Francis pattern is **anchored** so that **St. Francis of Assisi**,
**de Sales**, and **Xavier** stay green. A red-list hit throws at build time. The
harness re-checks a parallel list independently, so a bypass fails CI too.

**Limit of the automated check:** the red list guards *authorship era*, not
*translation copyright*. The validator does **not** verify that `sourceEdition`
actually names a PD translation — a modern still-copyright translation of an ancient
author (e.g. a 2010 critical translation of Augustine) would pass the script. That
judgement is the **human/Claude review** in §6. When in doubt, prefer a pre-1929
translation and say so in `sourceEdition`.

---

## 4. Selection model (§3.2) — adding quotes only grows the pool

Resolution is a three-tier precedence chain (`quoteOfTheDay()` in `src/lib/quotes.ts`),
deterministic per device-local day, index `idx = dayOfYear(date) + date.getFullYear()`:

1. **Sanctoral** — quotes whose `feast === "MM-DD"` of today **and** whose `author`
   tokens actually appear in the resolved day's celebrations (`celebratesAuthor`, so a
   transferred/suppressed feast does not fire). `pool[idx % pool.length]`.
2. **Seasonal** — else, if the day's season is Advent/Christmastide/Lent/Eastertide,
   the quotes tagged with that `season`. Same `idx %` arithmetic.
3. **General cycle** — else, the `season === null` remainder, `general[idx % len]`
   (the VOTD philosophy: everyone sees the same quote on the same day, the cycle
   never shifts beneath them).

The selector is **count-driven**: adding entries to any tier simply enlarges that
pool's modulus — no code change, no re-ordering, no migration. Two standing minimums
the harness enforces: **≥ 40 total** entries, and **every seasonal pool non-empty**
(at least one Advent, Christmastide, Lent, Eastertide quote each). The current corpus
is 47 entries (34 with a feast, 12 seasonal, all verified).

This corpus also feeds the **native Quote-of-the-Day widget** (see §5) via the
pre-resolved `calendar.json`, where each day carries `quote: { text, author }`.

---

## 5. Build & handoff steps

After the owner edits `scripts/quotes.corpus.json`:

1. **`npm run quotes`** — runs `scripts/build-quotes.mjs`: validates the schema +
   red list, writes `public/data/quotes.json` (minified), then **re-seals the
   manifest** (`writeManifest`) so `public/data/manifest.json` carries the new
   SHA-256 + root hash. It prints `N quotes (V verified, D drafts)`.
2. **`npm run calendar-widget`** — runs `scripts/build-calendar-widget.ts`: re-resolves
   `quoteOfTheDay()` for the rolling date window and re-emits `quote` into
   `calendar.json` for **both** native shells
   (`ios/WidgetExtension/calendar.json` and
   `android/app/src/main/res/raw/calendar.json`). This is the step that pushes new
   quote selections to the home-screen widget. (`npm run widgets` runs this **and**
   the VOTD widget together.)
3. **`npm test`** — re-runs both harnesses + the manifest re-walk; the §3 block
   asserts corpus↔emitted byte-equality, the schema, the red list, non-empty seasonal
   pools, all three tiers, and full-year determinism. Must be green.
4. **`npm run build`** — type-check + Vite build, to confirm nothing downstream broke.

> **Quotes vs VOTD — the trap.** `scripts/build-votd-widget.mjs` is the **Verse**-of-the-Day
> pipeline: it reads Scripture refs from `src/lib/votd.ts` and emits `votd.json`. It
> **does not touch quotes** and editing the quote corpus does **not** require running it.
> The **Quote** widget is fed by `calendar.json` from `scripts/build-calendar-widget.ts`
> (step 2). The two are independent; don't confuse the file names.

The owner hands back the edited `scripts/quotes.corpus.json` (and may have run the
steps himself). On receipt, Claude runs §6 and the build steps above, then commits the
corpus + the regenerated `public/data/quotes.json`, manifest, and both `calendar.json`
files together.

---

## 6. What Claude validates / sets on receipt

For each new or changed entry, before building:

- **`id`** — confirm it is a unique kebab slug (no spaces/uppercase/duplicates); if the
  owner left it blank or collided, mint `author-work-locus` and make it unique. The
  validator throws on duplicates, so this must be clean.
- **PD provenance** — read each `sourceEdition` and confirm it names a genuinely
  public-domain translation/edition (the automated check can't, §3). Reject or fix
  anything resting on a modern in-copyright translation; prefer pre-1929 editions.
- **`feast` date lookup** — for sanctoral entries, verify the `"MM-DD"` is the author's
  actual feast on the app's calendar and that `author` tokens will match a celebration
  name on that day (so tier-1 fires). Null it out if the author has no fixed-date feast.
- **`season`** — confirm the tag matches the quote's intent and that each of the four
  pools stays non-empty after the edit.
- **`verified`** — set `true` only when the text has been checked against the named PD
  edition (printed/scanned). Leave `false` for drafts; never invent `true`. The harness
  counts both so the verification debt stays visible.
- **`authorTitle`** — ensure it is present and non-empty (TS type + convention).
- Then run §5 steps 1–4 and confirm green output before committing.

---

## 7. Test plan (already in `scripts/test-data.ts` §3 block)

No new assertions are required to *grow* the corpus; the existing block already covers:
corpus↔emitted byte-equality; ≥40 entries; every entry satisfies the §3.1 schema;
no red-list author; each seasonal pool non-empty; tier-1 (Aug 28 → Augustine),
tier-2 (a Lent feria → Lent pool), tier-3 (an OT feria → general); and that a quote
resolves for **every** day of 2026, deterministically (same input → same id twice).
Run `npm test` after every corpus change; a red result means the edit broke a rule.

---

## 8. Files touched (intake only)

| File | Change |
|------|--------|
| `scripts/quotes.corpus.json` | **owner-authored** — new/edited entries |
| `public/data/quotes.json` | regenerated by `npm run quotes` (never hand-edited) |
| `public/data/manifest.json` | re-sealed by the same run |
| `ios/WidgetExtension/calendar.json`, `android/.../res/raw/calendar.json` | re-emitted by `npm run calendar-widget` |
| `CHANGELOG.md`, `package.json` | version bump + entry **if** the corpus grows in a release |

No `src/` changes; no new scripts. If the optional `authorTitle` validation tightening
(Open questions) is taken, `scripts/build-quotes.mjs` + the harness `REQUIRED` array
also change.

---

## 9. Out of scope / deferred

- **Engine changes** — the three-tier selector and `(dayOfYear + year) mod count`
  formula are fixed; this contract only feeds them data.
- **New optional fields** beyond `tags`/`verified` — none added here.
- **§13 refusal list stays binding** — quotes are honor marks (gold ❝❞), never a
  streak, badge, or notification; no living-author "inspirational" lines.
