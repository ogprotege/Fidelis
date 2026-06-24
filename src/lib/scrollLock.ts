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
