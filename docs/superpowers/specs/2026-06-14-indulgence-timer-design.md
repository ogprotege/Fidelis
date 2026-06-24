# Design Spec — The Reading-Time Indulgence (v1.2 B2)

[← Docs index](../../INDEX.md)

**Release label:** `v1.2 B2: the indulgence line (Ench. Ind. conc. 30)`
**Version bump:** `package.json` 1.4.0 → **1.5.0**
**Branch:** `v1.2-daily-soul`
**Spec source:** Feature Design Spec §6.1 (the indulgence timer), bound by §13.4.
**Date:** 2026-06-14

---

## 1. Purpose & the binding text

Implement spec §6.1 *exactly as written*, as the quietest feature in the app. The
governing text (verbatim):

> **§6.1** The Church grants a partial indulgence for devout reading of Sacred Scripture,
> and a plenary indulgence when the reading continues for at least half an hour under the
> usual conditions (*Enchiridion Indulgentiarum*, conc. 30). Implement it as the quietest
> feature in the app:
> - The Reader accumulates continuous reading time (Page Visibility API; pause on blur;
>   reset the continuity clock after a ten-minute gap; daily total in localStorage).
> - At thirty minutes, one line appears beneath the chapter title, gold, small: *"You have
>   read for half an hour. The Church grants a plenary indulgence for this, under the usual
>   conditions (Ench. Ind., conc. 30)."* Tapping it opens a sheet explaining the usual
>   conditions (sacramental confession, Holy Communion, prayer for the Holy Father's
>   intentions, detachment from sin).
> - No streaks, no history graph, no badge, no sound. A setting hides it entirely.
>
> Piety, not gamification.

> **§13.4** No streaks, badges, or progress theater. The indulgence line is the only
> acknowledgment the app makes, and it is the Church's, not ours.

### The line wording (must match exactly)

> You have read for half an hour. The Church grants a plenary indulgence for this, under
> the usual conditions (Ench. Ind., conc. 30).

### Acceptance criteria (binding)

1. The accumulator logic is **extracted pure** and **harness-tested** — specifically the
   **gap reset** and the **day rollover at local midnight**.
2. `npm test` green.
3. `npm run build` green.
4. No streaks / history / badge / **sound** / progress indicator before 30 minutes
   (§13.4). The Today page is untouched (still five cards).

---

## 2. Behavior (the contract)

While the **Reader** is open and the page is **visible**, reading time accumulates. The
continuity clock **resets after a ≥10-minute gap** (blur, hidden tab, or a long idle
between ticks). The day's accumulated total lives in `localStorage` and **resets at local
midnight**. When continuous reading reaches **30 minutes**, the day is marked **earned**;
a single small **gold** line appears beneath the chapter title with the exact §6.1 wording
and **remains until local midnight** even if the user stops (the indulgence was granted —
a pause does not un-grant it; one plenary per day). Tapping it opens a sheet explaining
the usual conditions.

**Nothing is shown before 30 minutes** — no countdown, no bar, no number (§13.4).

---

## 3. The pure accumulator — `src/lib/reading.ts`

The tested core. No `Date.now()` inside; all time is injected.

```ts
import { dayOfYear } from "./votd";

export interface ReadingState {
  day: number;     // local day key (year*1000 + dayOfYear) — DST-safe boundary
  ms: number;      // continuous reading time today (resets on gap / midnight)
  lastMs: number;  // timestamp of the last event
  earned: boolean; // reached 30 min at some point today (latched until midnight)
}

export const GAP_MS = 10 * 60 * 1000;
export const HALF_HOUR_MS = 30 * 60 * 1000;

export type ReadingEvent = { type: "tick" | "resume"; at: number };

export function dayKey(at: number): number {
  const d = new Date(at);
  return d.getFullYear() * 1000 + dayOfYear(d);
}

export function advance(prev: ReadingState | null, event: ReadingEvent): ReadingState;
```

`advance` rules, in order:
1. `day = dayKey(event.at)`. If `prev` is null **or** `prev.day !== day` → start fresh:
   `{ day, ms: 0, lastMs: at, earned: false }` (this is the local-midnight reset; it
   clears both `ms` and the `earned` latch).
2. `gap = at - prev.lastMs`. If `gap >= GAP_MS` → continuity broken:
   `{ day, ms: 0, lastMs: at, earned: prev.earned }` (the `earned` latch survives the day).
3. Otherwise (same day, within continuity):
   - `ms = event.type === "tick" ? prev.ms + gap : prev.ms` (a `resume` re-baselines
     `lastMs` without crediting, so time spent hidden/blurred is never counted).
   - `earned = prev.earned || ms >= HALF_HOUR_MS`.
   - `{ day, ms, lastMs: at, earned }`.

`dayKey` reuses **`votd.dayOfYear`** (calendar-component math) so the day boundary is
local-midnight and DST-safe — never a UTC/millisecond boundary (the P1-9 rule).

---

## 4. Persistence — `src/lib/storage.ts`

- A dedicated key `fidelis:reading` holding the `ReadingState` (the `getLastRead`/
  `saveLastRead` pattern — frequently mutated, kept out of `settings`):
  `getReading(): ReadingState | null`, `saveReading(s: ReadingState): void`.
- `Settings` gains `showIndulgence: boolean`, **default `true`** (the spec's "a setting
  *hides* it"). Added to the `getSettings()` default block.

---

## 5. The Reader hook + line — `src/components/IndulgenceNotice.tsx`

A self-contained component the Reader renders directly beneath the chapter-title `<h1>`:
`<IndulgenceNotice enabled={settings.showIndulgence} />`.

- When `enabled`, an effect: loads `getReading()`, `advance`s a `resume` on mount and on
  every `visibilitychange→visible`, `tick`s on a ~15s `setInterval` **only while
  `document.visibilityState === "visible"`**, calls `saveReading` after each step, and
  keeps an `earned` React state. Cleanup clears the interval and the listener and persists
  a final `resume`.
- When `!enabled`, it renders nothing and runs **no** timer (the setting hides it
  entirely).
- Renders, only when `earned`:

```tsx
<button className="indulgence-line" onClick={() => setOpen(true)}>
  You have read for half an hour. The Church grants a plenary indulgence for this,
  under the usual conditions (Ench. Ind., conc. 30).
</button>
```

  — gold, small, centered under the title — and the conditions **`Sheet`** when `open`.

The Reader change is a single line under the chapter `<h1>`; the component owns the timer,
the line, and the sheet. The accumulator runs only while the Reader is mounted, matching
"the Reader accumulates."

---

## 6. The conditions sheet (copy)

The four conditions are fixed by §6.1; the surrounding copy follows the Enchiridion's
standard norms, kept minimal and faithful.

> **The usual conditions**
> A plenary indulgence is granted for the prescribed work — here, the reading of Sacred
> Scripture for at least half an hour — together with:
> - Sacramental Confession
> - Holy Communion
> - Prayer for the intentions of the Holy Father
> - Detachment from all sin, even venial
>
> The Confession and Communion may be made within several days before or after. One
> plenary indulgence may be gained each day.
> *Enchiridion Indulgentiarum, conc. 30.*

---

## 7. The setting — `src/pages/Settings.tsx`

A `role="switch"` toggle (the follow-the-year pattern) bound to `showIndulgence`, placed
with the reading-related controls:

> **The reading-time indulgence** — *Show a quiet line after a half-hour of reading, with
> the Church's indulgence for it. Off hides it entirely.*

---

## 8. Testing — `scripts/test-data.ts`

Pure `advance` / `dayKey` assertions, deterministic with injected timestamps (the `check()`
harness; no DOM runner, consistent with the codebase):

- **Accumulation:** consecutive `tick`s with small (<10 min) gaps sum into `ms`.
- **Gap reset (acceptance):** a `tick` with `gap ≥ 10 min` resets `ms` to 0.
- **30-min earn + latch:** `ms` crossing 30 min sets `earned`; a subsequent gap-reset on
  the same day keeps `earned` true.
- **Day rollover at local midnight (acceptance):** an event whose local day differs
  (timestamps straddling local midnight, built from local calendar components) resets
  `ms` **and** `earned`.
- **`resume` does not credit:** a `resume` event adds nothing to `ms`.
- **`dayKey` is local:** the key flips at local midnight, not UTC.
- **Source guard:** `reading.ts` contains no `Date.now()` / `new Date()` argless call
  (purity), mirroring the votd millisecond-math guard.

Golden snapshots untouched (no calendar-engine change). `npm test` + `npm run build` green.

---

## 9. Standing rules honored

- **§6.1 / §13.4:** no streaks, no history, no badge, **no sound**, no progress indicator
  before 30 min; one sticky-per-day acknowledgment in the Church's own words. ✓
- **Five cards:** the feature lives in the Reader; the Today page is untouched. ✓
- **Two-accent:** the line is **gold** (honor); the only *act* is the tap that opens the
  sheet. ✓
- **No motion:** the line appears without animation; the `Sheet` is already motionless. ✓
- **Standing rule 1:** all new text is editorial TS, not `public/data`. ✓

---

## 10. Out of scope (YAGNI)

- No partial-indulgence acknowledgment (the spec's line is the plenary one only).
- No per-book/per-session history, no totals display, no "minutes read" number anywhere.
- No accumulation outside the Reader; no notification, no sound.
- No iOS widget/native change.

---

## 11. Open confirmations (resolved)

- Line persistence after earning → **stays until local midnight** (per-day `earned`
  latch). [user-approved]
- Conditions-sheet copy (§6) and version **1.5.0** under `v1.2 B2`. [pending final read]
