/**
 * Overlay back-stack (the nav/IA redesign). Every open overlay — each `Sheet`
 * and the "More" popover — registers a closer here, newest last, so the Android
 * hardware Back button (and the app-root exit decision) can close the topmost
 * overlay before touching navigation. A plain module singleton: it is read
 * imperatively by the back-button handler, never rendered, so it needs no React
 * state. The pure ordering is asserted in `scripts/test-data.ts`.
 */

export interface Overlay {
  id: number;
  close: () => void;
  /** A closing overlay still owns Back until React unmounts it. This prevents a
   * rapid second hardware-Back press from navigating the route underneath an
   * animating sheet. */
  closing: boolean;
}

let stack: Overlay[] = [];
let seq = 0;

/** Register an open overlay; returns the id to unregister with on close. */
export function pushOverlay(close: () => void): number {
  const id = ++seq;
  stack.push({ id, close, closing: false });
  return id;
}

/** Remove an overlay from the stack (on unmount / programmatic close). */
export function removeOverlay(id: number): void {
  stack = stack.filter((o) => o.id !== id);
}

/** Close the most-recently-opened overlay; true if one was closed. */
export function closeTopOverlay(): boolean {
  const top = stack[stack.length - 1];
  if (!top) return false;
  // Keep the entry until its component cleanup calls removeOverlay(). While an
  // animated close is in flight, additional Back presses are consumed here
  // instead of escaping to the router or exiting the app.
  if (!top.closing) {
    top.closing = true;
    top.close();
  }
  return true;
}

/** Dismiss every open overlay, newest first. Widget/deep-link navigation uses
 * this so a popover behind a sheet cannot survive onto the destination. */
export function dismissAllOverlays(): number {
  const liveCount = stack.length;
  const open = [...stack].reverse().filter((overlay) => !overlay.closing);
  for (const overlay of open) {
    overlay.closing = true;
    overlay.close();
  }
  // A caller must still wait when every entry was already closing; their
  // component cleanup and scroll unlock have not completed yet.
  return liveCount;
}

/** True only for the newest overlay. Escape handlers use this to ensure one
 * key press cannot close several stacked dialogs. */
export function isTopOverlay(id: number): boolean {
  return stack[stack.length - 1]?.id === id;
}

/** How many overlays are open. */
export function overlayCount(): number {
  return stack.length;
}
