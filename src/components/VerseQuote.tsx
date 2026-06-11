import { useEffect, useState } from "react";
import { loadBook } from "../lib/data";

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
        const ch = data.chapters[chapter - 1] ?? [];
        const last = Math.min(endVerse ?? verse, ch.length);
        const parts = ch.slice(verse - 1, last);
        setText(parts.join(" "));
      })
      .catch(() => alive && setError(true));
    return () => {
      alive = false;
    };
  }, [translation, book, chapter, verse, endVerse]);

  if (error) return <p className={className}>—</p>;
  if (text === null) return <p className={`${className ?? ""} muted`}>…</p>;
  return <p className={className}>“{text}”</p>;
}
