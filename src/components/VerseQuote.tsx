import { useEffect, useState } from "react";
import { loadBook } from "../lib/data";
import { passageText } from "../lib/passage";
import { langAttr } from "../lib/translations";
import Skeleton from "./Skeleton";

interface Props {
  translation: string;
  book: string;
  chapter: number;
  verse: number;
  endVerse?: number;
  className?: string;
  /** Reports which translation's text actually rendered (the request, or the
   *  drc fallback), so the parent's citation and Reader link can follow the
   *  text instead of the ask (FID-FUNC-004). Pass a state setter — its stable
   *  identity keeps this out of the load effect's dependencies. Never feed
   *  the reported value back into the `translation` prop. */
  onShownTranslation?: (t: string) => void;
}

/**
 * Renders the verbatim text of a verse (or short range) from any translation,
 * falling back to the bundled Douay-Rheims when the requested one won't load —
 * the same convention the Reader and the Home-page share path follow.
 */
export default function VerseQuote({
  translation,
  book,
  chapter,
  verse,
  endVerse,
  className,
  onShownTranslation
}: Props) {
  const [text, setText] = useState<string | null>(null);
  // The translation whose text is actually on screen — it may be the drc
  // fallback, and the lang attribute must describe the text shown, not the ask.
  const [shownTranslation, setShownTranslation] = useState(translation);
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    setText(null);
    setShownTranslation(translation);
    setError(false);
    loadBook(translation, book)
      .then((data) => {
        if (!alive) return;
        setText(passageText(data, chapter, verse, endVerse));
        onShownTranslation?.(translation);
      })
      .catch(() => {
        // An import-only translation (NABRE, RSV-2CE, …) not yet imported
        // rejects here — the front page must never show a blank sacred card,
        // so fall back to the bundled Douay-Rheims like the Reader and
        // shareVotd do. Empty grid slots are handled below, not here.
        if (translation === "drc") {
          if (alive) setError(true);
          return;
        }
        loadBook("drc", book)
          .then((data) => {
            if (!alive) return;
            setShownTranslation("drc");
            setText(passageText(data, chapter, verse, endVerse));
            onShownTranslation?.("drc");
          })
          .catch(() => alive && setError(true));
      });
    return () => {
      alive = false;
    };
    // onShownTranslation is notification-only (a stable state setter);
    // re-running the load on a parent re-render would flash the skeleton.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [translation, book, chapter, verse, endVerse]);

  // A failure speaks plainly (and politely, via role="status") instead of the
  // old bare em dash — this renders on Today, the rosary sheet, and the embed.
  if (error)
    return (
      <p className={`${className ?? ""} muted small sans`.trim()} role="status">
        The verse couldn&rsquo;t be loaded — it will return with your connection.
      </p>
    );
  // Reserve the verse's height while it loads so the card never reflows on land.
  if (text === null) return <p className={className}><Skeleton lines={2} /></p>;
  // An empty grid slot is content truth (a versification gap), not a transition.
  if (!text.trim())
    return (
      <p className={`${className ?? ""} muted small sans`.trim()}>
        This passage is not numbered in this translation.
      </p>
    );
  // The quotation marks are gold (sacred); the verse text is not (spec §1.2).
  return (
    <p className={className} lang={langAttr(shownTranslation)}>
      <span className="quote-mark">“</span>
      {text}
      <span className="quote-mark">”</span>
    </p>
  );
}
