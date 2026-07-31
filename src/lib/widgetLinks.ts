/**
 * Native widget links enter through one small, pure routing contract. Keeping
 * parsing and history policy here prevents the cold-launch and warm-resume
 * listeners from quietly drifting apart.
 */

export type WidgetLinkKind = "today" | "mass" | "verse" | "quote";

export interface WidgetLinkTarget {
  kind: WidgetLinkKind;
  pathname: string;
  hash: string;
  /** Element that receives focus after the destination is ready. */
  focusId: "main" | "votd" | "qotd";
}

const TARGETS: Record<WidgetLinkKind, WidgetLinkTarget> = {
  today: { kind: "today", pathname: "/", hash: "", focusId: "main" },
  mass: { kind: "mass", pathname: "/readings", hash: "", focusId: "main" },
  verse: { kind: "verse", pathname: "/", hash: "#votd", focusId: "votd" },
  quote: { kind: "quote", pathname: "/", hash: "#qotd", focusId: "qotd" }
};

/** Capacitor can deliver the same activation through both getLaunchUrl() and
 * appUrlOpen before React commits the first navigation. Keep that single OS
 * activation from producing two history entries. */
export const WIDGET_LINK_DEDUPE_MS = 1200;

export interface WidgetLinkDelivery {
  destination: string;
  receivedAt: number;
}

export interface WidgetLinkActivation {
  url: string;
  source: "cold" | "warm";
}

/** Stored in React Router's `usr` history payload for a warm widget launch.
 * Keeping the return cursor beside the pushed entry lets native Back discard a
 * WebKit-created same-hash duplicate without guessing from `history.length`. */
export interface WidgetReturnContract {
  version: 1;
  widgetDestination: string;
  callerDestination: string;
  callerHistoryIndex: number | null;
}

const WIDGET_RETURN_STATE_KEY = "fidelisWidgetReturn";

export function appHistoryIndex(state: unknown): number | null {
  if (typeof state !== "object" || state === null || !("idx" in state)) return null;
  const index = (state as { idx?: unknown }).idx;
  return typeof index === "number" && Number.isInteger(index) && index >= 0 ? index : null;
}

/** React Router stores its current History API cursor as `idx`. Native iOS
 * edge-Back must consume only entries owned by that router; falling back on
 * `history.length` can leave the Capacitor document at the app root. */
export function canConsumeAppHistory(state: unknown): boolean {
  const index = appHistoryIndex(state);
  return index !== null && index > 0;
}

/** Value passed to React Router's `navigate(..., { state })`. The router wraps
 * it in its `usr` field while retaining its own `idx`, `key`, and invariants. */
export function widgetReturnNavigationState(
  contract: WidgetReturnContract
): Record<typeof WIDGET_RETURN_STATE_KEY, WidgetReturnContract> {
  return { [WIDGET_RETURN_STATE_KEY]: contract };
}

export function widgetReturnContractFromHistoryState(
  state: unknown
): WidgetReturnContract | null {
  if (typeof state !== "object" || state === null || !("usr" in state)) return null;
  const userState = (state as { usr?: unknown }).usr;
  if (
    typeof userState !== "object" ||
    userState === null ||
    !(WIDGET_RETURN_STATE_KEY in userState)
  ) {
    return null;
  }
  const value = (userState as Record<string, unknown>)[WIDGET_RETURN_STATE_KEY];
  if (typeof value !== "object" || value === null) return null;
  const candidate = value as Partial<WidgetReturnContract>;
  const callerIndex = candidate.callerHistoryIndex;
  if (
    candidate.version !== 1 ||
    typeof candidate.widgetDestination !== "string" ||
    typeof candidate.callerDestination !== "string" ||
    !(
      callerIndex === null ||
      (typeof callerIndex === "number" && Number.isInteger(callerIndex) && callerIndex >= 0)
    )
  ) {
    return null;
  }
  return candidate as WidgetReturnContract;
}

/** After one native Back, WebKit can still expose a copied widget entry. Only
 * traverse it when React Router's cursor proves the intended caller remains
 * below us. If the cursor is missing or already at the caller, replacement is
 * the safe fail-closed fallback and cannot leave the app document. */
export function canDiscardDuplicateWidgetEntry(
  state: unknown,
  contract: WidgetReturnContract,
  currentDestination: string
): boolean {
  const currentIndex = appHistoryIndex(state);
  return (
    currentDestination === contract.widgetDestination &&
    contract.callerHistoryIndex !== null &&
    currentIndex !== null &&
    currentIndex > contract.callerHistoryIndex
  );
}

/**
 * Capacitor may emit appUrlOpen before getLaunchUrl() resolves during a cold
 * start. Buffer those events, make the launch URL authoritative, then let the
 * normal destination/time dedupe collapse the duplicate delivery. If the
 * launch lookup returns no URL, the first buffered activation is the cold
 * intent so an incidental shell entry is not left below it.
 */
export function widgetLinkStartupActivations(
  launchUrl: string | null | undefined,
  bufferedWarmUrls: readonly string[]
): WidgetLinkActivation[] {
  const activations: WidgetLinkActivation[] = [];
  if (launchUrl) activations.push({ url: launchUrl, source: "cold" });
  bufferedWarmUrls.forEach((url, index) => {
    activations.push({
      url,
      // Before the launch lookup settles, the first appUrlOpen is the only
      // available cold-start intent when getLaunchUrl() returns empty. Treat
      // it as cold whether the lookup resolved or rejected; otherwise Back
      // exposes the shell's incidental blank/root entry.
      source: !launchUrl && index === 0 ? "cold" : "warm"
    });
  });
  return activations;
}

/**
 * The OS launch URL is a LATCH, not an event, on both platforms: iOS stores it
 * in `ApplicationDelegateProxy.lastURL` (set on every `openURL`, never cleared)
 * and Android in `Bridge.intentUri` (captured once in the Bridge constructor,
 * never refreshed). `getLaunchUrl()` therefore keeps answering with the same
 * widget URL for the entire process, and neither latch can be cleared from JS.
 *
 * So the app must do the clearing. This gate makes the startup URL a one-shot:
 * the first claim yields it, every later claim yields null. Without it, any
 * re-read of the launch URL is re-classified as a fresh COLD activation and
 * `replace`-navigates the person back to the widget destination — which is
 * exactly the "I can't leave the page the widget opened" freeze that shipped
 * from v1.18.3 through v1.24.0. Mounting the listener effect once removes the
 * immediate cause; this gate is the standing guarantee that no future
 * dependency churn can resurrect it.
 */
export interface WidgetStartupGate {
  claimed: boolean;
}

export function createWidgetStartupGate(): WidgetStartupGate {
  return { claimed: false };
}

/** Yield the launch URL exactly once per app process; null on every re-read. */
export function claimStartupLaunchUrl(
  gate: WidgetStartupGate,
  launchUrl: string | null | undefined
): string | null {
  if (gate.claimed) return null;
  gate.claimed = true;
  return launchUrl ?? null;
}

export function widgetLinkTarget(url: string): WidgetLinkTarget | null {
  const match = /^fidelis:\/\/([a-z]+)(?:[/?#]|$)/i.exec(url.trim());
  const kind = match?.[1].toLowerCase() as WidgetLinkKind | undefined;
  return kind && kind in TARGETS ? TARGETS[kind] : null;
}

export function widgetLinkDestination(target: WidgetLinkTarget): string {
  return `${target.pathname}${target.hash}`;
}

export function isDuplicateWidgetLinkDelivery(
  previous: WidgetLinkDelivery | null,
  target: WidgetLinkTarget,
  receivedAt: number
): boolean {
  if (!previous || previous.destination !== widgetLinkDestination(target)) return false;
  const elapsed = receivedAt - previous.receivedAt;
  return elapsed >= 0 && elapsed <= WIDGET_LINK_DEDUPE_MS;
}

/** Record one delivery against its own destination. A single "last event"
 * slot is insufficient: mass, verse, then a duplicate mass can arrive before
 * the cold-start lookup settles. Keeping the four strict destinations separate
 * collapses that duplicate without suppressing the distinct verse intent. */
export function acceptWidgetLinkDelivery(
  deliveries: Map<string, WidgetLinkDelivery>,
  target: WidgetLinkTarget,
  receivedAt: number
): boolean {
  const destination = widgetLinkDestination(target);
  const previous = deliveries.get(destination) ?? null;
  if (isDuplicateWidgetLinkDelivery(previous, target, receivedAt)) return false;
  deliveries.set(destination, { destination, receivedAt });
  return true;
}

export function isSameWidgetTarget(
  current: { pathname: string; search: string; hash: string },
  target: WidgetLinkTarget
): boolean {
  // Widget destinations carry no query. In particular, /readings?date=… is a
  // different screen state from fidelis://mass, which means today's Mass. A
  // same-path check that ignores search would leave a widget tap stranded on
  // the previously browsed date and incorrectly call it idempotent.
  return current.pathname === target.pathname && current.search === "" && current.hash === target.hash;
}

/**
 * Cold widget launches replace the shell's incidental initial entry. Warm
 * launches push one real destination so Back returns to the screen the person
 * was using. A repeat tap on the destination itself never grows history.
 */
export function widgetLinkHistoryMode(
  source: "cold" | "warm",
  sameTarget: boolean
): "replace" | "push" | "focus" {
  if (sameTarget) return "focus";
  return source === "cold" ? "replace" : "push";
}
