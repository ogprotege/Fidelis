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
