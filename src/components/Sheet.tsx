import { ReactNode, useEffect, useRef } from "react";
import { pushOverlay, removeOverlay } from "../lib/overlays";
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
 * within. A single restrained entrance and an iOS grabber handle on phones (both
 * in styles.css, reduced-motion-gated) — a prayer book, not a toy (standing rule
 * 3). The "panel" variant becomes a desktop side panel; all dialog/focus
 * behavior is identical (§4 commentary).
 */
export default function Sheet({ titleId, onClose, children, variant = "sheet" }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  // Keep the latest onClose without re-running the lock effect — re-running it
  // would re-pin the body and lose the saved scroll position on a parent render.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    opener.current = document.activeElement as HTMLElement | null;
    // Register with the overlay stack so the Android hardware Back button (and the
    // app-root exit decision) closes this sheet first, before touching navigation.
    const overlayId = pushOverlay(() => onCloseRef.current());
    // Freeze the page behind the scrim. The lock is shared and reference-counted
    // (lib/scrollLock): stacking sheets pin the body once and unpin it only when
    // the last one closes, so no open/close order can leave `position: fixed`
    // stranded on the body — the iOS "page won't scroll" bug.
    lockScroll();
    panelRef.current
      ?.querySelector<HTMLElement>('button, [href], [tabindex]:not([tabindex="-1"])')
      ?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab") return;
      const f = panelRef.current?.querySelectorAll<HTMLElement>(
        'button, [href], input, summary, [tabindex]:not([tabindex="-1"])'
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
      unlockScroll();
      opener.current?.focus();
    };
    // Mount-once: the sheet locks the body and traps focus for its lifetime;
    // onClose is read through a ref so a parent re-render can't re-pin the body.
  }, []);

  return (
    <div className={variant === "panel" ? "sheet-backdrop panel" : "sheet-backdrop"} onClick={onClose}>
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
          onClick={onClose}
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
