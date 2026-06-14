# Reading-Time Indulgence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Spec §6.1 — after a continuous half-hour of reading in the Reader, show one small gold line citing the Church's plenary indulgence (Ench. Ind. conc. 30), tappable to a conditions sheet; a setting hides it.

**Architecture:** A pure, injected-time accumulator (`reading.ts`, reusing `votd.dayOfYear` for DST-safe local-midnight rollover) is the tested core. A self-contained `IndulgenceNotice` component runs the Page-Visibility timer, persists to `localStorage`, and renders the line + the reused `Sheet`. The Reader drops it in under the chapter title in one line.

**Tech Stack:** React + TypeScript + Vite; `tsx`/Node `check()` harness; CSS token system; Page Visibility API.

**Commit policy:** Commit only when the user asks. The user pre-authorized one final commit — `v1.2 B2: the indulgence line (Ench. Ind. conc. 30)` — to run after the work is complete, verified, reviewed, and reported. The per-task commit steps below are folded into that one commit.

**Harness gotchas:** day boundaries use `dayOfYear` (calendar components), never UTC/ms (P1-9). The gold line is interactive but **must be gold** per §6.1 — a deliberate, spec-mandated exception to "purple acts" (the line is an honor; there is no harness rule against it). No `✠`. Golden snapshots untouched.

---

## File structure

| File | Responsibility | New? |
|---|---|---|
| `src/lib/reading.ts` | Pure accumulator: `ReadingState`, `GAP_MS`, `HALF_HOUR_MS`, `dayKey`, `advance`. | Create |
| `src/lib/storage.ts` | `getReading`/`saveReading` (`fidelis:reading`); `showIndulgence: boolean` on `Settings` (default true). | Modify |
| `src/components/IndulgenceNotice.tsx` | Visibility timer + persistence; renders the gold line + conditions `Sheet`. | Create |
| `src/pages/Reader.tsx` | One line: `<IndulgenceNotice enabled={settings.showIndulgence} />` under the chapter title. | Modify |
| `src/pages/Settings.tsx` | A `role="switch"` toggle for `showIndulgence`. | Modify |
| `src/styles.css` | `.indulgence-line` (gold, small) + `.conditions-list`. | Modify |
| `scripts/test-data.ts` | Pure accumulator assertions (gap reset, midnight rollover, earn/latch, resume, purity). | Modify |
| `CHANGELOG.md`, `package.json` (+lock) | 1.5.0 entry + bump. | Modify |

---

## Task 1: The pure accumulator (`reading.ts`) — TDD

**Files:**
- Create: `src/lib/reading.ts`
- Test: `scripts/test-data.ts` (new section, added in this task)

- [ ] **Step 1: Write the failing tests.** Add to the top import block of `scripts/test-data.ts`:

```ts
import { advance, dayKey, GAP_MS, HALF_HOUR_MS } from "../src/lib/reading";
```

Append this block just before the final `console.log(...failures...)` summary line:

```ts
// 12. The reading-time indulgence accumulator (v1.2 B2, spec §6.1). Pure; driven
//     by injected timestamps. Gap reset and local-midnight rollover are the
//     acceptance criteria.
console.log("");
{
  const MIN = 60 * 1000;
  const t0 = new Date(2026, 5, 14, 9, 0, 0).getTime(); // Jun 14 2026 09:00 local

  // Accumulation: six 5-min ticks credit 30 minutes and earn the indulgence.
  let s = advance(null, { type: "resume", at: t0 });
  for (let k = 1; k <= 6; k++) s = advance(s, { type: "tick", at: t0 + k * 5 * MIN });
  check("reading: six 5-min ticks accumulate 30 minutes", s.ms === 30 * MIN, `${s.ms / MIN}min`);
  check("reading: 30 minutes earns the indulgence", s.earned === true);

  // Gap reset: a tick a full 10 min after the last resets the continuity clock.
  let g = advance(null, { type: "resume", at: t0 });
  g = advance(g, { type: "tick", at: t0 + 5 * MIN });
  g = advance(g, { type: "tick", at: t0 + 5 * MIN + GAP_MS });
  check("reading: a >=10-min gap resets the continuity clock", g.ms === 0, `${g.ms / MIN}min`);
  check("reading: a pre-earn gap leaves earned false", g.earned === false);

  // Earned latches through a same-day gap reset.
  const after = advance(s, { type: "tick", at: t0 + 6 * 5 * MIN + GAP_MS + MIN });
  check("reading: earned latches through a same-day gap reset", after.earned === true && after.ms === 0);

  // resume re-baselines without crediting time.
  let r = advance(null, { type: "resume", at: t0 });
  r = advance(r, { type: "tick", at: t0 + 3 * MIN });
  r = advance(r, { type: "resume", at: t0 + 9 * MIN });
  check("reading: resume re-baselines without crediting", r.ms === 3 * MIN, `${r.ms / MIN}min`);

  // Local-midnight rollover resets ms AND earned.
  const late = new Date(2026, 5, 14, 23, 50, 0).getTime();
  const next = new Date(2026, 5, 15, 0, 5, 0).getTime();
  let d = advance(null, { type: "resume", at: late });
  d = advance(d, { type: "tick", at: late + 2 * MIN });
  d = { ...d, earned: true }; // force earned to prove the rollover clears it
  const rolled = advance(d, { type: "tick", at: next });
  check("reading: local-midnight rollover resets ms and earned",
    rolled.ms === 0 && rolled.earned === false, `ms=${rolled.ms} earned=${rolled.earned}`);

  // dayKey is local, not UTC.
  check("reading: dayKey changes across local midnight",
    dayKey(new Date(2026, 5, 14, 23, 59, 0).getTime()) !== dayKey(new Date(2026, 5, 15, 0, 1, 0).getTime()));
  check("reading: dayKey is stable within a local day",
    dayKey(new Date(2026, 5, 14, 1, 0, 0).getTime()) === dayKey(new Date(2026, 5, 14, 22, 0, 0).getTime()));

  // Purity guard: the module injects time, never reads the clock itself.
  const readingSrc = readFileSync(join(ROOT, "src/lib/reading.ts"), "utf8");
  check("reading.ts has no Date.now()/argless new Date() (pure)",
    !/Date\.now\(/.test(readingSrc) && !/new Date\(\s*\)/.test(readingSrc));

  check("reading: HALF_HOUR_MS and GAP_MS are 30 and 10 minutes",
    HALF_HOUR_MS === 30 * MIN && GAP_MS === 10 * MIN);
}
```

- [ ] **Step 2: Run to verify it fails.** Run: `npm test` → FAIL (cannot resolve `../src/lib/reading`).

- [ ] **Step 3: Implement `src/lib/reading.ts`:**

```ts
import { dayOfYear } from "./votd";

/** Continuous reading-time accumulator for the §6.1 indulgence line. Pure: all
 *  time is injected via the event timestamp; nothing here reads the clock. */
export interface ReadingState {
  /** Local day key (year*1000 + dayOfYear) the total belongs to. */
  day: number;
  /** Continuous reading time today, ms; resets on a gap or at local midnight. */
  ms: number;
  /** Timestamp of the last event. */
  lastMs: number;
  /** Reached half an hour at some point today; latched until local midnight. */
  earned: boolean;
}

/** A gap of this length or longer breaks reading continuity (§6.1). */
export const GAP_MS = 10 * 60 * 1000;
/** The half-hour that earns the plenary indulgence (§6.1). */
export const HALF_HOUR_MS = 30 * 60 * 1000;

export type ReadingEvent = { type: "tick" | "resume"; at: number };

/** Local-day key from calendar components (DST-safe, like votd.dayOfYear) — the
 *  day boundary is local midnight, never a UTC/millisecond cut. */
export function dayKey(at: number): number {
  const d = new Date(at);
  return d.getFullYear() * 1000 + dayOfYear(d);
}

/**
 * Advance the accumulator by one event at `event.at`.
 * - `tick`: fired periodically while the page is visible and the Reader is open;
 *   credits the elapsed time when within a continuous session.
 * - `resume`: fired on mount and when the page becomes visible; re-baselines the
 *   clock WITHOUT crediting, so time spent hidden/blurred is never counted.
 * A new local day, or a gap >= GAP_MS, resets the continuity clock (the `earned`
 * latch survives a same-day gap but is cleared by the day rollover).
 */
export function advance(prev: ReadingState | null, event: ReadingEvent): ReadingState {
  const day = dayKey(event.at);
  if (!prev || prev.day !== day) {
    return { day, ms: 0, lastMs: event.at, earned: false };
  }
  const gap = event.at - prev.lastMs;
  if (gap >= GAP_MS) {
    return { day, ms: 0, lastMs: event.at, earned: prev.earned };
  }
  const ms = event.type === "tick" ? prev.ms + Math.max(0, gap) : prev.ms;
  return { day, ms, lastMs: event.at, earned: prev.earned || ms >= HALF_HOUR_MS };
}
```

- [ ] **Step 4: Run to verify it passes.** Run: `npm test` → all reading checks PASS.

---

## Task 2: Persistence + setting (`storage.ts`)

**Files:**
- Modify: `src/lib/storage.ts` (Settings interface ~45-57; getSettings defaults ~80-90; add getReading/saveReading near getLastRead ~125-131)

- [ ] **Step 1: Add `showIndulgence` to the `Settings` interface** (after `followLiturgicalYear` line 56):

```ts
  /** Show the §6.1 reading-time indulgence line in the Reader. */
  showIndulgence: boolean;
```

- [ ] **Step 2: Add its default** in `getSettings()` (after `followLiturgicalYear: true,`):

```ts
    showIndulgence: true,
```

- [ ] **Step 3: Add the reading-state accessors** (import the type at the top of storage.ts and add the accessors near `getLastRead`/`saveLastRead`).

Top of `storage.ts`, with the other imports:

```ts
import { ReadingState } from "./reading";
```

Near `saveLastRead` (after line 131):

```ts
/** The §6.1 reading-time accumulator state (frequently mutated; kept out of
 *  Settings, like LastRead). */
export function getReading(): ReadingState | null {
  return read<ReadingState | null>("reading", null);
}

export function saveReading(state: ReadingState): void {
  write("reading", state);
}
```

- [ ] **Step 4: Type-check.** Run: `npm run build` → PASS.

---

## Task 3: The `IndulgenceNotice` component

**Files:**
- Create: `src/components/IndulgenceNotice.tsx`

No DOM test runner; verified by `tsc`/build + manual. Complete code:

```tsx
import { useEffect, useState } from "react";
import Sheet from "./Sheet";
import { advance } from "../lib/reading";
import { getReading, saveReading } from "../lib/storage";

/** ~15s between ticks: fine enough that the line appears within seconds of the
 *  half-hour, cheap enough to be invisible. */
const TICK_MS = 15 * 1000;

/**
 * Spec §6.1 — the quietest feature in the app. While the Reader is open and the
 * page is visible, accumulate continuous reading time; once it reaches half an
 * hour the day is "earned" and one gold line appears, sticky until local
 * midnight. `enabled` is the user's setting; off runs no timer and shows
 * nothing.
 */
export default function IndulgenceNotice({ enabled }: { enabled: boolean }) {
  const [earned, setEarned] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setEarned(false);
      return;
    }
    let state = advance(getReading(), { type: "resume", at: Date.now() });
    saveReading(state);
    setEarned(state.earned);

    const tick = () => {
      if (document.visibilityState !== "visible") return;
      state = advance(state, { type: "tick", at: Date.now() });
      saveReading(state);
      setEarned(state.earned);
    };
    const onVisibility = () => {
      if (document.visibilityState !== "visible") return;
      state = advance(state, { type: "resume", at: Date.now() });
      saveReading(state);
      setEarned(state.earned);
    };

    const id = window.setInterval(tick, TICK_MS);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisibility);
      state = advance(state, { type: "resume", at: Date.now() });
      saveReading(state);
    };
  }, [enabled]);

  if (!enabled || !earned) return null;

  return (
    <>
      <button type="button" className="indulgence-line" onClick={() => setOpen(true)}>
        You have read for half an hour. The Church grants a plenary indulgence for this,
        under the usual conditions (Ench. Ind., conc. 30).
      </button>
      {open && (
        <Sheet titleId="indulgence-conditions-title" onClose={() => setOpen(false)}>
          <div className="conditions-sheet">
            <h2 id="indulgence-conditions-title" className="mystery-sheet-title">
              The usual conditions
            </h2>
            <p>
              A plenary indulgence is granted for the prescribed work — here, the reading
              of Sacred Scripture for at least half an hour — together with:
            </p>
            <ul className="conditions-list">
              <li>Sacramental Confession</li>
              <li>Holy Communion</li>
              <li>Prayer for the intentions of the Holy Father</li>
              <li>Detachment from all sin, even venial</li>
            </ul>
            <p className="muted small">
              The Confession and Communion may be made within several days before or after.
              One plenary indulgence may be gained each day.
            </p>
            <p className="muted small">
              <em>Enchiridion Indulgentiarum, conc. 30.</em>
            </p>
          </div>
        </Sheet>
      )}
    </>
  );
}
```

- [ ] **Step 1: Create the file above.**
- [ ] **Step 2: Type-check.** Run: `npm run build` → PASS (Reader wiring in Task 4 makes it used).

---

## Task 4: Wire the Reader + the Settings toggle

**Files:**
- Modify: `src/pages/Reader.tsx` (import; render under chapter title ~269)
- Modify: `src/pages/Settings.tsx` (toggle in Appearance ~261)

- [ ] **Step 1: Import in `Reader.tsx`** (after line 19 `import Icon ...`):

```ts
import IndulgenceNotice from "../components/IndulgenceNotice";
```

- [ ] **Step 2: Render it** beneath the chapter title block. Replace:

```tsx
      <p className="chapter-subtitle">
        {trans?.name}
        {bookSlug === "psalms" && " · traditional Vulgate Psalm numbering"}
      </p>
```

with:

```tsx
      <p className="chapter-subtitle">
        {trans?.name}
        {bookSlug === "psalms" && " · traditional Vulgate Psalm numbering"}
      </p>
      <IndulgenceNotice enabled={settings.showIndulgence} />
```

- [ ] **Step 3: Add the toggle to `Settings.tsx`** Appearance section. Replace the closing of the follow-the-year row + section:

```tsx
            onClick={() => update({ followLiturgicalYear: !settings.followLiturgicalYear })}
          />
        </div>
      </section>
```

with:

```tsx
            onClick={() => update({ followLiturgicalYear: !settings.followLiturgicalYear })}
          />
        </div>
        <div className="setting-row">
          <div>
            <div className="setting-label">The reading-time indulgence</div>
            <p className="catechesis muted small">
              Show a quiet line after a half-hour of reading, with the Church's indulgence
              for it. Off hides it entirely.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={settings.showIndulgence}
            aria-label="The reading-time indulgence"
            className="switch"
            onClick={() => update({ showIndulgence: !settings.showIndulgence })}
          />
        </div>
      </section>
```

- [ ] **Step 4: Type-check.** Run: `npm run build` → PASS.

---

## Task 5: Styles

**Files:**
- Modify: `src/styles.css` (append)

- [ ] **Step 1: Append** to `src/styles.css`:

```css
/* The reading-time indulgence line (spec §6.1). Gold honor; the only act is the
   tap that opens the conditions sheet. Gold-on-interactive is spec-mandated. */
.indulgence-line {
  display: block;
  width: 100%;
  margin: 0.1rem 0 0.5rem;
  padding: 0;
  background: none;
  border: none;
  cursor: pointer;
  text-align: center;
  font-family: var(--sans);
  font-size: 0.8rem;
  line-height: 1.45;
  color: var(--gold);
}
.indulgence-line:hover,
.indulgence-line:focus-visible { text-decoration: underline; }

.conditions-list { margin: 0.5rem 0; padding-left: 1.3rem; }
.conditions-list li { margin: 0.25rem 0; line-height: 1.5; }
```

- [ ] **Step 2: Run full suite.** Run: `npm test` → all pass. Run: `npm run build` → PASS.

---

## Task 6: Version bump + changelog

**Files:**
- Modify: `package.json`, `package-lock.json` (via `npm version`); `CHANGELOG.md`

- [ ] **Step 1: Bump.** Run: `npm version 1.5.0 --no-git-tag-version` → prints `v1.5.0`.

- [ ] **Step 2: CHANGELOG entry** above `## [1.4.0]`:

```markdown
## [1.5.0] — 2026-06-14 — v1.2 B2: the indulgence line (Ench. Ind. conc. 30)

Spec §6.1, the quietest feature in the app. While you read in the Reader, continuous
reading time accumulates (Page Visibility API; paused when the tab is hidden; the
continuity clock resets after a ten-minute gap; the daily total lives in localStorage and
resets at local midnight). At half an hour, one small gold line appears beneath the chapter
title — *"You have read for half an hour. The Church grants a plenary indulgence for this,
under the usual conditions (Ench. Ind., conc. 30)."* — and stays until midnight. Tapping it
opens a sheet listing the usual conditions. No streaks, no history, no badge, no sound; a
setting hides it entirely. Piety, not gamification.

### Added

- **The reading-time accumulator** (`src/lib/reading.ts`): a pure, injected-time reducer
  (`advance`) reusing `votd.dayOfYear` for DST-safe local-midnight rollover; harness-tested
  for the gap reset and the day rollover.
- **The indulgence line** (`IndulgenceNotice`): the Reader-scoped Page-Visibility timer and
  the gold line, with the conditions explained in the reused bottom-sheet.
- **A setting** (`showIndulgence`, default on) to hide it entirely.
```

- [ ] **Step 3: Final verification.** Run: `npm test && npm run build` → both green.

---

## Self-review (spec coverage)

- **§6.1 accumulate / pause-on-blur / 10-min gap / daily total in localStorage:** Task 1 (`advance`) + Task 2 (`saveReading`) + Task 3 (visibility timer). ✓
- **§6.1 line at 30 min, exact wording, gold/small, beneath chapter title:** Task 3 + Task 4 + Task 5. ✓
- **§6.1 sheet of usual conditions (four named):** Task 3. ✓
- **§6.1 a setting hides it:** Task 2 (`showIndulgence`) + Task 4 toggle. ✓
- **Acceptance: accumulator pure + harness-tested (gap reset, midnight rollover):** Task 1 tests. ✓
- **§13.4 no streaks/badge/sound/progress-before-30:** nothing renders until `earned`; no counter/number anywhere; no audio. ✓
- **Sticky until midnight (approved):** `earned` latch cleared only by the day rollover. ✓
- **Five cards / golden untouched / no ✠ / two-accent (gold line is the spec exception):** no Today/engine change; line is gold, sheet close is purple. ✓

**Type consistency:** `ReadingState`/`advance`/`dayKey`/`GAP_MS`/`HALF_HOUR_MS` used identically across `reading.ts`, `storage.ts`, `IndulgenceNotice.tsx`, and the test. `showIndulgence` consistent across `Settings`, `getSettings`, Reader, Settings.tsx. No placeholders.
