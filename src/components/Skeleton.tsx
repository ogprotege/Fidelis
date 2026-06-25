/** A quiet, motion-free loading placeholder (spec §9 polish): `lines` dim bars
 *  that reserve the height the async text will take, so the Today cards don't
 *  reflow when it lands. No shimmer by design — a prayer book, not an app, and
 *  reduced-motion-safe by construction. Decorative, so aria-hidden; the real
 *  text is announced once it arrives. The bars are sized in `em`, so they scale
 *  with the text size of whatever container they sit in. */
export default function Skeleton({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <span className={className ? `skeleton-lines ${className}` : "skeleton-lines"} aria-hidden="true">
      {Array.from({ length: lines }, (_, i) => (
        <span key={i} className="bar" />
      ))}
    </span>
  );
}
