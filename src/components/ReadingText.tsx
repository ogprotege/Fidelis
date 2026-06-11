import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { bookDisplayName, getBook } from "../lib/canon";
import { loadBook } from "../lib/data";
import { LectionaryRow, formatCitation, hebrewToVulgatePsalm } from "../lib/lectionary";

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
        for (const [chRaw, v1, v2] of row.s) {
          const ch = isPsalm ? hebrewToVulgatePsalm(chRaw) : chRaw;
          const chapter = data.chapters[ch - 1];
          if (!chapter) continue;
          const last = Math.min(v2 === 999 ? chapter.length : v2, chapter.length);
          for (let v = Math.min(v1, chapter.length); v <= last; v++) {
            if (!out.some((x) => x.ch === ch && x.v === v)) {
              out.push({ ch, v, text: chapter[v - 1] });
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
  const firstCh = isPsalm ? hebrewToVulgatePsalm(row.s[0][0]) : row.s[0][0];

  return (
    <div className="reading">
      {label && <div className="reading-label">{label}</div>}
      <div className="reading-citation">
        <Link to={`/read/${translation}/${row.b}/${firstCh}?v=${row.s[0][1]}`}>
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
