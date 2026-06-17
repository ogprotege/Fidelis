import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { bookDisplayName, getBook } from "../lib/canon";
import { BookData, loadBook } from "../lib/data";
import { LectionaryRow, formatCitation, hebrewSpanToVulgate } from "../lib/lectionary";
import { getTranslation } from "../lib/translations";

interface Props {
  row: LectionaryRow;
  translation: string;
  label?: string;
}

/** Renders one lectionary reading: citation, verbatim text, link into the reader.
 *  If the chosen translation is import-only (e.g. the NABRE) and the user has not
 *  imported it, the reading falls back to the bundled Douay-Rheims so it stays
 *  readable, with a pointer to import the licensed text. */
export default function ReadingText({ row, translation, label }: Props) {
  const [verses, setVerses] = useState<{ ch: number; v: number; text: string }[] | null>(null);
  const [error, setError] = useState(false);
  // The translation actually rendered (may differ from `translation` after a
  // fallback) — keeps the citation link and lang attribute honest.
  const [shownTranslation, setShownTranslation] = useState(translation);
  // The abbrev we fell back FROM (e.g. "NABRE"), or null when none.
  const [fellBackFrom, setFellBackFrom] = useState<string | null>(null);
  const book = getBook(row.b);
  const isPsalm = row.b === "psalms";

  useEffect(() => {
    let alive = true;
    setVerses(null);
    setError(false);
    setFellBackFrom(null);
    setShownTranslation(translation);

    const build = (data: BookData) => {
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
        // Some translations pack a verse into the previous grid slot; if a span
        // lands only on empty slots, the text lives one slot back.
        if (got.length && got.every((x) => !x.text?.trim()) && spans[0][1] > 1) {
          got = collect(spans[0][0], spans[0][1] - 1, spans[0][2]);
        }
        for (const x of got) {
          if (x.text?.trim() && !out.some((o) => o.ch === x.ch && o.v === x.v)) {
            out.push(x);
          }
        }
      }
      return out;
    };

    const tryLoad = (id: string, fallbackFrom: string | null) =>
      loadBook(id, row.b).then((data) => {
        if (!alive) return;
        setVerses(build(data));
        setShownTranslation(id);
        setFellBackFrom(fallbackFrom);
      });

    tryLoad(translation, null).catch(() => {
      const t = getTranslation(translation);
      // A non-bundled translation the user hasn't imported (e.g. the NABRE before
      // import): show the bundled Douay-Rheims so the reading stays readable, and
      // point the way to import the licensed text.
      if (alive && t && !t.bundled && translation !== "drc") {
        tryLoad("drc", t.abbrev).catch(() => alive && setError(true));
      } else if (alive) {
        setError(true);
      }
    });

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
        <Link to={`/read/${shownTranslation}/${row.b}/${firstCh}?v=${firstV}`}>
          {formatCitation(row, bookDisplayName(book, shownTranslation))}
        </Link>
        {row.partial && (
          <span className="muted small" title="The lectionary subdivides verses here; full verses are shown.">
            {" "}
            (approx.)
          </span>
        )}
      </div>
      {error && <p className="muted small">Text unavailable in this translation.</p>}
      {!error && verses === null && <p className="loading-inline small">Loading…</p>}
      {fellBackFrom && (
        <p className="muted small sans">
          The U.S. lectionary uses the {fellBackFrom}, which is under copyright and not
          bundled. Showing the Douay-Rheims here —{" "}
          <Link to="/translations">import your licensed {fellBackFrom}</Link> to read the
          lectionary text in the app.
        </p>
      )}
      {verses && (
        <p className="reading-body" lang={getTranslation(shownTranslation)?.language === "la" ? "la" : undefined}>
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
