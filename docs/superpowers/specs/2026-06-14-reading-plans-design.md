# Design Spec — Reading Plans, the Catena Way (v1.2 B3)

**Release label:** `v1.2 B3: reading plans, the Catena way`
**Version bump:** `package.json` 1.5.0 → **1.6.0**
**Branch:** `v1.2-daily-soul`
**Spec source:** Feature Design Spec §7, bound by §13.
**Date:** 2026-06-14

---

## 1. Purpose & binding text (§7, verbatim)

> ## 7. READING PLANS, THE CATENA WAY
> Catena's plan creator has the right shape: the user picks books, the app does citation
> arithmetic, no copyrighted plan content exists anywhere. Adopt it.
> - **Model:** `{ id, name, chapters: ["genesis/1", ...], perDay, startedAt, completedThrough }`
>   in localStorage. A plan is a list of chapter references and a divisor. Nothing more.
> - **Creator:** pick books (the existing grouped book list with checkboxes), pick a pace
>   (chapters per day, or a target end date which computes the pace), name it, start. One screen.
> - **Presets, citation-only:** The Four Gospels in 90 Days; The Deuterocanon in 30 Days …;
>   The Psalter in a Month (Vulgate numbering, naturally); The New Testament in a Year; The
>   Whole Canon in a Year (about 1,330 chapters in the 73-book canon, so roughly four chapters
>   a day, weighted so Psalm 118 does not ruin anyone's Tuesday).
> - **Surface:** one line in Continue Reading, plus a checkmark action at the chapter's end in
>   the Reader ("Mark today's portion read"). Plans live under Read for management. No reminders
>   beyond the single optional daily notification.

### Acceptance criteria (binding)
1. Preset **arithmetic is harness-tested**: canon chapter counts from the **real data**, pace
   math, completion advance, and the weighted Whole-Canon order.
2. The Today page still has **exactly five cards**.
3. `npm test` and `npm run build` green.
4. §13: **no reminders, no streaks**, no progress theater.

---

## 2. The model

```ts
export interface ReadingPlan {
  id: string;
  name: string;
  chapters: string[];       // ["genesis/1", ...] ordered reading sequence
  perDay: number;           // the divisor — chapters per day
  startedAt: number;        // Date.now()
  completedThrough: number; // index: chapters[0..completedThrough-1] are read
}
```

`completedThrough` is an **index**, never a date — progress is "which portion you're on,"
so there is no streak or calendar state to keep (§13).

---

## 3. The pure core — `src/lib/plans.ts`

No `Date.now()`/storage inside; all real counts come from `canon.ts` (`getBook().chapters`,
`.verses`), which is built from the bundled corpus (`src/generated/bookMeta.json`).

```ts
export function chaptersForBooks(slugs: string[]): string[]      // canonical-order "slug/ch"
export function todayPortion(plan: ReadingPlan): string[]        // slice(done, done+perDay)
export function markPortionRead(plan: ReadingPlan): ReadingPlan  // done = min(+perDay, len)
export function planDay(plan: ReadingPlan): number               // floor(done/perDay)+1
export function planTotalDays(plan: ReadingPlan): number         // ceil(len/perDay)
export function isComplete(plan: ReadingPlan): boolean           // done >= len
export function paceForDays(total: number, days: number): number // max(1, ceil(total/days))
export function targetDateToPerDay(total: number, startMs: number, targetMs: number): number
export function formatPortion(portion: string[], translation: string): string
export function weightedCanon(): string[]                        // the Whole-Canon order
export const PRESETS: PlanPreset[]                               // the five, below
```

`formatPortion` collapses runs of the same book into ranges: `["genesis/3","genesis/4"]`
→ "Genesis 3–4"; mixed → "Genesis 3–4 · Psalm 7" (book name per the current translation).

A `PlanPreset` is `{ id, name, build(): { chapters: string[]; perDay: number } }` — pure
data; the storage layer adds `id`/`startedAt`/`completedThrough` at creation.

---

## 4. The five presets + the weighting

| id | name (exact) | books | perDay |
|---|---|---|---|
| `gospels` | The Four Gospels in 90 Days | matthew, mark, luke, john (89) | `paceForDays(89, 90)` = 1 |
| `deuterocanon` | The Deuterocanon in 30 Days | books with `deutero` | `paceForDays(Σ, 30)` |
| `psalter` | The Psalter in a Month | psalms (150) | `paceForDays(150, 30)` = 5 |
| `nt` | The New Testament in a Year | NT-group books (260) | `paceForDays(260, 365)` = 1 |
| `canon` | The Whole Canon in a Year | all 73 (~1330) via `weightedCanon()` | 4 |

**`weightedCanon()` — "Spread the Psalter" (deterministic, pure):**
1. `rest` = canonical-order `"slug/ch"` of all 73 canon books **except** Psalms (~1,180).
2. `pss` = `psalms/1 … psalms/150`.
3. **Even interleave:** merge `pss` uniformly into `rest` by a Bresenham-style ratio
   (≈150 : 1,180), so a psalm appears roughly every ~8 chapters — no psalm clustering.
4. **De-cluster long chapters:** with the sequence chunked into days of `perDay = 4`, run a
   deterministic pass that guarantees **no day holds two "long" chapters** (`verses ≥ LONG_VERSES`,
   a fixed threshold), moving an excess long chapter to the nearest later day that has none and
   a short slot to swap. So Psalm 118 (176 v) — and every other long chapter — gets a near-solo
   day padded with short chapters.

Output is a **permutation** of the full 73-book canon chapter list (no loss, no duplication).
The 6 appendix books are excluded from the canon preset (they are not part of the 73).

---

## 5. Storage — `src/lib/storage.ts`

`fidelis:plans` holds `ReadingPlan[]` (the bookmarks-array pattern):
```ts
export function getPlans(): ReadingPlan[]
export function addPlan(p: Omit<ReadingPlan, "id" | "startedAt" | "completedThrough">): ReadingPlan
export function updatePlan(p: ReadingPlan): void
export function deletePlan(id: string): void
export function activePlan(): ReadingPlan | null  // most-recently-started incomplete plan
```
`addPlan` assigns `id` (`crypto.randomUUID()`), `startedAt` (`Date.now()`), `completedThrough: 0`.
Surfaces read on mount (the `getLastRead` pattern) — no new context; a mark-read in the Reader
is reflected when Home/Plans re-mount.

---

## 6. The three surfaces

- **Continue Reading (Home card 5):** when `activePlan()` exists, **one line** at the top of the
  card — a `Link` reading "Today's reading · {formatPortion(todayPortion)} · Day {planDay} of
  {planTotalDays}" to `/read/{translation}/{firstChapterOfPortion}`. The existing "Continue"
  content stays below. Card 5 remains one card; Today stays five cards.
- **Reader, at chapter end:** when the current `"{bookSlug}/{chapter}"` ∈ `todayPortion(activePlan())`,
  render a **"Mark today's portion read"** button just below the existing `.chapter-nav`. On click:
  `updatePlan(markPortionRead(plan))`, the button confirms ("Marked ✓") and retires for that
  portion. No date gate (reading ahead is allowed); no streak.
- **Under Read:** a `Reading plans →` link atop the `/read` book page →
  - **`/plans`** (`Plans.tsx`): the user's plans — each shows name · "Day d of total" · a Resume
    link (to today's portion) · Delete — plus a `New plan` button.
  - **`/plans/new`** (`PlanCreator.tsx`): one screen — the five presets as one-tap buttons, then a
    custom builder (grouped book checkboxes reusing `OT_GROUPS`/`NT_GROUPS`/`BOOKS.filter(group)`,
    a pace control = chapters/day number **or** target end date, a name field, **Start**). On start:
    `addPlan({ name, chapters: chaptersForBooks(selected), perDay })` → navigate to `/plans`.
  - Routes added in `App.tsx`: `/plans` and `/plans/new`. **No new top-level tab** (reached from Read).

---

## 7. Testing — `scripts/test-data.ts`

Pure, deterministic, against the real canon counts (the `check()` harness; no DOM runner):
- **Preset totals from real data:** each preset's `chapters.length` equals the summed
  `getBook(slug).chapters`; Gospels = 89, Psalter = 150, NT = 260, Deuterocanon = Σ(deutero),
  Whole Canon = Σ(73). And those `getBook` counts equal `bookMeta.json` (guards "from real data").
- **Pace math:** preset `perDay` values and `paceForDays`/`targetDateToPerDay`.
- **Completion advance:** `todayPortion` slices correctly; `markPortionRead` advances by `perDay`
  and clamps; walking to the end sets `isComplete`; `planDay`/`planTotalDays` correct.
- **Weighted canon:** `weightedCanon()` is a permutation of the full canon chapter list
  (same multiset, length ≈ 1330); chunked by 4 — **no day has two long chapters**; the day
  containing `"psalms/118"` has a **bounded verse total**; psalms are spread (bounded max gap
  between consecutive psalms — proves no clustering).
- **`formatPortion`** range-collapsing.

Golden snapshots untouched (no calendar-engine change).

---

## 8. Standing rules honored
- **§13:** no reminders, no streaks, no progress theater; "Day N" is a portion index.
- **Five cards:** the plan line lives inside card 5; Today is otherwise untouched.
- **Two-accent:** plan links/buttons are purple (acts); no gold misuse.
- **No new tab:** `/plans` is reached from Read, not the TabBar.
- **Standing rule 1:** all plan content is computed citation arithmetic; nothing under `public/data`.

---

## 9. Out of scope (YAGNI)
- No reminders/notifications (the optional daily notification stays deferred, off, per §6/§13).
- No history graph, streak, badge, or completion celebration.
- No cross-device sync; plans are local (§13 — no accounts).
- No per-verse plans (citation = whole chapters only).
- No editing a plan's books after creation (delete + recreate); no reordering UI.

---

## 10. Open confirmations (resolved)
- Whole-Canon order → **Spread the Psalter** (interleave + de-cluster). [user-approved]
- Plan management → **a `/plans` route** reached from Read. [user-approved]
- Version **1.6.0** under `v1.2 B3`. [pending final read]
