# Commentary Phase 2 — Haydock in its own lane Implementation Plan

[← Docs index](../../INDEX.md)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Make the commentary sheet's two-source separation binding and durable — rename the patristic tab to the lasting label **"Church Fathers"**, move the specific attribution into a per-book credit line, keep the gold dot Haydock-only, and reword the commentary Settings copy to match — all UI-only, no data or manifest change.

**Architecture:** Pure in-place edits to three React/TS surfaces (`src/components/CommentarySheet.tsx`, `src/pages/Reader.tsx` read-only verify, `src/pages/Settings.tsx`) plus the release record. No new logic module, no new pure function, no `public/data/` change, no manifest reseal. The internal `catena`/`catenaTab` identifiers and the `commentaryCatena` settings key stay verbatim (they name the on-disk Gospel corpus and avoid a settings migration); only the user-facing strings move.

**Tech Stack:** React 18 + react-router-dom, TypeScript (strict, `tsc --noEmit`), Vite, ESLint 9 + typescript-eslint, node test harnesses (`tsx scripts/test-*.ts`).

**Proposed version:** `v1.14.0` (the §4.3 Golden-Chain release). This is the spec's **Phase 2**, which "ships with Phase 1 or Phase 3." The companion **Phase 1** plan (chronological ordering) targets the same `v1.14.0`; Task 5 coordinates the shared version bump / CHANGELOG so the two sibling plans do not race. Phase 3 (beyond-the-Gospels corpus) is a later, separate release.

## Global Constraints

Every task's requirements implicitly include these (from CLAUDE.md standing rules + the §4.3 spec):

- **Two accents only:** `--purple` ACTS (tabs, chips — interactive), `--gold` HONORS (attribution labels, the source credit, the gold dot). **No element wears both.** The CCC mark is purple; it is untouched here. No raw hex/rgba outside the `src/styles.css` day/night token blocks (this plan adds **no CSS**).
- **Haydock vs. the Fathers (§4.3 H1):** separate tabs, **never merged, never interleaved.** Haydock is one 19th-century compiler, not a Father.
- **The gold dot stays Haydock-only** (§4.3 §8): it is the verse-number honor mark for "Haydock has a note here." No second mark color (that would breach the two-accent rule).
- **§13 refusal list (binding):** no accounts/sync, no AI summaries/paraphrase/chat, no social, no streaks/badges, no ads/IAP, no notification pressure, no red-letter text. Every comment shown is the source's verbatim public-domain text.
- **§1.5 icon discipline / emoji guard:** no emoji glyphs in any `.tsx` (`scripts/test-data.ts` fails on in-scope emoji). This plan adds no glyphs; the `·` middle dot and `—` em-dash already in the file are plain text, not emoji.
- **Never hand-edit `public/data/`.** This phase writes nothing there; no manifest reseal, no `sw.js` cache bump.
- **Golden snapshots untouched:** `scripts/golden/{2024..2027}.json` pin the calendar + Mass-reading resolution, not commentary. No `npm run golden`.
- **Green bar = `npm run build` (`tsc --noEmit` + vite) AND `npm test` (harnesses + manifest verify + `eslint src` + emoji guard).** Both must pass at every commit. Per the task brief there is **no React component test runner** — UI is verified by `npm run build` passing plus a described manual check of the Reader sheet, **not** a fabricated unit test.

---

## Task 0: Branch and confirm a green baseline

**Files:** none modified (branch + verify only).

- [ ] **Step: Create the feature branch (off `main`).**

```bash
git -C /Users/biscuit/Fidelis/app checkout main
git -C /Users/biscuit/Fidelis/app pull --ff-only
git -C /Users/biscuit/Fidelis/app checkout -b v1.14-haydock-lane
```

(If the companion Phase-1 plan already created a shared `v1.14-golden-chain` branch, check it out instead and skip the `-b` create — Task 5 notes the coordination.)

- [ ] **Step: Confirm the baseline is green before any edit.**

```bash
cd /Users/biscuit/Fidelis/app && npm test && npm run build
```

Expect: both exit 0 (harnesses pass, manifest verifies, eslint clean, tsc + vite build clean). This is the reference point; any later failure is from this plan's edits.

---

## Task 1: Rename the patristic tab "Catena Aurea" → "Church Fathers"

**Why:** The tab is literally labeled **"Catena Aurea,"** which is honest only on the four Gospels. "Church Fathers" is the durable label for a chain that will extend past the Gospels in Phase 3; the specific attribution moves to the per-pane credit line (Task 2).

**Files:** Modify `src/components/CommentarySheet.tsx` (the tab button text at line 118; the catena-pane empty-state at line 149).

**Interfaces:** Consumes existing `Props` and state unchanged (the internal `"catena"` state key and `catenaTab` const stay — they name the on-disk Gospel corpus via `loadCommentary("catena", book)`). Produces no new exports.

- [ ] **Step: Rename the tab button label.** In `src/components/CommentarySheet.tsx`, the second tab button currently reads `Catena Aurea` (line 118). Replace the button's visible text:

```tsx
          <button
            className={`cmt-tab ${tab === "catena" ? "active" : ""}`}
            aria-pressed={tab === "catena"}
            onClick={() => setTab("catena")}
          >
            Church Fathers
          </button>
```

(Only the text node `Catena Aurea` → `Church Fathers` changes. The `tab === "catena"` checks, the `aria-pressed`, and the `setTab("catena")` internal key are untouched.)

- [ ] **Step: Reword the catena-pane empty state.** Replace the empty-state line (line 149):

```tsx
          ) : blocks.length === 0 ? (
            <p className="muted small sans">No Church Fathers commentary on this verse.</p>
```

(The loading line "Gathering the Fathers…" at line 147 is already source-agnostic and on-voice — keep it.)

- [ ] **Step: Verify build + lint green.**

```bash
cd /Users/biscuit/Fidelis/app && npm run build && npm test
```

Expect both exit 0. The emoji guard is unaffected (text-only edit, no glyph).

- [ ] **Step: Manual check of the Reader sheet.** `npm run dev`, open `/#/read/drc/john/3`, tap verse 16's commentary action. With both sources on, the tab bar reads **Haydock** | **Church Fathers** (not "Catena Aurea"); the Church Fathers pane still lists the Fathers. Switch to a verse with no Catena note → the empty state reads "No Church Fathers commentary on this verse."

- [ ] **Step: Commit.**

```bash
git -C /Users/biscuit/Fidelis/app commit -am "commentary: rename the patristic tab 'Catena Aurea' → 'Church Fathers' (the durable label, §4.3 §7)"
```

---

## Task 2: Per-book source credit (Catena/Newman on the Gospels)

**Why:** With the tab now generically "Church Fathers," the *specific* source belongs on the per-pane credit line — so a reader (especially when only one source is present and there is no tab bar) still sees exactly what they are reading. On the Gospels that is the **Catena Aurea, Newman edition** (unchanged wording); the non-Gospel patristic-database credit is a Phase-3 concern (the Church Fathers tab is Gospels-only until then), so its arm is defined but dormant and flagged.

**Files:** Modify `src/components/CommentarySheet.tsx` (add a computed `fathersCredit` in the component body; render it at line 144).

**Interfaces:** Consumes the existing `isGospel: boolean` prop (already passed by `Reader.tsx:600`). Produces a local `const fathersCredit: string`; no prop or export change.

- [ ] **Step: Add the per-book credit value.** In `src/components/CommentarySheet.tsx`, just after the `const haydockTab = ...` line (line 43), add:

```tsx
  // The patristic tab carries the durable label "Church Fathers"; the credit line
  // names the actual source per book. On the four Gospels that source is the Catena
  // Aurea (Newman ed.). The non-Gospel patristic-database credit lands with the
  // Phase-3 corpus (§4.3 §8) — until then the Church Fathers tab is Gospels-only
  // (catenaTab requires isGospel), so only the Gospel arm renders.
  const fathersCredit = isGospel
    ? "The Catena Aurea · the Newman edition"
    : "The Church Fathers";
```

- [ ] **Step: Render the computed credit.** Replace the hard-coded credit (line 144):

```tsx
          <div className="cmt-credit">{fathersCredit}</div>
```

(The `.cmt-credit` class already styles this gold/uppercase — two-accent compliant, honor text. No CSS change.)

- [ ] **Step: Verify build + lint green.**

```bash
cd /Users/biscuit/Fidelis/app && npm run build && npm test
```

Expect both exit 0.

- [ ] **Step: Manual check.** `npm run dev`, open a Gospel verse's Church Fathers pane → the credit line still reads "THE CATENA AUREA · THE NEWMAN EDITION" in gold, unchanged from before, with zero layout shift. (No non-Gospel patristic tab exists yet, so the dormant arm is not reachable — confirmed by reading `catenaTab = isGospel && showCatena`.)

- [ ] **Step: Commit.**

```bash
git -C /Users/biscuit/Fidelis/app commit -am "commentary: per-book source credit on the Church Fathers pane (Catena/Newman on the Gospels; Phase-3 elsewhere)"
```

---

## Task 3: Make the lane separation binding; keep the gold dot Haydock-only

**Why:** §4.3 H1 makes the never-interleave rule binding as the chain grows beyond the Gospels. The code already renders the two sources in mutually-exclusive panes from separate loaders, and the Reader paints the gold dot for Haydock only — this task records the invariant in the component's contract and verifies the dot gating so a future edit cannot quietly merge the lanes or recolor the dot.

**Files:** Modify `src/components/CommentarySheet.tsx` (the component JSDoc, lines 31–36). Read-only verify `src/pages/Reader.tsx` (the dot gating at line 302).

**Interfaces:** No code-behavior change — documentation + a guard. No exports change.

- [ ] **Step: State the never-interleave invariant in the component JSDoc.** Replace the doc block at lines 31–36:

```tsx
/**
 * The §4.2 / §4.3 study surface: two tabs that NEVER interleave — "Haydock" (one
 * 19th-century compiler, the gold-dot source, the whole canon) and "Church Fathers"
 * (the patristic chain: the Catena Aurea on the Gospels, the Phase-3 corpus
 * elsewhere), with per-Father chips and a Doctors-only toggle on the Church Fathers
 * tab. The two render in mutually-exclusive panes (tab === "haydock" | "catena")
 * from separate loaders and are never merged into one list (§4.3 §7, H1). Scripture
 * stays Scripture; this is study, one tap away. Haydock is already cached (the
 * Reader loaded it for the dots); the Catena Gospel file (6–10 MB) loads here, on
 * first open, and only then.
 */
```

- [ ] **Step: Verify the gold dot is Haydock-only (no code change expected).**

```bash
cd /Users/biscuit/Fidelis/app && grep -n "cmt-dot" src/pages/Reader.tsx
```

Expect the dot span guarded by `interactive && wantHaydockDots && haydockHas(v)` (line ~302), where `wantHaydockDots = settings.commentaryEnabled && settings.commentaryHaydock` (line ~66). Confirm `commentaryCatena` / Catena does **not** appear in the `cmt-dot` gating:

```bash
cd /Users/biscuit/Fidelis/app && grep -n "commentaryCatena" src/pages/Reader.tsx
```

Expect `commentaryCatena` on exactly two lines — the `commentaryAvailable` action-bar gate (line ~236) and the `showCatena={settings.commentaryCatena}` prop passed to `CommentarySheet` (line ~603) — and **never** beside `cmt-dot` (line ~302). If a future edit had tied the dot to Catena, that is the bug to fix here; today it is already correct, so this step is a guard, not a change.

- [ ] **Step: Verify build + lint green.**

```bash
cd /Users/biscuit/Fidelis/app && npm run build && npm test
```

Expect both exit 0 (comment-only edit).

- [ ] **Step: Manual check.** `npm run dev`, open a Gospel chapter with Show commentary on. A verse-number gold dot appears only where Haydock has a note (turn Haydock off in Settings → the dots vanish even though the Church Fathers tab still works). Opening the sheet never shows Haydock and Fathers in one merged scroll — they are always separate tabs/panes.

- [ ] **Step: Commit.**

```bash
git -C /Users/biscuit/Fidelis/app commit -am "commentary: record the never-interleave lane invariant; guard the gold dot as Haydock-only (§4.3 H1/§8)"
```

---

## Task 4: Reword the commentary Settings copy

**Why:** The Settings copy still says "Catena Aurea" and — at line 391 — wrongly implies the gold dot marks Catena verses too. Match the durable "Church Fathers" label and make the dot's Haydock-only meaning honest.

**Files:** Modify `src/pages/Settings.tsx` (the "Show commentary" dot description line 391; the "Catena Aurea" setting-label + description + aria-label, lines 424/426/433; the Doctors-only description line 443).

**Interfaces:** No settings-key change — `commentaryEnabled`, `commentaryHaydock`, `commentaryCatena`, `commentaryDoctorsOnly` stay verbatim (no migration). Text-only edits.

- [ ] **Step: Fix the gold-dot description (the dot is Haydock-only).** Replace the full `<p>` block (lines 390–393; the current text reads "Mark verses that carry **Haydock or the Catena Aurea** with a small gold dot, and offer **them** from the verse actions. Off leaves the bare page."):

```tsx
            <p className="catechesis muted small">
              Mark verses that carry a Haydock note with a small gold dot, and offer
              commentary from the verse actions. Off leaves the bare page.
            </p>
```

- [ ] **Step: Rename the "Catena Aurea" setting to "Church Fathers."** Replace the setting-label and its description (lines 424–427):

```tsx
            <div className="setting-label">Church Fathers</div>
            <p className="catechesis muted small">
              The Catena Aurea — St. Thomas Aquinas's chain of the Church Fathers on the
              four Gospels.
            </p>
```

- [ ] **Step: Update the toggle's aria-label.** Replace line 433:

```tsx
            aria-label="Church Fathers commentary"
```

- [ ] **Step: Reword the Doctors-only description.** Replace lines 443–444:

```tsx
              Open the Church Fathers filtered to the Doctors of the Church; you can change
              it within the sheet.
```

- [ ] **Step: Verify build + lint green.**

```bash
cd /Users/biscuit/Fidelis/app && npm run build && npm test
```

Expect both exit 0.

- [ ] **Step: Manual check.** `npm run dev`, open Settings → Commentary. The second toggle reads **Church Fathers** ("The Catena Aurea — St. Thomas Aquinas's chain of the Church Fathers on the four Gospels"); the Show-commentary blurb says the dot marks **Haydock** notes only; the Doctors-only blurb says "the Church Fathers." Toggling Church Fathers still gates the patristic tab on Gospels (the `commentaryCatena` key is unchanged).

- [ ] **Step: Commit.**

```bash
git -C /Users/biscuit/Fidelis/app commit -am "settings: reword commentary copy to 'Church Fathers'; correct the gold dot to Haydock-only"
```

---

## Task 5: Cut the release (coordinated with the Phase-1 plan)

**Why:** Phase 2 ships inside `v1.14.0`. The companion Phase-1 plan targets the same version, so the version bump and the CHANGELOG/ledger entry are **shared** — append Phase-2 lines to whatever Phase 1 already created; create the entry only if it does not yet exist.

**Files:** Modify `package.json` (version); `CHANGELOG.md`; `CLAUDE.md` (release ledger + companion-docs line); `docs/history/RELEASES.md` (detail). **Do NOT edit `docs/superpowers/INDEX.md`** — the parent adds the plan/spec links to avoid a concurrent-edit race.

- [ ] **Step: Bump the version (idempotent).** If `package.json` `version` is not already `1.14.0`, set it:

```bash
cd /Users/biscuit/Fidelis/app && npm version 1.14.0 --no-git-tag-version
```

(If Phase 1 already bumped to `1.14.0`, this is a no-op — `npm version` errors on an identical version; in that case skip it. Confirm with `node -p "require('./package.json').version"`.)

- [ ] **Step: Add / extend the CHANGELOG entry.** In `CHANGELOG.md`, under a `## [1.14.0] — 2026-06-27 — the golden chain` heading (create it newest-first above `## [1.13.3]` if Phase 1 has not), add a **Changed** group with the Phase-2 lines:

```md
### Changed

- **The patristic commentary tab is now "Church Fathers," not "Catena Aurea"** (spec §4.3,
  Phase 2). The durable label holds as the chain extends past the Gospels; the specific
  source moves to a per-pane credit line — "The Catena Aurea · the Newman edition" on the
  four Gospels. Haydock and the Church Fathers remain two tabs that never interleave.
- **The gold verse dot is now stated and shown as Haydock-only.** Settings copy that
  implied the dot also marked Catena verses is corrected; the dot is the honor mark for a
  Haydock note, and the Church Fathers source toggle (the unchanged `commentaryCatena` key)
  gates the patristic tab. No data, manifest, or service-worker change.
```

- [ ] **Step: Add the CLAUDE.md ledger line + companion-docs clause.** In `CLAUDE.md`, add a ledger bullet under "Release ledger" (mirroring the existing per-release lines). Create it only if Phase 1 has not:

```md
- **v1.14.0 — the golden chain** — the §4.3 commentary pass: the Catena chain renders
  earliest-Father-first (Phase 1); the patristic tab is renamed "Church Fathers" with a
  per-book source credit and a binding never-interleave Haydock lane, the gold dot stated
  Haydock-only (Phase 2). UI-only; no data/manifest/golden change. → [detail](docs/history/RELEASES.md#the-golden-chain--commentary-43-v1140)
```

Then, in the CLAUDE.md intro "companion documents" run-on sentence (the paragraph that lists each release's design contribution), append a clause before the closing parenthesis — coordinated with Phase 1 so the single clause covers both phases:

```md
; and the §4.3 commentary pass — the Catena chain ordered earliest-Father-first and the patristic tab renamed "Church Fathers" with a Haydock-only gold dot — in v1.14.0
```

(If Phase 1 already added both the ledger bullet and the clause, this step is a no-op; if Phase 1 added only the chronological half, extend its wording rather than duplicating the bullet.)

- [ ] **Step: Add the RELEASES.md detail section.** In `docs/history/RELEASES.md`, if Phase 1 has not already added it, insert (newest-first, just under the `<!-- BEGIN extracted narrative (verbatim) -->` marker so it sits above `## Identity release …`, matching the existing `## Title — … (vX.Y.Z)` heading style) a section whose heading is **exactly** the line below — the `slug()` in `scripts/check-doc-links.mjs` lowercases, strips all non-`[\w\s-]`, and turns each space into a hyphen, so this heading yields the anchor `the-golden-chain--commentary-43-v1140` that the CLAUDE.md ledger links to:

```md
## The golden chain — commentary §4.3 (v1.14.0)

The §4.3 commentary pass, shipped in two phases inside one release.

**Phase 1 — the chain, in order.** The Catena Aurea now renders earliest-Father-first: a
hand-curated death/floruit `year` (+ optional `circa?`) on every Father in `FATHERS[]`, a
pure `sortChronological(blocks)` over `yearOf(id)`/`circaOf(id)` in `src/lib/commentary.ts`,
applied **after** `groupCatena` so an "It goes on" continuation is never torn from its Father.
The chip row follows the same order; an optional "c. NNN" date sits inside the existing gold
`.cmt-attr` label (no new accent). Gloss and named-source blocks fall after the dated Fathers;
undated authors sort to the tail, never to year 0. No data, manifest, golden, or
service-worker change.

**Phase 2 — the Haydock lane.** The patristic tab is renamed from "Catena Aurea" to the
durable **"Church Fathers"**, and the specific source moves to the per-pane credit line — "The
Catena Aurea · the Newman edition" on the four Gospels (the Phase-3 corpus elsewhere). Haydock
and the Church Fathers stay two tabs that **never interleave** — the invariant is now stated in
the `CommentarySheet` contract — and the gold verse dot is stated and shown as **Haydock-only**;
the Settings copy that implied it also marked Catena verses is corrected. The `commentaryCatena`
settings key is kept verbatim (no migration), read now as the Church Fathers source toggle.
UI/text-only; no data, manifest, golden, or service-worker change.
```

If Phase 1 already created this section, append **only** the Phase 2 paragraph above (do not duplicate the heading or the Phase 1 paragraph). Then confirm the CLAUDE.md anchor link resolves:

```bash
cd /Users/biscuit/Fidelis/app && npm run check-docs
```

Expect exit 0 (no dead link).

- [ ] **Step: Final verify — full green bar.**

```bash
cd /Users/biscuit/Fidelis/app && npm test && npm run build && npm run check-docs
```

Expect all exit 0. Confirm `git status` shows **no** change under `public/data/` and **no** golden-snapshot change (this phase touches neither).

- [ ] **Step: Commit.**

```bash
git -C /Users/biscuit/Fidelis/app commit -am "v1.14.0 'the golden chain' (Phase 2): Church Fathers tab, per-book credit, Haydock-only dot"
```

- [ ] **Step: Stop and ask the owner before pushing / opening a PR.** Per the project's standing practice, do not push or open a PR until the owner confirms. Note in the PR body (when asked) that golden snapshots, `public/data/`, and the manifest are untouched, so no re-bless and no `DATA_CACHE`/`sw.js` bump are needed.

---

## Self-Review

**Spec coverage (§4.3 Phase 2):** §7 tab model → Task 1 (rename to "Church Fathers") + Task 2 (per-book credit naming the Catena/Newman on the Gospels). §8 "what does not change" → Task 3 (gold dot Haydock-only, binding never-interleave) + Task 4 (settings keys kept verbatim, sub-label reworded). H1 never-merge → Task 3 invariant. Every Phase-2 file in the spec's §16 table is touched: `CommentarySheet.tsx` (Tasks 1–3), `Settings.tsx` (Task 4); the release record (Task 5). Phase 1 and Phase 3 are explicitly out of this plan.

**Placeholders:** None. Every edit shows the exact old-string context and complete new code. The one forward-looking value — the non-Gospel `fathersCredit` arm — is a defined, dormant string (the tab is Gospels-only until Phase 3), documented in-code and raised as an open question rather than left as "TBD."

**Type consistency:** No type or signature changes. `fathersCredit` is a local `string` derived from the existing `isGospel: boolean` prop. The `"haydock" | "catena"` state union, the `catenaTab` const, and all `commentary*` settings keys are unchanged, so no migration and no downstream type churn.

**Constraint check:** No CSS added (existing `.cmt-credit` gold class reused) → two-accent rule held (purple tabs/chips, gold credit/dot; nothing wears both). No `public/data/` edit, no manifest reseal, no `sw.js` bump, no golden re-bless. No emoji glyph added (`·`/`—` are plain text). No Today-card added. Verification is `npm run build` + `npm test` (eslint/emoji guard) + manual Reader-sheet check — no fabricated component unit test.
