import { ReactNode, useEffect, useRef } from "react";

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
    // iOS WKWebView ignores body overflow:hidden for touch dragging, so the page
    // behind the scrim still rubber-bands. Pin the body and offset it by the
    // current scroll to truly freeze it; restore the scroll on close.
    const scrollY = window.scrollY;
    const body = document.body;
    const prev = {
      overflow: body.style.overflow,
      position: body.style.position,
      top: body.style.top,
      width: body.style.width
    };
    body.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.width = "100%";
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
      document.removeEventListener("keydown", onKey);
      body.style.overflow = prev.overflow;
      body.style.position = prev.position;
      body.style.top = prev.top;
      body.style.width = prev.width;
      window.scrollTo(0, scrollY);
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
          ✕
        </button>
        {children}
      </div>
    </div>
  );
}
