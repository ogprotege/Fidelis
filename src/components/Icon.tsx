import type { ReactNode } from "react";

/**
 * Spec §1.5 — the six-piece inline SVG icon set that replaces the emoji glyphs
 * (⚑ ✎ ☾/☀ ⧉ ✠), which render inconsistently across platforms.
 *
 * Drawn in a single stroke weight on a 24×24 grid. `stroke="currentColor"` is
 * the whole trick: each icon takes the color of its context, so the two-accent
 * rule (§1.2) colors it for free — gold where it honors or marks state (the
 * cross, a bookmarked/annotated verse), the neutral text/accent color where it
 * acts (a toolbar button, the theme toggle). Decorative by default (the call
 * site already carries a text label or aria-label); pass `title` to render a
 * standalone, labelled icon.
 */

export type IconName =
  | "bookmark"
  | "note"
  | "share"
  | "commentary"
  | "sun"
  | "moon"
  | "cross";

const PATHS: Record<IconName, ReactNode> = {
  bookmark: <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />,
  note: <path d="M17 3a2.83 2.83 0 0 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />,
  share: (
    <>
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" />
    </>
  ),
  commentary: (
    <>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      <path d="M8 8h8M8 12h5" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </>
  ),
  moon: <path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z" />,
  cross: <path d="M12 3v18M6.5 8.5h11" />
};

interface IconProps {
  name: IconName;
  className?: string;
  /** When given, the icon stands alone and is announced to assistive tech. */
  title?: string;
}

export default function Icon({ name, className, title }: IconProps) {
  return (
    <svg
      className={className ? `icon ${className}` : "icon"}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
    >
      {title ? <title>{title}</title> : null}
      {PATHS[name]}
    </svg>
  );
}
