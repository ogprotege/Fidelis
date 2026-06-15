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
 * body scroll locked, focus trapped within. No motion — a prayer book, not a
 * toy (standing rule 3). The "panel" variant becomes a desktop side panel; all
 * dialog/focus behavior is identical (§4 commentary).
 */
export default function Sheet({ titleId, onClose, children, variant = "sheet" }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const opener = useRef<HTMLElement | null>(null);

  useEffect(() => {
    opener.current = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current
      ?.querySelector<HTMLElement>('button, [href], [tabindex]:not([tabindex="-1"])')
      ?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
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
      document.body.style.overflow = prevOverflow;
      opener.current?.focus();
    };
  }, [onClose]);

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
