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
  const reduce =
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const behavior: ScrollBehavior = reduce ? "auto" : "smooth";

  const jump = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior, block: "start" });
  };

  if (sections.length === 0) return null;

  return (
    <nav className="section-nav" aria-label="On this page">
      {sections.map((s) => (
        <button key={s.id} type="button" className="section-nav-link" onClick={() => jump(s.id)}>
          {s.label}
        </button>
      ))}
      <button
        type="button"
        className="section-nav-link section-nav-top"
        onClick={() => window.scrollTo({ top: 0, behavior })}
      >
        Top
      </button>
    </nav>
  );
}
