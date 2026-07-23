import {
  ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState
} from "react";
import { isTopOverlay, pushOverlay, removeOverlay } from "../lib/overlays";
import { lockScroll, unlockScroll } from "../lib/scrollLock";
import Icon from "./Icon";

interface Props {
  /** id of the heading inside `children` that labels the dialog. */
  titleId: string;
  onClose: () => void;
  children: ReactNode;
  /** "sheet" (default) is a bottom sheet at every width. "panel" stays a bottom
   *  sheet on phones but docks to the right as a full-height side panel on
   *  desktop (≥640px) — the commentary study surface (spec §4.2). */
  variant?: "sheet" | "panel";
}

/**
 * A bottom-sheet modal: dimmed backdrop, Escape / backdrop-click / close button
 * to dismiss, focus moved into the panel and returned to the opener on close,
 * the body pinned (iOS-safe) so the page behind can't rubber-band, focus trapped
 * within. Paired restrained enter/exit transitions live in styles.css and honor
 * reduced motion. There is no drag handle because this dialog is not draggable.
 * The "panel" variant becomes a desktop side panel; all dialog/focus behavior
 * is identical (§4 commentary).
 */
export default function Sheet({ titleId, onClose, children, variant = "sheet" }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const closingRef = useRef(false);
  const [phase, setPhase] = useState<"entering" | "open" | "closing">("entering");
  // Keep the latest onClose without re-running the lock effect — re-running it
  // would re-pin the body and lose the saved scroll position on a parent render.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const requestClose = useCallback(() => {
    // State commits on the next React turn. The ref closes the small interval
    // in which two taps, Escape, or hardware Back could otherwise schedule two
    // teardown timers and advance the route beneath the dialog.
    if (closingRef.current || phase === "closing") return;
    closingRef.current = true;
    const reduce =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      onCloseRef.current();
      return;
    }
    setPhase("closing");
    closeTimer.current = setTimeout(() => onCloseRef.current(), 150);
  }, [phase]);
  const requestCloseRef = useRef(requestClose);
  requestCloseRef.current = requestClose;

  // Mount in the starting pose, then cross the frame boundary so both the
  // backdrop and panel receive a real CSS transition. Reduced motion collapses
  // the same state change to an effectively instant one in styles.css.
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      // A close can be requested between mount and this first frame. Do not
      // let the delayed entrance state overwrite the already-started exit.
      if (!closingRef.current) setPhase("open");
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  // A LAYOUT effect, deliberately: its cleanup (unlockScroll, which restores the
  // pre-lock scroll offset) must run in React's mutation phase, BEFORE
  // ScrollManager's layout effect positions the new page. As a passive effect,
  // navigating away while the sheet was open would scroll the destination page
  // to the departed page's offset after ScrollManager had already placed it.
  useLayoutEffect(() => {
    opener.current = document.activeElement as HTMLElement | null;
    // Register with the overlay stack so the Android hardware Back button (and the
    // app-root exit decision) closes this sheet first, before touching navigation.
    const overlayId = pushOverlay(() => requestCloseRef.current());
    // Freeze the page behind the scrim. The lock is shared and reference-counted
    // (lib/scrollLock): stacking sheets pin the body once and unpin it only when
    // the last one closes, so no open/close order can leave `position: fixed`
    // stranded on the body — the iOS "page won't scroll" bug.
    lockScroll();
    panelRef.current
      ?.querySelector<HTMLElement>('button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])')
      ?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (!isTopOverlay(overlayId)) return;
        e.preventDefault();
        e.stopImmediatePropagation();
        requestCloseRef.current();
        return;
      }
      if (e.key !== "Tab") return;
      // Exclude disabled controls: a disabled first/last element can never hold
      // focus, so keeping it as the trap boundary would let Tab escape the sheet.
      const f = panelRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])'
      );
      if (!f || f.length === 0) return;
      const first = f[0];
      const last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      removeOverlay(overlayId);
      document.removeEventListener("keydown", onKey);
      if (closeTimer.current) clearTimeout(closeTimer.current);
      unlockScroll();
      opener.current?.focus();
    };
    // Mount-once: the sheet locks the body and traps focus for its lifetime;
    // onClose is read through a ref so a parent re-render can't re-pin the body.
  }, []);

  return (
    <div
      className={`sheet-backdrop ${variant === "panel" ? "panel " : ""}${phase}`}
      onClick={requestClose}
    >
      <div
        className={variant === "panel" ? "sheet panel" : "sheet"}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        ref={panelRef}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="sheet-close"
          onClick={requestClose}
          aria-label="Close"
          title="Close"
        >
          <Icon name="close" />
        </button>
        {children}
      </div>
    </div>
  );
}
