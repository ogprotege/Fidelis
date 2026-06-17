import { useEffect, useRef, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { pushOverlay, removeOverlay } from "../lib/overlays";

/**
 * Spec §2.1 — the five-tab navigation.
 *
 *   Today · Read · Search · Mass · More
 *
 * One component, two presentations driven entirely by CSS (no router changes):
 * the header row on wide viewports, a bottom tab bar pinned to the screen edge
 * on phones (`.tabbar` in styles.css). "More" is a popover over the four
 * secondary destinations — Library, Translations, Settings, About — not a route
 * of its own, so the URL space is unchanged. The popover drops down under the
 * header link on desktop and rises above the bottom bar on phones.
 *
 * Purple acts (§1.2): the active tab — and the More button while you are on one
 * of its routes — colors in --purple via `.nav a.active` / `.more-btn.active`.
 */

const MORE = [
  { to: "/library", label: "Library" },
  { to: "/translations", label: "Translations" },
  { to: "/settings", label: "Settings" },
  { to: "/about", label: "About" }
] as const;

export default function TabBar() {
  const [open, setOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const location = useLocation();

  const onMoreRoute = MORE.some((m) => location.pathname.startsWith(m.to));

  // Any tab or menu tap navigates; close the popover when the route changes.
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  // While open, dismiss on an outside pointer or Escape; Escape returns focus
  // to the trigger so keyboard users are not stranded.
  useEffect(() => {
    if (!open) return;
    // Register as an overlay so the Android Back button closes the popover first.
    const overlayId = pushOverlay(() => setOpen(false));
    // Move focus into the menu (mirrors the Sheet's initial focus) for keyboard
    // and screen-reader users.
    moreRef.current?.querySelector<HTMLElement>(".more-menu a")?.focus();
    const onPointer = (e: PointerEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        btnRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      removeOverlay(overlayId);
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <nav className="nav tabbar" aria-label="Primary">
      <NavLink to="/" end>Today</NavLink>
      <NavLink to="/read">Read</NavLink>
      <NavLink to="/search">Search</NavLink>
      <NavLink to="/readings">Mass</NavLink>
      <div className="more" ref={moreRef}>
        <button
          ref={btnRef}
          type="button"
          className={onMoreRoute ? "more-btn active" : "more-btn"}
          aria-expanded={open}
          // Only reference the popover while it is in the DOM; aria-expanded
          // already carries the collapsed state. The .active class (not
          // aria-current) marks the More button visually when you are on one of
          // its routes — the live page's aria-current="page" belongs to the menu
          // NavLink, so only one element claims it.
          aria-controls={open ? "tabbar-more-menu" : undefined}
          onClick={() => setOpen((v) => !v)}
        >
          More
          <svg
            className="icon more-caret"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.6}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
        {open && (
          <div className="more-menu" id="tabbar-more-menu">
            {MORE.map((m) => (
              <NavLink key={m.to} to={m.to}>
                {m.label}
              </NavLink>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
}
