# Quotes Corpus Intake & Build Implementation Plan

[← Docs index](../../INDEX.md)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Receive the owner-authored `scripts/quotes.corpus.json`, fill/validate the per-entry metadata (`id` slug, `feast` MM-DD, `verified`, PD provenance), regenerate the manifest-sealed `public/data/quotes.json` and the native widget `calendar.json`, and ship it green as release **v1.14.0**.

**Architecture:** This is a data/build pipeline, not a feature. The owner edits the one source file (`scripts/quotes.corpus.json`); `scripts/build-quotes.mjs` validates the schema + the §3.3 public-domain red list and emits the minified `public/data/quotes.json` while re-sealing `public/data/manifest.json`; `scripts/build-calendar-widget.ts` re-resolves `quoteOfTheDay()` and re-emits `quote` into both shells' `calendar.json`. **No engine changes** — `src/lib/quotes.ts` (selector), `scripts/build-quotes.mjs` (validator/red list), and the `scripts/test-data.ts` §3 block (L809–871) already exist and are the source of truth.

**Tech Stack:** Node 22 ESM build scripts (`node`/`tsx`), the two `tsx` assertion harnesses (`npm test`), TypeScript + Vite (`npm run build`).

## Global Constraints

Verbatim from CLAUDE.md standing rules + design-spec §3/§13. Every task implicitly includes these:

- **Never hand-edit anything under `public/data/`.** `public/data/quotes.json` regenerates only via `npm run quotes`; the manifest re-seals in the same run. The only editable file is `scripts/quotes.corpus.json`.
- **The §3.3 public-domain rule is binding.** Every quotation must come from a public-domain work in a public-domain translation/edition, and `sourceEdition` must name it. The build-time red list (`/fulton\s+sheen/`, `/escriv/`, `/padre\s+pio|pietrelcina/`, `/john\s+paul/`, `/benedict\s+xvi|ratzinger/`, `/^(pope\s+)?francis$/`, `/bergoglio/`) throws on a hit; the anchored pope-Francis pattern keeps **St. Francis of Assisi / de Sales / Xavier** green. The validator guards *authorship era*, not *translation copyright* — that judgement is the human/Claude review (Task 2).
- **Quotes ride `calendar.json`, not the VOTD builder.** `scripts/build-votd-widget.mjs` is the **Verse**-of-the-Day pipeline (`votd.json`) and does **not** touch quotes. The **Quote** widget is fed by `scripts/build-calendar-widget.ts` → `calendar.json`. Do not run/expect the VOTD builder for a corpus change.
- **§13 refusal list stays binding.** Quotes are honor marks (the UI/widget supplies the gold ❝❞), never a streak, badge, or notification; no living-author "inspirational" lines.
- **Two standing minimums the harness enforces:** ≥ 40 total entries, and every seasonal pool (advent / christmastide / lent / eastertide) non-empty.
- **Green bar = `npm test` (both harnesses + manifest re-walk + eslint) AND `npm run build` (tsc + vite).** Both must pass before the commit.
- **The existing `build-quotes.mjs` + the §3 harness block ARE the test.** Do not invent a new test framework; "the test fails" means the validator throws or a §3 `check(...)` goes red.

---

## Task 1: Receive the owner's corpus into `scripts/quotes.corpus.json`

The owner authors/expands the corpus himself and hands back the edited JSON. Drop it in as the single source file and confirm it parses with the right top-level shape before any processing.

**Files:** Modify `scripts/quotes.corpus.json` (owner-authored body); read `src/lib/quotes.ts:19-32` (the `DailyQuote` type) and `scripts/build-quotes.mjs:18-30` (REQUIRED + RED_LIST) for the contract.

**Interfaces:** Consumes the owner's handoff JSON. Produces the on-disk `scripts/quotes.corpus.json` with shape `{ "_readme": string[], "quotes": DailyQuote[] }` where each entry carries `id, text, author, authorTitle, work, locus, sourceEdition` (non-empty strings), `feast` (`"MM-DD"` | `null`), `season` (`advent|christmastide|lent|eastertide` | `null`), and optional `tags[]`, `verified`.

- [ ] **Step: Place the owner's file.** Save the owner's handoff content as `scripts/quotes.corpus.json` (overwriting the prior corpus). If the owner handed back only new entries, merge them into the existing `quotes[]` array rather than dropping the 47 shipped entries — confirm the final array is the union, not a replacement.

- [ ] **Step: Confirm it parses and has the right shape.** Run:

```bash
cd /Users/biscuit/Fidelis/app && node -e "const c=require('./scripts/quotes.corpus.json'); if(!Array.isArray(c.quotes)||!c.quotes.length) throw new Error('bad shape'); console.log('parsed OK:', c.quotes.length, 'quotes;', c.quotes.filter(q=>q.verified===true).length, 'verified;', c.quotes.filter(q=>q.feast).length, 'with feast')"
```

Expected: prints `parsed OK: N quotes; V verified; F with feast` (no throw). N must be ≥ 40. (Baseline before this release was 47/47/34.)

- [ ] **Step: Snapshot the seasonal-pool counts.** Run:

```bash
cd /Users/biscuit/Fidelis/app && node -e "const q=require('./scripts/quotes.corpus.json').quotes; const by={advent:0,christmastide:0,lent:0,eastertide:0}; q.forEach(x=>{if(x.season)by[x.season]++}); console.log(JSON.stringify(by)); for(const s in by) if(by[s]===0) throw new Error('empty seasonal pool: '+s)"
```

Expected: prints all four counts ≥ 1 (no throw). This pre-confirms the "each seasonal pool non-empty" harness check before the real build.

- [ ] **Step: Commit the raw intake.** Branch first if on `main`:

```bash
cd /Users/biscuit/Fidelis/app && git checkout -b quotes-corpus-intake && git add scripts/quotes.corpus.json && git commit -m "quotes: receive owner-authored corpus (raw intake, pre-validation)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Validate & fill the per-entry metadata (the §6 receipt review)

For each new or changed entry, confirm/mint the fields the validator and selector depend on. This is the human/Claude judgement the automated red list cannot make.

**Files:** Modify `scripts/quotes.corpus.json` (fix/fill only — never `public/data/`).

**Interfaces:** Consumes the parsed corpus from Task 1. Produces a corpus where every entry has a unique kebab `id`, a PD-genuine `sourceEdition`, a correct `feast`, a deliberate `season`, a present non-empty `authorTitle`, and a truthful `verified`.

- [ ] **Step: Find missing/blank/colliding ids.** Run:

```bash
cd /Users/biscuit/Fidelis/app && node -e "const q=require('./scripts/quotes.corpus.json').quotes; const seen=new Map(); const bad=[]; q.forEach((x,i)=>{const id=x.id; if(typeof id!=='string'||!id.trim()||!/^[a-z0-9-]+$/.test(id)) bad.push('entry '+i+' (\"'+(x.author||'?')+'\"): bad/blank id ['+id+']'); if(seen.has(id)) bad.push('duplicate id '+id); seen.set(id,i)}); if(bad.length){console.log(bad.join('\n')); process.exitCode=1} else console.log('all ids unique kebab slugs')"
```

Expected on a clean corpus: `all ids unique kebab slugs`. For any flagged entry, edit `scripts/quotes.corpus.json` and mint `author-work-locus` (lowercase, hyphenated, e.g. `augustine-conf-1-1`), making it unique. Re-run until clean. (The validator throws on a blank field or duplicate id, so this must be clean.)

- [ ] **Step: Review PD provenance on every new/changed `sourceEdition`.** Read each entry's `sourceEdition` and confirm it names a genuinely public-domain translation/edition and contains the words `public domain`. The red list guards authorship era, not translation copyright — reject or fix anything resting on a modern in-copyright translation (e.g. a 2010 critical translation of Augustine); prefer a pre-1929 edition and say so. List the editions for a fast eyeball pass:

```bash
cd /Users/biscuit/Fidelis/app && node -e "require('./scripts/quotes.corpus.json').quotes.forEach(q=>console.log(q.id+'  |  '+q.author+'  |  '+q.sourceEdition))" | grep -vi "public domain" || echo "every sourceEdition names 'public domain'"
```

Expected: `every sourceEdition names 'public domain'`. Any line printed is an edition missing the PD provenance words — fix it in the corpus.

- [ ] **Step: Verify each `feast` is the author's real fixed-date feast.** For every sanctoral entry (`feast !== null`), confirm the `"MM-DD"` is the author's actual feast on the app calendar **and** that the `author`'s distinctive tokens will appear in a celebration name on that day (so tier-1 `celebratesAuthor` fires — see `src/lib/quotes.ts:54-67`). If the author has no fixed-date feast, set `feast` to `null` so the entry falls to the seasonal/general tiers. Confirm the format is well-formed:

```bash
cd /Users/biscuit/Fidelis/app && node -e "const q=require('./scripts/quotes.corpus.json').quotes; const bad=q.filter(x=>x.feast!==null&&!/^\d{2}-\d{2}$/.test(x.feast)); console.log(bad.length? 'BAD feast format: '+bad.map(x=>x.id+'='+x.feast).join(', ') : 'all feast values are MM-DD or null')"
```

Expected: `all feast values are MM-DD or null`.

- [ ] **Step: Confirm `authorTitle`, `season`, and truthful `verified`.** Run a single pass that flags blank `authorTitle`, an out-of-set `season`, and prints the verified/draft tally:

```bash
cd /Users/biscuit/Fidelis/app && node -e "const q=require('./scripts/quotes.corpus.json').quotes; const S=new Set(['advent','christmastide','lent','eastertide']); const noTitle=q.filter(x=>typeof x.authorTitle!=='string'||!x.authorTitle.trim()); const badSeason=q.filter(x=>x.season!==null&&!S.has(x.season)); if(noTitle.length) console.log('blank authorTitle:', noTitle.map(x=>x.id).join(', ')); if(badSeason.length) console.log('bad season:', badSeason.map(x=>x.id+'='+x.season).join(', ')); console.log('verified', q.filter(x=>x.verified===true).length, '/ drafts', q.filter(x=>x.verified!==true).length); if(noTitle.length||badSeason.length) process.exitCode=1"
```

Expected: no `blank authorTitle` / `bad season` lines, and a verified/drafts tally. Set `verified: true` **only** for entries whose text you have checked against the named PD edition; leave `false` for drafts — never invent `true`. (The harness counts both so the verification debt stays visible; it does not fail on drafts.)

- [ ] **Step: Commit the cleaned metadata** (only if Task 1 left anything to fix):

```bash
cd /Users/biscuit/Fidelis/app && git add scripts/quotes.corpus.json && git commit -m "quotes: fill/validate ids, feast dates, PD provenance, authorTitle, verified

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2b (OPTIONAL): Tighten the validator to require `authorTitle`

The spec §2/§8 records a build-validator gap: `authorTitle` is required by the `DailyQuote` TS type and present in all 47 shipped entries, but `build-quotes.mjs` `REQUIRED` (and the harness `REQUIRED`) currently enforce only the six fields `id/text/author/work/locus/sourceEdition` — a blank `authorTitle` would slip through both. This task closes that gap. It is **optional and off the critical path** — skip it and Task 2's manual `authorTitle` check still covers the corpus. If you take it, this is the one real red→green TDD cycle in the plan: the harness assertion + the validator throw ARE the test.

**Files:** Modify `scripts/build-quotes.mjs:18` (`REQUIRED`) and `scripts/test-data.ts:824` (the §3-block `REQUIRED`). No `src/` change; no `public/data/` hand-edit.

**Interfaces:** Consumes the cleaned corpus from Task 2 (every entry already carries a non-empty `authorTitle`). Produces a validator + harness that throw/go-red on any blank `authorTitle`, matching the existing six-field behaviour.

- [ ] **Step: Write the failing test — add `authorTitle` to both `REQUIRED` sets.** Edit `scripts/test-data.ts` line 824:

```ts
  const REQUIRED = ["id", "text", "author", "authorTitle", "work", "locus", "sourceEdition"] as const;
```

and edit `scripts/build-quotes.mjs` line 18:

```js
const REQUIRED = ["id", "text", "author", "authorTitle", "work", "locus", "sourceEdition"];
```

- [ ] **Step: Run it, expect FAIL — prove the new requirement bites.** Temporarily blank one entry's `authorTitle` and run the build (it must now throw where before it passed):

```bash
cd /Users/biscuit/Fidelis/app && cp scripts/quotes.corpus.json scripts/quotes.corpus.json.bak && node -e "const fs=require('fs'); const c=require('./scripts/quotes.corpus.json'); c.quotes[0].authorTitle=''; fs.writeFileSync('scripts/quotes.corpus.json', JSON.stringify(c,null,2))" && (npm run quotes && echo "UNEXPECTED: blank authorTitle slipped through" || echo "GOOD: validator now requires authorTitle"); mv scripts/quotes.corpus.json.bak scripts/quotes.corpus.json
```

Expected: `GOOD: validator now requires authorTitle` (the script exits non-zero with `quote <id>: missing field authorTitle`), and the `.bak` restore returns the real corpus.

- [ ] **Step: Run, expect PASS — re-emit from the genuine corpus and go green.** Run:

```bash
cd /Users/biscuit/Fidelis/app && npm run quotes && npm test
```

Expected: the `N quotes (...)` success line, then both harnesses pass — the §3 `every quote satisfies the spec §3.1 schema` check now also guards `authorTitle` (all 47 entries already carry it, so it stays green), exit 0.

- [ ] **Step: Commit the tightening:**

```bash
cd /Users/biscuit/Fidelis/app && git add scripts/build-quotes.mjs scripts/test-data.ts && git commit -m "quotes: require authorTitle in the validator + harness schema (spec §2 gap)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Regenerate `public/data/quotes.json` + re-seal the manifest

`npm run quotes` runs `scripts/build-quotes.mjs`: it re-validates the schema + red list, writes the minified `public/data/quotes.json` (byte-for-byte `JSON.stringify({ quotes: corpus.quotes })`), then re-seals `public/data/manifest.json`. This run **is** the validation test — it throws (non-zero exit) on any missing field, duplicate id, malformed feast, unknown season, or red-listed author.

**Files:** Regenerated (never hand-edited): `public/data/quotes.json`, `public/data/manifest.json`. Read `scripts/build-quotes.mjs` (the validator).

**Interfaces:** Consumes `scripts/quotes.corpus.json`. Produces `public/data/quotes.json` (`{ "quotes": [...] }`, minified) and an updated `public/data/manifest.json` (new SHA-256 per file + root hash).

- [ ] **Step: Run the build (expect PASS on a compliant corpus).** Run:

```bash
cd /Users/biscuit/Fidelis/app && npm run quotes
```

Expected (success): prints `wrote …/public/data/quotes.json: N quotes (V verified, D drafts pending verification per spec §3.4)` followed by the manifest re-seal output, exit 0.

- [ ] **Step: Confirm the red list still bites (negative check — do NOT commit this).** Temporarily append a red-listed author to confirm the guard is live, then revert. Run:

```bash
cd /Users/biscuit/Fidelis/app && cp scripts/quotes.corpus.json scripts/quotes.corpus.json.bak && node -e "const fs=require('fs'); const c=require('./scripts/quotes.corpus.json'); c.quotes.push({id:'redlist-probe',text:'probe',author:'Fulton Sheen',authorTitle:'Archbishop',work:'Probe',locus:'1',sourceEdition:'modern, public domain',feast:null,season:null,tags:[],verified:false}); fs.writeFileSync('scripts/quotes.corpus.json', JSON.stringify(c,null,2))" && (npm run quotes && echo "UNEXPECTED: red list did not throw" || echo "GOOD: red list threw as expected"); mv scripts/quotes.corpus.json.bak scripts/quotes.corpus.json
```

Expected: `GOOD: red list threw as expected` (the script exits non-zero with `quote redlist-probe: author "Fulton Sheen" is on the red list (spec §3.3)`), and the `.bak` restore returns the real corpus. (The validator throws during the validation loop **before** the `writeFile`, so the bad corpus never reaches `quotes.json`.) Re-run `npm run quotes` once more to restore the emitted `quotes.json`/manifest from the genuine corpus:

```bash
cd /Users/biscuit/Fidelis/app && npm run quotes
```

Expected: the real `N quotes (...)` success line again.

- [ ] **Step: Verify the manifest re-walk passes.** Run:

```bash
cd /Users/biscuit/Fidelis/app && npm run verify-data
```

Expected: the manifest verify reports no mismatches (exit 0) — `quotes.json`'s new hash is sealed.

---

## Task 4: Resync the quote into the native widget `calendar.json`

`npm run calendar-widget` re-resolves `quoteOfTheDay()` over the rolling date window and re-emits the `quote: { text, author }` field into `calendar.json` for **both** native shells. This is the step that pushes new quote selections to the home-screen Quote widget. (The VOTD builder is **not** run — quotes do not ride `votd.json`.)

**Files:** Regenerated: `ios/WidgetExtension/calendar.json`, `android/app/src/main/res/raw/calendar.json`. Read `scripts/build-calendar-widget.ts` (it reads `public/data/quotes.json` at L40-42 and writes `quote` at L93).

**Interfaces:** Consumes `public/data/quotes.json` (from Task 3) + the calendar/lectionary engines. Produces the two `calendar.json` files keyed by local ISO date, each day carrying `quote`.

- [ ] **Step: Run the calendar-widget build.** Run:

```bash
cd /Users/biscuit/Fidelis/app && npm run calendar-widget
```

Expected: prints `wrote …/ios/WidgetExtension/calendar.json`, `wrote …/android/app/src/main/res/raw/calendar.json`, then `<N> days (… ): <R> with readings, <Q> with a quote`. `<Q>` should be the full day count (a quote resolves for every day).

- [ ] **Step: Confirm the two widget files are byte-identical and carry quotes.** Run:

```bash
cd /Users/biscuit/Fidelis/app && diff ios/WidgetExtension/calendar.json android/app/src/main/res/raw/calendar.json && echo "calendar.json identical across shells" && node -e "const c=require('./ios/WidgetExtension/calendar.json'); const k=Object.keys(c); const noQuote=k.filter(d=>!c[d].quote); console.log(k.length+' days, '+noQuote.length+' without a quote')"
```

Expected: `calendar.json identical across shells`, then `N days, 0 without a quote`.

---

## Task 5: Full green bar — `npm test` + `npm run build`

The §3 harness block (`scripts/test-data.ts` L809–871) asserts corpus↔emitted byte-equality, ≥40 entries, the §3.1 schema, no red-list author, non-empty seasonal pools, all three resolution tiers (Aug 28 → Augustine; a Lent feria → Lent pool; an OT feria → general), and full-year-2026 determinism. No new assertions are needed to grow the corpus — these already cover it.

**Files:** None modified (verification only).

- [ ] **Step: Run the full test suite.** Run:

```bash
cd /Users/biscuit/Fidelis/app && npm test
```

Expected: both harnesses pass (including the `quotes.json is the emitted corpus`, `quote corpus has at least 40 entries`, `every quote satisfies the spec §3.1 schema`, `no red-list author in the corpus`, `each seasonal pool is non-empty`, the three-tier checks, and the determinism checks), the manifest re-walk passes, eslint clean — `process.exitCode 0`. A red result means a corpus edit broke a rule; fix the corpus and re-run Tasks 3–5, do not edit `public/data/`.

- [ ] **Step: Run the build.** Run:

```bash
cd /Users/biscuit/Fidelis/app && npm run build
```

Expected: `tsc --noEmit` clean + Vite build succeeds (the whole `dist/` regenerates for the native shells), exit 0.

- [ ] **Step: Run the doc-link check** (CI gates on it):

```bash
cd /Users/biscuit/Fidelis/app && npm run check-docs
```

Expected: no dead links reported.

---

## Task 6: Cut release v1.14.0 and commit the pipeline output together

The spec (§5/§8) says: commit the corpus + the regenerated `public/data/quotes.json`, the manifest, and both `calendar.json` files **together**, with the version bump + CHANGELOG entry **if** the corpus grew in a release.

**Files:** Modify `package.json`, `package-lock.json` (via `npm version`), `CHANGELOG.md`, `CLAUDE.md` (ledger line). Commit the Task 3/4 regenerated data.

- [ ] **Step: Bump the version** (updates `package.json` + lockfile, no git tag/commit):

```bash
cd /Users/biscuit/Fidelis/app && npm version 1.14.0 --no-git-tag-version
```

Expected: prints `v1.14.0`; `package.json` and `package-lock.json` now read `1.14.0`.

- [ ] **Step: Add the CHANGELOG entry** above the `## [1.13.3]` section (dated 2026-06-27). Use the corpus's real before→after counts (baseline 47 entries / 47 verified / 34 with a feast — substitute the actual new totals from Task 1's snapshot):

```markdown
## [1.14.0] — 2026-06-27 — the wider chorus: Quote-of-the-Day corpus expansion

Design-spec §3 (Quote of the Day) — the owner expanded `scripts/quotes.corpus.json`;
this release receives it. No engine change: the three-tier selector, the build-time
public-domain red list, and the `(dayOfYear + year) mod count` arithmetic are all unchanged.
Adding entries only enlarges each pool's modulus.

### Changed

- **Quote corpus grows from 47 to N entries** (V verified, F with a sanctoral feast), every
  one carrying its full source locus and a named public-domain translation/edition. The
  §3.3 red list (Sheen, Escrivá, Padre Pio, John Paul II, Benedict XVI/Ratzinger, Pope
  Francis) still refuses any in-copyright author at build time; St. Francis of Assisi,
  de Sales, and Xavier stay green.
- **`public/data/quotes.json` regenerated** via `npm run quotes` and the integrity manifest
  re-sealed; the native Quote widget data (`ios/WidgetExtension/calendar.json` and
  `android/app/src/main/res/raw/calendar.json`) re-emitted via `npm run calendar-widget`.
```

- [ ] **Step: Add a CLAUDE.md ledger line.** In the "Release ledger" list, above the `v1.13.3` line, add:

```markdown
- **v1.14.0 — the wider chorus** — Quote-of-the-Day corpus expansion (§3); owner-authored entries received, validated against the PD red list, `quotes.json` + manifest + native `calendar.json` regenerated. No engine change. → [detail](docs/history/RELEASES.md)
```

- [ ] **Step: Final verify before commit.** Run:

```bash
cd /Users/biscuit/Fidelis/app && npm test && npm run build && npm run check-docs
```

Expected: all three green.

- [ ] **Step: Commit the corpus + all regenerated artifacts + the release record together:**

```bash
cd /Users/biscuit/Fidelis/app && git add scripts/quotes.corpus.json public/data/quotes.json public/data/manifest.json ios/WidgetExtension/calendar.json android/app/src/main/res/raw/calendar.json package.json package-lock.json CHANGELOG.md CLAUDE.md && git commit -m "v1.14.0 — the wider chorus: expand the Quote-of-the-Day corpus (§3)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

- [ ] **Step: Stop and ask the owner before pushing / opening a PR.** The repo commits only when asked; do not push or open a PR without an explicit yes.

---

## Open Questions

- **Take the optional Task 2b this release, or defer it?** The spec lists the `authorTitle` validator/harness tightening as an *optional cleanup* (§2 "Build-validator gap to know" / §8). All 47 shipped entries already carry `authorTitle`, so deferring costs nothing today; taking it forecloses a future blank slipping through. Decide before Task 3.
- **Final corpus counts are unknown until the owner hands the file back.** The CHANGELOG and CLAUDE.md ledger numbers (N entries / V verified / F with a feast) must be filled from Task 1's snapshot, not the 47/47/34 baseline. Confirm the new totals before the Task 6 commit.
- **Add a `docs/history/RELEASES.md` detail section for v1.14.0?** Every other ledger line in CLAUDE.md links to an `#anchor` in that file; this plan's ledger line links to the bare file (`docs/history/RELEASES.md`) to avoid a dead-anchor `check-docs` failure. If the owner wants the ledger style kept exactly, add a short RELEASES.md section and point the anchor at it (then re-run `npm run check-docs`).

## Self-Review

**Spec coverage:** Every step of the spec §5 build sequence and §6 receipt review maps to a task — Task 1 receives the file (§1, §8), Task 2 is the §6 per-entry validation (id / PD provenance / feast / season / authorTitle / verified), Task 2b is the optional §2/§8 `authorTitle` validator+harness tightening (off the critical path; the one real red→green TDD cycle), Task 3 is `npm run quotes` + manifest re-seal (§5.1) with an explicit negative red-list check (§3), Task 4 is `npm run calendar-widget` (§5.2, the quotes-ride-calendar.json trap), Task 5 is `npm test` + `npm run build` + `check-docs` (§5.3/§5.4, §7), and Task 6 is the conditional version bump + grouped commit (§8). The spec §4 selection model and §9 out-of-scope items are honored as constraints (no engine change), not tasks.

**No new test framework:** Per the instructions, `build-quotes.mjs` and the existing `scripts/test-data.ts` §3 block (L809–871) ARE the test — Task 3 treats the validator throw as the failing/passing gate, Task 2b's red→green cycle uses the same validator throw + §3 schema assertion (no fake unit-test runner is introduced), and Task 5 runs the full harness.

**Placeholders:** None. Every step shows the exact command or the exact markdown to add. The CHANGELOG/ledger counts are written with the real baseline (47/47/34) and an explicit "substitute the actual new totals" instruction, because the final N depends on the owner's handoff, which does not exist at planning time.

**Constraint check:** No task hand-edits `public/data/` (Task 3/4 regenerate it via scripts; the manifest re-seals in the same run); the VOTD builder is deliberately NOT run (quotes ride `calendar.json`); the red list is exercised in both directions; no engine/`src/` change (the optional Task 2b touches only `scripts/build-quotes.mjs` + `scripts/test-data.ts`, never `src/`); no Today card added; the two-accent and §13 rules are untouched (data-only). Golden-year snapshots are **not** affected — this changes no calendar/lectionary engine, so `npm run golden` is not run.
