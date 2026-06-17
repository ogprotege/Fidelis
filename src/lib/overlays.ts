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
}

let stack: Overlay[] = [];
let seq = 0;

/** Register an open overlay; returns the id to unregister with on close. */
export function pushOverlay(close: () => void): number {
  const id = ++seq;
  stack.push({ id, close });
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
  removeOverlay(top.id);
  top.close();
  return true;
}

/** How many overlays are open. */
export function overlayCount(): number {
  return stack.length;
}
