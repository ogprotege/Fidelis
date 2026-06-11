import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { bookDisplayName, getBook } from "../lib/canon";
import { loadBook } from "../lib/data";
import { LectionaryRow, formatCitation, hebrewSpanToVulgate } from "../lib/lectionary";

interface Props {
  row: LectionaryRow;
  translation: string;
  label?: string;
}

/** Renders one lectionary reading: citation, verbatim text, link into the reader. */
export default function ReadingText({ row, translation, label }: Props) {
  const [verses, setVerses] = useState<{ ch: number; v: number; text: string }[] | null>(null);
  const [error, setError] = useState(false);
  const book = getBook(row.b);
  const isPsalm = row.b === "psalms";

  useEffect(() => {
    let alive = true;
    setVerses(null);
    setError(false);
    loadBook(translation, row.b)
      .then((data) => {
        if (!alive) return;
        const out: { ch: number; v: number; text: string }[] = [];
        const collect = (ch: number, v1: number, v2: number) => {
          const got: { ch: number; v: number; text: string }[] = [];
          const chapter = data.chapters[ch - 1];
          if (!chapter) return got;
          const last = Math.min(v2 === 999 ? chapter.length : v2, chapter.length);
          for (let v = Math.min(v1, chapter.length); v <= last; v++) {
            got.push({ ch, v, text: chapter[v - 1] });
          }
          return got;
        };
        for (const span of row.s) {
          const spans = isPsalm ? hebrewSpanToVulgate(...span) : [span];
          let got = spans.flatMap((s) => collect(...s));
          // Some translations pack a verse into the previous grid slot; if a
          // span lands only on empty slots, the text lives one slot back.
          if (got.length && got.every((x) => !x.text?.trim()) && spans[0][1] > 1) {
            got = collect(spans[0][0], spans[0][1] - 1, spans[0][2]);
          }
          for (const x of got) {
            if (x.text?.trim() && !out.some((o) => o.ch === x.ch && o.v === x.v)) {
              out.push(x);
            }
          }
        }
        setVerses(out);
      })
      .catch(() => alive && setError(true));
    return () => {
      alive = false;
    };
  }, [translation, row, isPsalm]);

  if (!book) return null;
  const [firstCh, firstV] = isPsalm ? hebrewSpanToVulgate(...row.s[0])[0] : row.s[0];

  return (
    <div className="reading">
      {label && <div className="reading-label">{label}</div>}
      <div className="reading-citation">
        <Link to={`/read/${translation}/${row.b}/${firstCh}?v=${firstV}`}>
          {formatCitation(row, bookDisplayName(book, translation))}
        </Link>
        {row.partial && (
          <span className="muted small" title="The lectionary subdivides verses here; full verses are shown.">
            {" "}
            (approx.)
          </span>
        )}
      </div>
      {error && <p className="muted small">Text unavailable in this translation.</p>}
      {!error && verses === null && <p className="muted small">…</p>}
      {verses && (
        <p className="reading-body">
          {verses.map(({ ch, v, text }) => (
            <span key={`${ch}-${v}`}>
              <sup className="vnum">{v}</sup>
              {text}{" "}
            </span>
          ))}
        </p>
      )}
    </div>
  );
}
