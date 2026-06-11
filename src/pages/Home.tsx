import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import VerseQuote from "../components/VerseQuote";
import { getBook, bookDisplayName } from "../lib/canon";
import {
  DayReadings,
  READING_LABELS,
  formatCitation,
  readingsForDate,
  sundayCycle,
  weekdayCycle
} from "../lib/lectionary";
import { liturgicalDay, COLOR_HEX } from "../lib/liturgical";
import { mysteriesForDate } from "../lib/rosary";
import { getLastRead, getSettings } from "../lib/storage";
import { verseOfTheDay, formatVotdRef } from "../lib/votd";

export default function Home() {
  const today = new Date();
  const votd = verseOfTheDay(today);
  const votdBook = getBook(votd.book)!;
  const lit = liturgicalDay(today);
  const rosary = mysteriesForDate(today);
  const lastRead = getLastRead();
  const translation = getSettings().translation;
  const [mass, setMass] = useState<DayReadings | null>(null);
  useEffect(() => {
    readingsForDate(new Date()).then(setMass).catch(() => setMass(null));
  }, []);
  const dateLabel = today.toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  });

  const readerLink = (book: string, chapter: number, verse?: number) =>
    `/read/${translation}/${book}/${chapter}${verse ? `?v=${verse}` : ""}`;

  return (
    <>
      <h1 className="page-title">{dateLabel}</h1>
      <div className="widget-grid">
        <div className="card">
          <h2>✠ Verse of the Day</h2>
          <VerseQuote
            translation={translation}
            book={votd.book}
            chapter={votd.chapter}
            verse={votd.verse}
            endVerse={votd.endVerse}
            className="votd-text"
          />
          <div className="votd-ref">
            <Link to={readerLink(votd.book, votd.chapter, votd.verse)}>
              {formatVotdRef(votd, bookDisplayName(votdBook, translation))}
            </Link>
            {votd.book === "psalms" && " · Vulgate Psalm numbering"}
          </div>
        </div>

        <div className="card">
          <h2>
            Liturgical Day
            <span className="spacer" />
            <span
              className="lit-color-chip"
              style={{ background: COLOR_HEX[lit.color] }}
              title={`Liturgical color: ${lit.color}`}
            />
          </h2>
          <div className="lit-season">
            <strong>{lit.seasonLabel}</strong>
          </div>
          <div className="muted small sans">Season of {lit.season}</div>
          {lit.celebrations.map((c) => (
            <div className="lit-celebration" key={c.name}>
              <span className="rank">{c.rank}</span>
              {c.name}
            </div>
          ))}
        </div>

        <div className="card">
          <h2>Daily Mass Readings</h2>
          <div className="muted small sans" style={{ marginBottom: "0.4rem" }}>
            Sunday Cycle {sundayCycle(today)} · Weekday Year{" "}
            {weekdayCycle(today) === "1" ? "I" : "II"}
          </div>
          {!mass && <p className="muted small">…</p>}
          {mass && (
            <ul className="mass-list">
              {Object.entries(
                mass.rows.reduce<Record<number, typeof mass.rows>>((acc, row) => {
                  (acc[Math.floor(row.t)] ??= []).push(row);
                  return acc;
                }, {})
              ).map(([g, rows]) => {
                const row = rows[0];
                const book = getBook(row.b);
                if (!book) return null;
                return (
                  <li key={g}>
                    <span className="mass-label">{READING_LABELS[Number(g)] ?? "Reading"}</span>{" "}
                    {formatCitation(row, bookDisplayName(book, translation))}
                  </li>
                );
              })}
            </ul>
          )}
          <Link className="continue-cta" to="/readings">
            Read at Mass →
          </Link>
        </div>

        <div className="card">
          <h2>The Holy Rosary</h2>
          <div>
            Today's mysteries: <strong>The {rosary.name} Mysteries</strong>{" "}
            <span className="muted small">({rosary.latin})</span>
          </div>
          <ol className="rosary-list">
            {rosary.mysteries.map((m) => (
              <li key={m.title}>
                {m.title}
                <Link className="mref" to={readerLink(m.ref[0], m.ref[1], m.ref[2])}>
                  {getBook(m.ref[0])!.abbrev} {m.ref[1]}:{m.ref[2]}
                </Link>
              </li>
            ))}
          </ol>
        </div>

        <div className="card">
          <h2>Continue Reading</h2>
          {lastRead ? (
            <>
              <p>
                You were reading{" "}
                <strong>
                  {bookDisplayName(getBook(lastRead.book)!, lastRead.translation)}{" "}
                  {lastRead.chapter}
                </strong>
                .
              </p>
              <Link
                className="continue-cta"
                to={`/read/${lastRead.translation}/${lastRead.book}/${lastRead.chapter}`}
              >
                Continue →
              </Link>
            </>
          ) : (
            <>
              <p className="muted">
                Begin anywhere — the whole 73-book canon is here, unabridged and
                unaltered.
              </p>
              <Link className="continue-cta" to={`/read/${translation}/john/1`}>
                Start with the Gospel of John →
              </Link>
            </>
          )}
          <p className="small sans muted" style={{ marginTop: "0.9rem" }}>
            <Link to="/read">Browse all books</Link> ·{" "}
            <Link to="/search">Search the Scriptures</Link>
          </p>
        </div>
      </div>
    </>
  );
}
