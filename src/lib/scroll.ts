/**
 * Navigation scroll authority (the nav/IA redesign). Pure decision logic so the
 * window lands at the right place on every move: the top on a fresh navigation,
 * your saved place on Back/Forward, and out of the way when the URL targets a
 * specific verse (?v=) or in-page anchor (#id) that owns its own scroll.
 *
 * The per-history-entry offset store lives in the ScrollManager component; this
 * module is the pure heart that `scripts/test-data.ts` asserts.
 */

export type NavType = "PUSH" | "POP" | "REPLACE";
export type ScrollAction = "restore" | "top" | "skip";

/**
 * How to position the window after a navigation:
 *  - targets a specific element (`?v=` verse or `#hash` anchor) → `skip`; the
 *    Reader verse-focus or the anchor handler owns the scroll. Checked FIRST, so
 *    Back/Forward to a verse glides to it rather than fighting a restore.
 *  - REPLACE → `skip`; it's an in-place update of the current entry (the Readings
 *    day-stepper, the Search filter/query, the Reader chapter clamp) — leave the
 *    scroll where it is rather than jumping to the top.
 *  - POP (Back/Forward) → `restore` the offset saved for that history entry.
 *  - PUSH (a genuine new page) → `top`.
 */
export function decideScroll(navType: NavType, hasTarget: boolean): ScrollAction {
  if (hasTarget) return "skip";
  if (navType === "REPLACE") return "skip";
  if (navType === "POP") return "restore";
  return "top";
}

/**
 * Whether a react-router location targets an element it should scroll to itself
 * — a `#hash` anchor, or a `?v=` deep-linked verse. `search`/`hash` are the
 * react-router location's parts (inside the HashRouter's route).
 */
export function hasScrollTarget(search: string, hash: string): boolean {
  if (hash && hash !== "#") return true;
  try {
    return new URLSearchParams(search).has("v");
  } catch {
    return false;
  }
}
