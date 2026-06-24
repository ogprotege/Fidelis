# Reading Plans Implementation Plan

[← Docs index](../../INDEX.md)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Spec §7 — reading plans as pure citation arithmetic: a `{chapters, perDay}` model, five citation-only presets (incl. a weighted Whole-Canon-in-a-Year), a one-screen creator, and three quiet surfaces (Continue Reading line, "Mark today's portion read" at chapter end, management under Read).

**Architecture:** A pure module (`plans.ts`) holds all arithmetic and the preset/weighting logic, using the real per-book chapter/verse counts already in `canon.ts`. Storage persists `ReadingPlan[]`. Two new pages (`/plans`, `/plans/new`) plus three small surface edits. No reactivity beyond on-mount reads (the `getLastRead` pattern). No streaks, no reminders (§13).

**Tech Stack:** React + TypeScript + Vite; `tsx`/Node `check()` harness; CSS token system.

**Commit policy:** Commit only when the user asks. The per-task commit steps fold into one final commit on the user's go.

**Harness gotchas:** day boundaries are portion indices, not dates (no streaks). The weighted canon must be a permutation of the 73-book canon. No `✠`; `✓` is allowed. Golden snapshots untouched.

---

## File structure

| File | Responsibility | New? |
|---|---|---|
| `src/lib/plans.ts` | Pure: `ReadingPlan`, arithmetic, `PRESETS`, `weightedCanon`. | Create |
| `src/lib/storage.ts` | `getPlans/addPlan/updatePlan/deletePlan/activePlan` (`fidelis:plans`). | Modify |
| `src/pages/Plans.tsx` | `/plans` — list, resume, delete, new. | Create |
| `src/pages/PlanCreator.tsx` | `/plans/new` — presets + custom builder. | Create |
| `src/App.tsx` | Routes `/plans`, `/plans/new`. | Modify |
| `src/pages/Home.tsx` | Active-plan line in Continue Reading. | Modify |
| `src/pages/Reader.tsx` | "Mark today's portion read" at chapter end. | Modify |
| `src/pages/BookList.tsx` | "Reading plans →" link. | Modify |
| `src/styles.css` | Plan styles. | Modify |
| `scripts/test-data.ts` | Section 13 preset/arithmetic/weighting assertions. | Modify |
| `CHANGELOG.md`, `package.json` (+lock) | 1.6.0. | Modify |

---

## Task 1: The pure module `plans.ts` — TDD

**Files:**
- Create: `src/lib/plans.ts`
- Test: `scripts/test-data.ts` (section added in this task)

- [ ] **Step 1: Create `src/lib/plans.ts`:**

```ts
import { BOOKS, getBook, bookDisplayName, NT_GROUPS } from "./canon";

/** A reading plan: a list of chapter references and a divisor (spec §7). */
export interface ReadingPlan {
  id: string;
  name: string;
  chapters: string[];       // ["genesis/1", ...] ordered
  perDay: number;
  startedAt: number;
  completedThrough: number; // index into chapters
}

export interface PlanPreset {
  id: string;
  name: string;
  build: () => { chapters: string[]; perDay: number };
}

/** A chapter is "long" (a Tuesday-ruiner) at or above this verse count. */
export const LONG_VERSES = 80;
const CANON_PER_DAY = 4;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Chapters of the given books, flattened in canonical order. */
export function chaptersForBooks(slugs: string[]): string[] {
  const set = new Set(slugs);
  const out: string[] = [];
  for (const b of BOOKS) {
    if (!set.has(b.slug)) continue;
    for (let c = 1; c <= b.chapters; c++) out.push(`${b.slug}/${c}`);
  }
  return out;
}

/** Verse count of a "slug/ch" reference from the real canon metadata. */
export function versesOf(ref: string): number {
  const [slug, c] = ref.split("/");
  return getBook(slug)?.verses[Number(c) - 1] ?? 0;
}

export function paceForDays(total: number, days: number): number {
  return Math.max(1, Math.ceil(total / Math.max(1, days)));
}

export function targetDateToPerDay(total: number, startMs: number, targetMs: number): number {
  const days = Math.max(1, Math.ceil((targetMs - startMs) / DAY_MS));
  return paceForDays(total, days);
}

export function todayPortion(plan: ReadingPlan): string[] {
  return plan.chapters.slice(plan.completedThrough, plan.completedThrough + plan.perDay);
}

export function markPortionRead(plan: ReadingPlan): ReadingPlan {
  return {
    ...plan,
    completedThrough: Math.min(plan.completedThrough + plan.perDay, plan.chapters.length)
  };
}

export function planDay(plan: ReadingPlan): number {
  return Math.floor(plan.completedThrough / plan.perDay) + 1;
}

export function planTotalDays(plan: ReadingPlan): number {
  return Math.ceil(plan.chapters.length / plan.perDay);
}

export function isComplete(plan: ReadingPlan): boolean {
  return plan.completedThrough >= plan.chapters.length;
}

/** "Genesis 3–4 · Psalm 7" — consecutive same-book chapters collapse to a range. */
export function formatPortion(portion: string[], translation: string): string {
  const parts: string[] = [];
  let i = 0;
  while (i < portion.length) {
    const [slug, chStr] = portion[i].split("/");
    const startCh = Number(chStr);
    let j = i;
    while (
      j + 1 < portion.length &&
      portion[j + 1].split("/")[0] === slug &&
      Number(portion[j + 1].split("/")[1]) === Number(portion[j].split("/")[1]) + 1
    ) {
      j++;
    }
    const book = getBook(slug);
    const name = book ? bookDisplayName(book, translation) : slug;
    const endCh = Number(portion[j].split("/")[1]);
    parts.push(endCh > startCh ? `${name} ${startCh}–${endCh}` : `${name} ${startCh}`);
    i = j + 1;
  }
  return parts.join(" · ");
}

/** Distribute b uniformly through a (Bresenham), keeping each stream's order. */
function interleaveEven(a: string[], b: string[]): string[] {
  const total = a.length + b.length;
  const out: string[] = [];
  let ai = 0, bi = 0, acc = 0;
  for (let i = 0; i < total; i++) {
    acc += b.length;
    if (acc >= total && bi < b.length) {
      acc -= total;
      out.push(b[bi++]);
    } else if (ai < a.length) {
      out.push(a[ai++]);
    } else if (bi < b.length) {
      out.push(b[bi++]);
    }
  }
  return out;
}

/** Ensure no day (chunk of perDay) holds two long chapters; move the extra to a
 *  long-free day, swapping in a short chapter. Deterministic. */
function declusterLong(seq: string[], perDay: number): string[] {
  const out = seq.slice();
  const long = (i: number) => versesOf(out[i]) >= LONG_VERSES;
  const nDays = Math.ceil(out.length / perDay);
  const end = (d: number) => Math.min((d + 1) * perDay, out.length);
  const dayLongCount = (d: number) => {
    let n = 0;
    for (let k = d * perDay; k < end(d); k++) if (long(k)) n++;
    return n;
  };
  for (let d = 0; d < nDays; d++) {
    while (dayLongCount(d) > 1) {
      let from = -1;
      for (let k = d * perDay; k < end(d); k++) if (long(k)) from = k; // the last long
      let to = -1;
      for (let e = 0; e < nDays && to < 0; e++) {
        if (e === d || dayLongCount(e) > 0) continue;
        for (let k = e * perDay; k < end(e); k++) if (!long(k)) { to = k; break; }
      }
      if (to < 0) break;
      const tmp = out[from]; out[from] = out[to]; out[to] = tmp;
    }
  }
  return out;
}

/** The Whole Canon, weighted: psalms spread through the year, long chapters never
 *  paired, so Psalm 118 gets a near-solo day. A permutation of the 73-book canon. */
export function weightedCanon(): string[] {
  const rest: string[] = [];
  const pss: string[] = [];
  for (const b of BOOKS) {
    if (b.appendix) continue;
    for (let c = 1; c <= b.chapters; c++) {
      const ref = `${b.slug}/${c}`;
      (b.slug === "psalms" ? pss : rest).push(ref);
    }
  }
  return declusterLong(interleaveEven(rest, pss), CANON_PER_DAY);
}

const GOSPEL_SLUGS = ["matthew", "mark", "luke", "john"];

export const PRESETS: PlanPreset[] = [
  {
    id: "gospels",
    name: "The Four Gospels in 90 Days",
    build: () => {
      const chapters = chaptersForBooks(GOSPEL_SLUGS);
      return { chapters, perDay: paceForDays(chapters.length, 90) };
    }
  },
  {
    id: "deuterocanon",
    name: "The Deuterocanon in 30 Days",
    build: () => {
      const chapters = chaptersForBooks(BOOKS.filter((b) => b.deutero).map((b) => b.slug));
      return { chapters, perDay: paceForDays(chapters.length, 30) };
    }
  },
  {
    id: "psalter",
    name: "The Psalter in a Month",
    build: () => {
      const chapters = chaptersForBooks(["psalms"]);
      return { chapters, perDay: paceForDays(chapters.length, 30) };
    }
  },
  {
    id: "nt",
    name: "The New Testament in a Year",
    build: () => {
      const chapters = chaptersForBooks(
        BOOKS.filter((b) => NT_GROUPS.includes(b.group)).map((b) => b.slug)
      );
      return { chapters, perDay: paceForDays(chapters.length, 365) };
    }
  },
  {
    id: "canon",
    name: "The Whole Canon in a Year",
    build: () => ({ chapters: weightedCanon(), perDay: CANON_PER_DAY })
  }
];
```

- [ ] **Step 2: Add the harness section.** In `scripts/test-data.ts`, add to the top import block:

```ts
import {
  PRESETS,
  weightedCanon,
  chaptersForBooks,
  todayPortion,
  markPortionRead,
  planDay,
  planTotalDays,
  isComplete,
  paceForDays,
  targetDateToPerDay,
  formatPortion,
  versesOf,
  LONG_VERSES,
  ReadingPlan
} from "../src/lib/plans";
import { BOOKS, getBook } from "../src/lib/canon";
```

Append before the final summary `console.log`:

```ts
// 13. Reading plans (v1.2 B3, spec §7). Pure citation arithmetic over the real
//     canon counts: preset totals, pace, completion advance, and the weighted
//     Whole-Canon order (no two long chapters in a day; psalms spread).
console.log("");
{
  // Canon counts come from the real bundled data (parity with the corpus).
  for (const [slug, t] of [["genesis", "drc"], ["psalms", "drc"], ["matthew", "drc"], ["revelation", "drc"]] as const) {
    const real = JSON.parse(readFileSync(join(ROOT, `public/data/${t}/${slug}.json`), "utf8")).chapters.length;
    check(`canon chapter count for ${slug} matches the real data`, getBook(slug)!.chapters === real, `${getBook(slug)!.chapters} vs ${real}`);
  }
  check("psalms 118 is 176 verses (Vulgate numbering)", getBook("psalms")!.verses[117] === 176, `${getBook("psalms")!.verses[117]}`);

  // Preset totals equal the summed real chapter counts.
  const sumChapters = (slugs: string[]) => slugs.reduce((n, s) => n + (getBook(s)!.chapters), 0);
  const byId = Object.fromEntries(PRESETS.map((p) => [p.id, p.build()]));
  check("Gospels preset = 89 chapters", byId.gospels.chapters.length === 89, `${byId.gospels.chapters.length}`);
  check("Psalter preset = 150 chapters", byId.psalter.chapters.length === 150, `${byId.psalter.chapters.length}`);
  check("Gospels preset pace = 1/day (89 in 90 days)", byId.gospels.perDay === 1, `${byId.gospels.perDay}`);
  check("Psalter preset pace = 5/day (150 in 30 days)", byId.psalter.perDay === 5, `${byId.psalter.perDay}`);
  check("NT preset total matches summed NT chapter counts",
    byId.nt.chapters.length === sumChapters(BOOKS.filter((b) => ["Gospels","Acts of the Apostles","Pauline Epistles","Catholic Epistles","Apocalypse"].includes(b.group)).map((b) => b.slug)),
    `${byId.nt.chapters.length}`);
  check("Deuterocanon preset total matches summed deutero chapter counts",
    byId.deuterocanon.chapters.length === sumChapters(BOOKS.filter((b) => b.deutero).map((b) => b.slug)),
    `${byId.deuterocanon.chapters.length}`);

  // Whole Canon: permutation of the full 73-book canon; weighting invariants.
  const canonRefs = chaptersForBooks(BOOKS.filter((b) => !b.appendix).map((b) => b.slug));
  const wc = byId.canon.chapters;
  check("Whole Canon length = full canon chapter count", wc.length === canonRefs.length, `${wc.length} vs ${canonRefs.length}`);
  check("Whole Canon is a permutation of the canon (no loss/dup)",
    JSON.stringify([...wc].sort()) === JSON.stringify([...canonRefs].sort()));
  // No day (chunk of 4) holds two long chapters.
  let twoLongDays = 0;
  let ps118DayVerses = 0;
  for (let i = 0; i < wc.length; i += byId.canon.perDay) {
    const day = wc.slice(i, i + byId.canon.perDay);
    if (day.filter((r) => versesOf(r) >= LONG_VERSES).length > 1) twoLongDays++;
    if (day.includes("psalms/118")) ps118DayVerses = day.reduce((n, r) => n + versesOf(r), 0);
  }
  check("Whole Canon: no day pairs two long chapters", twoLongDays === 0, `${twoLongDays} bad days`);
  check("Whole Canon: Psalm 118's day is near-solo (one long chapter)", ps118DayVerses > 0 && ps118DayVerses < 176 + 3 * LONG_VERSES, `${ps118DayVerses} verses`);
  // Psalms are spread, not clustered: max run of consecutive non-psalm chapters bounded.
  let gap = 0, maxGap = 0;
  for (const r of wc) { if (r.startsWith("psalms/")) gap = 0; else { gap++; maxGap = Math.max(maxGap, gap); } }
  check("Whole Canon: psalms are spread through the year (bounded gaps)", maxGap <= 20, `max gap ${maxGap}`);

  // Completion advance.
  const plan: ReadingPlan = { id: "t", name: "t", chapters: ["a/1","a/2","a/3","a/4","a/5"], perDay: 2, startedAt: 0, completedThrough: 0 };
  check("todayPortion is the next perDay chapters", JSON.stringify(todayPortion(plan)) === JSON.stringify(["a/1","a/2"]));
  const p1 = markPortionRead(plan);
  check("markPortionRead advances by perDay", p1.completedThrough === 2);
  check("planDay reflects the portion index", planDay(p1) === 2 && planDay(plan) === 1);
  check("planTotalDays = ceil(len/perDay)", planTotalDays(plan) === 3);
  const p2 = markPortionRead(markPortionRead(p1)); // 2 -> 4 -> 5 (clamped)
  check("markPortionRead clamps at the end and completes", p2.completedThrough === 5 && isComplete(p2));
  check("todayPortion is empty when complete", todayPortion(p2).length === 0);

  // Pace helpers.
  check("paceForDays(150,30)=5 and paceForDays(89,90)=1", paceForDays(150, 30) === 5 && paceForDays(89, 90) === 1);
  check("targetDateToPerDay spans the date range", targetDateToPerDay(60, 0, 30 * 24 * 60 * 60 * 1000) === 2);

  // formatPortion range collapsing.
  check("formatPortion collapses a same-book run", formatPortion(["genesis/3","genesis/4"], "drc") === "Genesis 3–4");
  check("formatPortion joins mixed books with a middot", formatPortion(["genesis/3","psalms/7"], "drc") === "Genesis 3 · Psalms 7");
}
```

- [ ] **Step 3: Run.** `npm test` → all section-13 checks PASS. (If "no two long" or "near-solo" fails, the threshold/decluster needs a tweak — adjust `LONG_VERSES` or the search, re-run.)

---

## Task 2: Storage — `ReadingPlan[]` persistence

**Files:**
- Modify: `src/lib/storage.ts`

- [ ] **Step 1:** Add the type-only import near the other imports (top of file):

```ts
import type { ReadingPlan } from "./plans";
```

- [ ] **Step 2:** Add the CRUD near `saveLastRead`:

```ts
export function getPlans(): ReadingPlan[] {
  return read<ReadingPlan[]>("plans", []);
}

function planId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
}

export function addPlan(p: Omit<ReadingPlan, "id" | "startedAt" | "completedThrough">): ReadingPlan {
  const plan: ReadingPlan = { ...p, id: planId(), startedAt: Date.now(), completedThrough: 0 };
  const list = getPlans();
  list.unshift(plan);
  write("plans", list);
  return plan;
}

export function updatePlan(plan: ReadingPlan): void {
  const list = getPlans();
  const i = list.findIndex((x) => x.id === plan.id);
  if (i >= 0) {
    list[i] = plan;
    write("plans", list);
  }
}

export function deletePlan(id: string): void {
  write("plans", getPlans().filter((x) => x.id !== id));
}

/** The plan surfaced everywhere: the most-recently-started incomplete one. */
export function activePlan(): ReadingPlan | null {
  const open = getPlans().filter((p) => p.completedThrough < p.chapters.length);
  if (!open.length) return null;
  return open.reduce((a, b) => (b.startedAt > a.startedAt ? b : a));
}
```

- [ ] **Step 3:** `npm run build` → PASS.

---

## Task 3: The `/plans` and `/plans/new` pages

**Files:**
- Create: `src/pages/Plans.tsx`, `src/pages/PlanCreator.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Create `src/pages/Plans.tsx`:**

```tsx
import { useState } from "react";
import { Link } from "react-router-dom";
import { getPlans, deletePlan } from "../lib/storage";
import { planDay, planTotalDays, isComplete, todayPortion, formatPortion } from "../lib/plans";
import { useSettings } from "../SettingsContext";

export default function Plans() {
  const translation = useSettings().translation;
  const [plans, setPlans] = useState(getPlans);

  const remove = (id: string) => {
    deletePlan(id);
    setPlans(getPlans());
  };

  return (
    <>
      <h1 className="page-title">Reading Plans</h1>
      <p className="subtitle">
        Pick the books; the app does the citation arithmetic. Your plans live on this device.
      </p>

      {plans.length === 0 && <p className="muted">No plans yet. Start one below.</p>}

      {plans.map((p) => {
        const portion = todayPortion(p);
        const done = isComplete(p);
        return (
          <div className="card plan-card" key={p.id}>
            <h2>{p.name}</h2>
            <div className="muted small sans">
              {done ? "Complete" : `Day ${planDay(p)} of ${planTotalDays(p)}`}
              {!done && portion.length > 0 && <> · today: {formatPortion(portion, translation)}</>}
            </div>
            <div className="plan-actions">
              {!done && portion.length > 0 && (
                <Link className="continue-cta" to={`/read/${translation}/${portion[0]}`}>
                  Resume →
                </Link>
              )}
              <button type="button" className="link-btn" onClick={() => remove(p.id)}>
                Delete
              </button>
            </div>
          </div>
        );
      })}

      <Link className="continue-cta" to="/plans/new">+ New plan</Link>
    </>
  );
}
```

- [ ] **Step 2: Create `src/pages/PlanCreator.tsx`:**

```tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BOOKS, OT_GROUPS, NT_GROUPS, bookDisplayName, BookGroup } from "../lib/canon";
import { PRESETS, chaptersForBooks, targetDateToPerDay } from "../lib/plans";
import { addPlan } from "../lib/storage";
import { useSettings } from "../SettingsContext";

export default function PlanCreator() {
  const translation = useSettings().translation;
  const navigate = useNavigate();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [paceMode, setPaceMode] = useState<"perDay" | "date">("perDay");
  const [perDay, setPerDay] = useState(3);
  const [targetDate, setTargetDate] = useState("");
  const [name, setName] = useState("");

  const toggle = (slug: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(slug)) n.delete(slug);
      else n.add(slug);
      return n;
    });

  const startPreset = (id: string) => {
    const preset = PRESETS.find((p) => p.id === id)!;
    const { chapters, perDay } = preset.build();
    addPlan({ name: preset.name, chapters, perDay });
    navigate("/plans");
  };

  const total = chaptersForBooks([...selected]).length;

  const startCustom = () => {
    const chapters = chaptersForBooks([...selected]);
    if (chapters.length === 0) return;
    let pd = Math.max(1, perDay);
    if (paceMode === "date" && targetDate) {
      pd = targetDateToPerDay(chapters.length, Date.now(), new Date(`${targetDate}T00:00:00`).getTime());
    }
    addPlan({ name: name.trim() || "My reading plan", chapters, perDay: pd });
    navigate("/plans");
  };

  const group = (g: BookGroup) => {
    const books = BOOKS.filter((b) => b.group === g);
    if (!books.length) return null;
    return (
      <div key={g}>
        <div className="group-title">{g}</div>
        <div className="plan-book-grid">
          {books.map((b) => (
            <label key={b.slug} className="plan-book">
              <input type="checkbox" checked={selected.has(b.slug)} onChange={() => toggle(b.slug)} />
              {bookDisplayName(b, translation)}
            </label>
          ))}
        </div>
      </div>
    );
  };

  return (
    <>
      <h1 className="page-title">New Reading Plan</h1>

      <div className="card">
        <h2>Start from a preset</h2>
        <div className="preset-list">
          {PRESETS.map((p) => (
            <button key={p.id} type="button" className="preset-btn" onClick={() => startPreset(p.id)}>
              {p.name}
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        <h2>Or build your own</h2>
        {OT_GROUPS.map(group)}
        {NT_GROUPS.map(group)}
        <p className="muted small sans">{total} chapters selected</p>

        <div className="plan-pace">
          <label>
            <input type="radio" name="pace" checked={paceMode === "perDay"} onChange={() => setPaceMode("perDay")} />{" "}
            Chapters per day
          </label>
          {paceMode === "perDay" && (
            <input
              type="number"
              min={1}
              value={perDay}
              aria-label="Chapters per day"
              onChange={(e) => setPerDay(Math.max(1, Number(e.target.value) || 1))}
            />
          )}
          <label>
            <input type="radio" name="pace" checked={paceMode === "date"} onChange={() => setPaceMode("date")} />{" "}
            Finish by a date
          </label>
          {paceMode === "date" && (
            <input
              type="date"
              value={targetDate}
              aria-label="Target end date"
              onChange={(e) => setTargetDate(e.target.value)}
            />
          )}
        </div>

        <input
          type="text"
          className="plan-name"
          placeholder="Name your plan"
          value={name}
          aria-label="Plan name"
          onChange={(e) => setName(e.target.value)}
        />
        <button type="button" className="continue-cta" disabled={total === 0} onClick={startCustom}>
          Start →
        </button>
      </div>
    </>
  );
}
```

- [ ] **Step 3: Wire routes in `src/App.tsx`.** Add imports after line 6 (`import Reader ...`):

```ts
import Plans from "./pages/Plans";
import PlanCreator from "./pages/PlanCreator";
```

Add routes after the `/read/:translation/:book/:chapter` route (line 97):

```tsx
          <Route path="/plans" element={<Plans />} />
          <Route path="/plans/new" element={<PlanCreator />} />
```

- [ ] **Step 4:** `npm run build` → PASS. Note: `BookGroup` must be exported from `canon.ts`; if `tsc` reports it is not exported, add `export` to its declaration (it is already a `BookGroup` union — confirm `export type BookGroup`).

---

## Task 4: The three surfaces

**Files:**
- Modify: `src/pages/Home.tsx`, `src/pages/Reader.tsx`, `src/pages/BookList.tsx`

- [ ] **Step 1: Home — the Continue Reading plan line.** Add imports (after line 18 `import { getLastRead } ...`):

```ts
import { activePlan } from "../lib/storage";
import { isComplete, todayPortion, planDay, planTotalDays, formatPortion } from "../lib/plans";
```

Add to the component body (after `const lastRead = getLastRead();`):

```ts
  const plan = activePlan();
  const planPortion = plan && !isComplete(plan) ? todayPortion(plan) : [];
```

In card 5, immediately after `<h2>Continue Reading</h2>`, insert:

```tsx
          {plan && planPortion.length > 0 && (
            <p className="plan-line">
              <Link to={`/read/${translation}/${planPortion[0]}`}>
                Today's reading · {formatPortion(planPortion, translation)} · Day {planDay(plan)} of{" "}
                {planTotalDays(plan)}
              </Link>
            </p>
          )}
```

- [ ] **Step 2: Reader — the "Mark today's portion read" action.** Add imports (after line 21 `import { useSettings ... }`):

```ts
import { activePlan, updatePlan } from "../lib/storage";
import { isComplete, todayPortion, markPortionRead } from "../lib/plans";
```

Add state near the other `useState`s in the component body:

```ts
  const [plan, setPlan] = useState(activePlan);
```

Insert after the `.chapter-nav` block (after line 330 `)}`):

```tsx
      {verses && plan && !isComplete(plan) && todayPortion(plan).includes(`${bookSlug}/${chapter}`) && (
        <div className="plan-mark">
          <button
            type="button"
            className="continue-cta"
            onClick={() => {
              const next = markPortionRead(plan);
              updatePlan(next);
              setPlan(next);
            }}
          >
            Mark today's portion read ✓
          </button>
        </div>
      )}
```

- [ ] **Step 3: BookList — the link to plans.** After the `<p className="subtitle">…</p>` block (before the first `{section(...)}`), insert:

```tsx
      <p className="plans-link">
        <Link to="/plans">Reading plans →</Link>
      </p>
```

And confirm `Link` is imported in `BookList.tsx` (it renders book `Link`s already, so it is).

- [ ] **Step 4:** `npm run build` → PASS.

---

## Task 5: Styles

**Files:**
- Modify: `src/styles.css` (append)

- [ ] **Step 1: Append** to `src/styles.css`:

```css
/* Reading plans (spec §7). Links/buttons act in purple; no gold misuse. */
.plan-line { margin: 0 0 0.6rem; font-family: var(--sans); font-size: 0.9rem; }
.plan-line a { color: var(--purple); }
.plans-link { margin: 0 0 1rem; font-family: var(--sans); }
.plan-card .plan-actions { display: flex; gap: 1rem; align-items: center; margin-top: 0.5rem; }
.plan-mark { text-align: center; margin: 0.5rem 0 1rem; }
.link-btn {
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  font: inherit;
  color: var(--purple);
  text-decoration: underline;
}
.preset-list { display: flex; flex-direction: column; gap: 0.5rem; margin-top: 0.4rem; }
.preset-btn {
  text-align: left;
  background: var(--bg-2);
  border: 1px solid var(--border);
  border-radius: 0.5rem;
  padding: 0.6rem 0.8rem;
  cursor: pointer;
  font: inherit;
  color: var(--text);
}
.preset-btn:hover { border-color: var(--purple); }
.plan-book-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(8.5rem, 1fr));
  gap: 0.2rem 0.8rem;
  margin: 0.2rem 0 0.8rem;
}
.plan-book {
  display: flex;
  gap: 0.4rem;
  align-items: baseline;
  font-family: var(--sans);
  font-size: 0.85rem;
  cursor: pointer;
}
.plan-pace { display: flex; flex-wrap: wrap; gap: 0.6rem 1rem; align-items: center; margin: 0.6rem 0; font-family: var(--sans); font-size: 0.9rem; }
.plan-name { display: block; width: 100%; margin: 0.4rem 0 0.8rem; padding: 0.5rem 0.6rem; font: inherit; border: 1px solid var(--border); border-radius: 0.5rem; background: var(--bg-1); color: var(--text); }
```

- [ ] **Step 2:** `npm test` → all pass. `npm run build` → PASS.

---

## Task 6: Version bump + changelog

**Files:**
- Modify: `package.json`, `package-lock.json` (via `npm version`); `CHANGELOG.md`

- [ ] **Step 1:** `npm version 1.6.0 --no-git-tag-version` → prints `v1.6.0`.

- [ ] **Step 2:** Add above `## [1.5.0]`:

```markdown
## [1.6.0] — 2026-06-14 — v1.2 B3: reading plans, the Catena way

Spec §7. Reading plans as pure citation arithmetic: a plan is a list of chapter references
and a divisor, nothing more. Five citation-only presets — The Four Gospels in 90 Days, The
Deuterocanon in 30 Days, The Psalter in a Month, The New Testament in a Year, and The Whole
Canon in a Year (weighted, the Psalter woven through the year so Psalm 118 never shares a day
with another long chapter). A one-screen creator (grouped book checkboxes, pace by chapters/day
or a target date, a name). Surfaces: one line in Continue Reading, a "Mark today's portion read"
action at the chapter's end, and management under Read (/plans). No reminders, no streaks.

### Added

- **`src/lib/plans.ts`**: the pure citation arithmetic — preset builders, pace math, completion
  advance, and the weighted Whole-Canon order, all over the real canon counts in `canon.ts`;
  harness-tested.
- **`/plans` and `/plans/new`**: the plan list and the one-screen creator, reached from Read.
- **Continue Reading** gains a today's-portion line; the **Reader** gains the chapter-end
  "Mark today's portion read" action. The Today page stays five cards.
```

- [ ] **Step 3:** `npm test && npm run build` → both green.

---

## Self-review (spec coverage)

- **Model `{id,name,chapters,perDay,startedAt,completedThrough}`:** Task 1 (`ReadingPlan`) + Task 2 (`addPlan`). ✓
- **Creator (grouped checkboxes, pace OR target date, name, one screen):** Task 3 `PlanCreator`. ✓
- **Five presets, exact names:** Task 1 `PRESETS`. ✓
- **Whole Canon weighted (Psalm 118):** Task 1 `weightedCanon` + Task 1 tests (no two longs, near-solo, psalms spread, permutation). ✓
- **Surfaces (Continue Reading line, chapter-end mark, manage under Read):** Task 4 + Task 3. ✓
- **Acceptance: preset arithmetic harness-tested (real counts, pace, completion):** Task 1 tests, incl. real-data parity. ✓
- **Five cards / §13 no reminders no streaks:** plan line inside card 5; "Day N" is a portion index; no notifications. ✓
- **Type consistency:** `ReadingPlan`, `todayPortion`, `markPortionRead`, `planDay`, `planTotalDays`, `isComplete`, `formatPortion`, `activePlan`, `addPlan`, `updatePlan`, `deletePlan` used identically across `plans.ts`, `storage.ts`, the pages, and the tests. No placeholders.
