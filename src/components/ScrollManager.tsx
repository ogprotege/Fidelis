import { useEffect, useLayoutEffect, useRef } from "react";
import { useLocation, useNavigationType } from "react-router";
import {
  decideScroll,
  hasScrollTarget,
  rememberScrollOffset,
  scrollEntryKey,
  scrollRouteKey
} from "../lib/scroll";
import { isScrollLocked } from "../lib/scrollLock";

// Module-owned so a shell-branch reconciliation can never discard Back-state.
// App keeps ScrollManager in the same first-child slot across widget mode, but
// the store also survives a defensive unmount/remount during hot or host reloads.
const scrollOffsets = new Map<string, number>();

/**
 * The single scroll authority for the app (nav/IA redesign). Mounted once in
 * App, outside <Routes>, so it survives every navigation:
 *  - a fresh navigation (PUSH/REPLACE) lands at the top,
 *  - Back/Forward (POP) restores the place you were at,
 *  - a navigation that targets a verse (?v=) or anchor (#id) is left alone — the
 *    Reader's verse-focus or the anchor handler owns that scroll.
 * Renders nothing. Pairs with `history.scrollRestoration = "manual"` (main.tsx).
 */
export default function ScrollManager() {
  const location = useLocation();
  const navType = useNavigationType();
  const currentKey = useRef<string>(scrollEntryKey(location));
  const currentRouteKey = useRef<string>(scrollRouteKey(location));

  // Continuously remember the current entry's scroll position (one write per
  // frame) so a later Back can restore it.
  useEffect(() => {
    let raf = 0;
    const writeCurrent = () => {
      if (isScrollLocked()) return;
      const key = currentKey.current;
      // Entry and route fallback are two keys. The helper bounds each insert,
      // so adding both can never leak one extra key per navigation.
      rememberScrollOffset(scrollOffsets, key, window.scrollY);
      rememberScrollOffset(scrollOffsets, currentRouteKey.current, window.scrollY);
    };
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        // While a sheet pins the body, window.scrollY is 0 regardless of where
        // the page really was — recording it would make Back restore to top.
        writeCurrent();
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  // Position the window after each navigation (before paint).
  useLayoutEffect(() => {
    const entryKey = scrollEntryKey(location);
    currentKey.current = entryKey;
    const routeKey = scrollRouteKey(location);
    currentRouteKey.current = routeKey;
    const action = decideScroll(navType, hasScrollTarget(location.search, location.hash));
    if (action === "skip") {
      // A #hash anchor (a cross-page fragment link like /translations#rsv2ce)
      // scrolls into view once it exists; a ?v= verse is owned by the Reader.
      // scroll-margin-top (the --anchor-offset token) keeps it clear of the header.
      if (location.hash && location.hash !== "#") {
        const id = location.hash.slice(1);
        let cancelled = false;
        const start = performance.now();
        const tryAnchor = () => {
          if (cancelled) return;
          const el = document.getElementById(id);
          if (el) {
            el.scrollIntoView({ block: "start", behavior: "auto" });
            // Moving the viewport alone is invisible to assistive technology.
            // Cross-page anchors therefore become temporary programmatic focus
            // targets, while remaining outside the normal Tab order.
            if (!el.hasAttribute("tabindex")) el.setAttribute("tabindex", "-1");
            el.focus({ preventScroll: true });
            return;
          }
          if (performance.now() - start < 1000) requestAnimationFrame(tryAnchor);
        };
        requestAnimationFrame(tryAnchor);
        return () => {
          cancelled = true;
        };
      }
      return; // the ?v= verse owner scrolls
    }

    if (action === "top") {
      window.scrollTo(0, 0);
      return;
    }

    // action === "restore": the page may still be growing (async data — the
    // Reader, the Mass readings), so retry briefly until the saved offset is
    // reachable or a short budget elapses. Always instant (no animation).
    const target = scrollOffsets.get(entryKey) ?? scrollOffsets.get(routeKey) ?? 0;
    if (target <= 0) {
      window.scrollTo(0, 0);
      return;
    }
    let cancelled = false;
    let lastWritten = -1;
    let lastHeight = -1;
    const start = performance.now();
    const tryRestore = () => {
      if (cancelled) return;
      // The user took over scrolling — stop fighting them.
      if (lastWritten >= 0 && Math.abs(window.scrollY - lastWritten) > 2) return;
      const maxY = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
      const y = Math.min(target, maxY);
      window.scrollTo(0, y);
      lastWritten = y;
      const reached = y >= target - 1;
      const height = document.documentElement.scrollHeight;
      const growing = height !== lastHeight;
      lastHeight = height;
      // Keep retrying only while the page is still growing toward an unreached
      // target and within budget — never spin on a permanently-shorter page.
      if (!reached && growing && performance.now() - start < 1000) {
        requestAnimationFrame(tryRestore);
      }
    };
    tryRestore();
    return () => {
      cancelled = true;
    };
  }, [location, navType]);

  return null;
}
