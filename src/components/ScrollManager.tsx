import { useEffect, useLayoutEffect, useRef } from "react";
import { useLocation, useNavigationType } from "react-router-dom";
import { decideScroll, hasScrollTarget } from "../lib/scroll";

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
  const offsets = useRef<Map<string, number>>(new Map());
  const currentKey = useRef<string>(location.key);

  // Continuously remember the current entry's scroll position (one write per
  // frame) so a later Back can restore it.
  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const m = offsets.current;
        const key = currentKey.current;
        // Bound the map in the long-lived native shell: evict the oldest entry
        // only when a brand-new history key first appears (updates are free).
        if (!m.has(key) && m.size >= 50) {
          const oldest = m.keys().next().value;
          if (oldest !== undefined) m.delete(oldest);
        }
        m.set(key, window.scrollY);
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
    currentKey.current = location.key;
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
            el.scrollIntoView();
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
    const target = offsets.current.get(location.key) ?? 0;
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
  }, [location.key, navType, location.search, location.hash]);

  return null;
}
