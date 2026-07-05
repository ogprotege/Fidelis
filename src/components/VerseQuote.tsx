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
}

/**
 * Renders the verbatim text of a verse (or short range) from any translation,
 * falling back to the bundled Douay-Rheims when the requested one won't load —
 * the same convention the Reader and the Home-page share path follow.
 */
export default function VerseQuote({ translation, book, chapter, verse, endVerse, className }: Props) {
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
          })
          .catch(() => alive && setError(true));
      });
    return () => {
      alive = false;
    };
  }, [translation, book, chapter, verse, endVerse]);

  if (error) return <p className={className}>—</p>;
  // Reserve the verse's height while it loads so the card never reflows on land.
  if (text === null) return <p className={className}><Skeleton lines={2} /></p>;
  if (!text.trim()) return <p className={className}>—</p>;
  // The quotation marks are gold (sacred); the verse text is not (spec §1.2).
  return (
    <p className={className} lang={langAttr(shownTranslation)}>
      <span className="quote-mark">“</span>
      {text}
      <span className="quote-mark">”</span>
    </p>
  );
}
