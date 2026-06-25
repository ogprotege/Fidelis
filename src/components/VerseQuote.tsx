import { useEffect, useState } from "react";
import { loadBook } from "../lib/data";
import { passageText } from "../lib/passage";
import { getTranslation } from "../lib/translations";
import Skeleton from "./Skeleton";

interface Props {
  translation: string;
  book: string;
  chapter: number;
  verse: number;
  endVerse?: number;
  className?: string;
}

/** Renders the verbatim text of a verse (or short range) from a bundled translation. */
export default function VerseQuote({ translation, book, chapter, verse, endVerse, className }: Props) {
  const [text, setText] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    setText(null);
    setError(false);
    loadBook(translation, book)
      .then((data) => {
        if (!alive) return;
        setText(passageText(data, chapter, verse, endVerse));
      })
      .catch(() => alive && setError(true));
    return () => {
      alive = false;
    };
  }, [translation, book, chapter, verse, endVerse]);

  if (error) return <p className={className}>—</p>;
  // Reserve the verse's height while it loads so the card never reflows on land.
  if (text === null) return <p className={className}><Skeleton lines={2} /></p>;
  if (!text.trim()) return <p className={className}>—</p>;
  // The quotation marks are gold (sacred); the verse text is not (spec §1.2).
  const isLatin = getTranslation(translation)?.language === "la";
  return (
    <p className={className} lang={isLatin ? "la" : undefined}>
      <span className="quote-mark">“</span>
      {text}
      <span className="quote-mark">”</span>
    </p>
  );
}
