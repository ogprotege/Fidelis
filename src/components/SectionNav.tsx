import type { MouseEvent } from "react";

interface Section {
  /** The id of the heading/section element to jump to. */
  id: string;
  label: string;
}

interface Props {
  sections: Section[];
}

/**
 * A sticky in-page "jump bar" for long pages (nav/IA redesign), so a screen is a
 * single *navigable* page rather than an endless scroll. Renders purple anchor
 * buttons (purple acts) that scroll the matching section into view, honoring the
 * shared --anchor-offset (scroll-margin-top) and prefers-reduced-motion, plus a
 * trailing "Top". It changes no URL (clean under HashRouter); the targets just
 * need a matching id. Sits just under the sticky header (--header-h).
 */
export default function SectionNav({ sections }: Props) {
  const behaviorFor = (event: MouseEvent<HTMLButtonElement>): ScrollBehavior => {
    const reduce =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Keyboard activation has detail 0. It should be immediate even when the
    // pointer treatment uses a restrained smooth scroll.
    return reduce || event.detail === 0 ? "auto" : "smooth";
  };

  const jump = (id: string, event: MouseEvent<HTMLButtonElement>) => {
    const behavior = behaviorFor(event);
    document.getElementById(id)?.scrollIntoView({ behavior, block: "start" });
    if (event.detail === 0) {
      const target = document.getElementById(id);
      if (target) {
        if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
        target.focus({ preventScroll: true });
      }
    }
  };

  if (sections.length === 0) return null;

  return (
    <nav className="section-nav" aria-label="On this page">
      {sections.map((s) => (
        <button
          key={s.id}
          type="button"
          className="section-nav-link"
          onClick={(event) => jump(s.id, event)}
        >
          {s.label}
        </button>
      ))}
      <button
        type="button"
        className="section-nav-link section-nav-top"
        onClick={(event) => {
          window.scrollTo({ top: 0, behavior: behaviorFor(event) });
          if (event.detail === 0) document.getElementById("main")?.focus({ preventScroll: true });
        }}
      >
        Top
      </button>
    </nav>
  );
}
