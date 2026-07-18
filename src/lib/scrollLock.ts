/**
 * A shared, reference-counted body-scroll lock for modal sheets.
 *
 * iOS WKWebView ignores `body { overflow: hidden }` for touch dragging, so a
 * modal must pin the body with `position: fixed` (offset by the current scroll)
 * to truly freeze the page behind its scrim and stop it rubber-banding.
 *
 * The trap — and the cause of the iOS "page won't scroll" bug — is that the lock
 * must be applied ONCE and released ONCE. When each sheet captured and restored
 * the body's inline styles on its own, two stacked sheets would have the second
 * capture the ALREADY-LOCKED state; closing them out of order then restored
 * `position: fixed` with no sheet open, leaving the document permanently
 * unscrollable (its height collapses to the viewport). A single counted lock
 * makes locking idempotent and close-order-independent: the body is frozen on
 * the first lock and restored to its true pre-lock state only when the last lock
 * releases, so no combination of opening/closing sheets can strand it.
 */

interface SavedBodyStyle {
  overflow: string;
  position: string;
  top: string;
  width: string;
  scrollY: number;
}

let lockCount = 0;
let saved: SavedBodyStyle | null = null;

/** Whether the body is currently pinned by at least one sheet. While locked,
 *  `window.scrollY` is not the page's real offset (pinning resets it to 0), so
 *  scroll recorders must ignore it. */
export function isScrollLocked(): boolean {
  return lockCount > 0;
}

/** Freeze the page behind a modal. Safe to nest — only the first call pins the
 *  body; later calls just bump the count. */
export function lockScroll(): void {
  if (typeof document === "undefined") return;
  lockCount += 1;
  if (lockCount > 1) return; // an outer sheet already pinned the body
  const body = document.body;
  const scrollY = window.scrollY;
  saved = {
    overflow: body.style.overflow,
    position: body.style.position,
    top: body.style.top,
    width: body.style.width,
    scrollY
  };
  body.style.overflow = "hidden";
  body.style.position = "fixed";
  body.style.top = `-${scrollY}px`;
  body.style.width = "100%";
}

/** Whether the body is actually pinned right now. The counter is the normal
 *  truth, but an interrupted teardown can strand the inline `position: fixed`
 *  with the count already back at 0 — so the heal predicates on the body, not
 *  the count. Only this module ever writes that inline style. */
export function isBodyPinned(): boolean {
  return typeof document !== "undefined" && document.body.style.position === "fixed";
}

/** Force-release ALL locks and restore the body — a safety net for the rare case
 *  where a lock is stranded (an iOS WKWebView can tear a sheet down without running
 *  its cleanup when a native share/permission dialog or a background/foreground
 *  interrupts it, leaving `position: fixed` pinned and the page seemingly frozen —
 *  navigation still changes the route, but the pinned body clips the new page out
 *  of view). Idempotent; a no-op when the body is not pinned. It predicates on the
 *  body's actual state, not just the counter, so a pin the count lost track of
 *  (interrupted teardown) clears too. Pass { restoreScroll: false } when the caller
 *  has already positioned the page (a route change — ScrollManager owns the new
 *  page's offset); the default restores the pre-lock offset (sheet close, or a
 *  heal with no navigation, where the user's place should be kept). The App calls
 *  it via healStrandedScrollLock on route change, every pointerdown, and
 *  foreground-resume, so a stranded lock self-heals on the user's next touch
 *  instead of needing an app restart. */
export function resetScrollLock(opts: { restoreScroll?: boolean } = {}): void {
  if (typeof document === "undefined") return;
  const restoreScroll = opts.restoreScroll ?? true;
  if (lockCount === 0 && saved === null && !isBodyPinned()) return;
  lockCount = 0;
  const s = saved;
  saved = null;
  const body = document.body;
  if (s) {
    body.style.overflow = s.overflow;
    body.style.position = s.position;
    body.style.top = s.top;
    body.style.width = s.width;
    if (restoreScroll) window.scrollTo(0, s.scrollY);
  } else {
    // No snapshot to restore (an interrupted teardown, or a pin the counter
    // never saw) — clear the pin so the page scrolls; leave the scroll alone.
    body.style.overflow = "";
    body.style.position = "";
    body.style.top = "";
    body.style.width = "";
  }
}

/** Heal a STRANDED lock: the body is pinned (per the count OR the body itself)
 *  but no sheet is mounted — the `.sheet-backdrop` DOM check is the guard, so
 *  a legitimately-open sheet is never unlocked. Safe to call on every user
 *  interaction: a no-op unless the lock is stranded. Returns true when it
 *  healed. Options forward to resetScrollLock. */
export function healStrandedScrollLock(opts?: { restoreScroll?: boolean }): boolean {
  if (typeof document === "undefined") return false;
  if (document.querySelector(".sheet-backdrop")) return false;
  if (!isScrollLocked() && !isBodyPinned()) return false;
  resetScrollLock(opts);
  return true;
}

/** Release one lock. Only the last release restores the body and the scroll
 *  position captured before the first lock. */
export function unlockScroll(): void {
  if (typeof document === "undefined") return;
  if (lockCount === 0) return; // already fully released — never restore twice
  lockCount -= 1;
  if (lockCount > 0) return; // a sheet is still open; stay frozen
  const body = document.body;
  const s = saved;
  saved = null;
  if (!s) return;
  body.style.overflow = s.overflow;
  body.style.position = s.position;
  body.style.top = s.top;
  body.style.width = s.width;
  window.scrollTo(0, s.scrollY);
}
