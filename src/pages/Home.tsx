import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Antiphon from "../components/Antiphon";
import Icon from "../components/Icon";
import VerseQuote from "../components/VerseQuote";
import Sheet from "../components/Sheet";
import MysterySheet from "../components/MysterySheet";
import ShareSheet from "../components/ShareSheet";
import { getBook, bookDisplayName } from "../lib/canon";
import { loadBook } from "../lib/data";
import { passageText } from "../lib/passage";
import { getTranslation } from "../lib/translations";
import {
  DayReadings,
  READING_LABELS,
  formatCitation,
  readingsForDate,
  sundayCycle,
  weekdayCycle
} from "../lib/lectionary";
import { liturgicalDay, COLOR_HEX } from "../lib/liturgical";
import { DailyQuote, loadQuotes, quoteOfTheDay } from "../lib/quotes";
import { mysteriesForDate, Mystery } from "../lib/rosary";
import { getLastRead, activePlan } from "../lib/storage";
import { isComplete, todayPortion, planDay, planTotalDays, formatPortion } from "../lib/plans";
import { verseOfTheDay, formatVotdRef } from "../lib/votd";
import { useSettings } from "../SettingsContext";

/* The Today page never exceeds five cards (CLAUDE.md standing rule):
   1 Verse of the Day · 2 Quote of the Day · 3 Today in the Church
   (liturgical day + Mass readings + Marian antiphon, merged per spec §6)
   · 4 The Holy Rosary · 5 Continue Reading. */
export default function Home() {
  const today = new Date();
  const votd = verseOfTheDay(today);
  const votdBook = getBook(votd.book)!;
  const lit = liturgicalDay(today);
  const rosary = mysteriesForDate(today);
  const lastRead = getLastRead();
  const translation = useSettings().translation;
  const plan = activePlan();
  const planPortion = plan && !isComplete(plan) ? todayPortion(plan) : [];
  const [mass, setMass] = useState<DayReadings | null>(null);
  const [quote, setQuote] = useState<DailyQuote | null>(null);
  const [openMystery, setOpenMystery] = useState<Mystery | null>(null);
  const [share, setShare] = useState<
    { text: string; citation: string; source?: string; filename: string } | null
  >(null);
  useEffect(() => {
    readingsForDate(new Date()).then(setMass).catch(() => setMass(null));
    loadQuotes()
      .then((qs) => setQuote(quoteOfTheDay(qs, new Date(), liturgicalDay(new Date()))))
      .catch(() => setQuote(null));
  }, []);
  const dateLabel = today.toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  });

  const readerLink = (book: string, chapter: number, verse?: number) =>
    `/read/${translation}/${book}/${chapter}${verse ? `?v=${verse}` : ""}`;

  async function shareVotd() {
    const data = await loadBook(translation, votd.book);
    const text = passageText(data, votd.chapter, votd.verse, votd.endVerse);
    const ref = formatVotdRef(votd, bookDisplayName(votdBook, translation));
    const abbrev = getTranslation(translation)?.abbrev;
    setShare({
      text,
      citation: abbrev ? `${ref} · ${abbrev}` : ref,
      filename: `fidelis-${votd.book}-${votd.chapter}-${votd.verse}`
    });
  }

  function shareQuote(q: DailyQuote) {
    const work =
      q.work && q.work !== "—"
        ? q.locus && q.locus !== "—"
          ? `${q.work}, ${q.locus}`
          : q.work
        : undefined;
    setShare({ text: q.text, citation: q.author, source: work, filename: "fidelis-quote" });
  }

  return (
    <>
      <h1 className="page-title">{dateLabel}</h1>
      <div className="widget-grid">
        <div className="card">
          <h2><span className="cross"><Icon name="cross" /></span> Verse of the Day</h2>
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
          <button type="button" className="card-share" onClick={() => void shareVotd()}>
            <Icon name="share" /> Share
          </button>
        </div>

        <div className="card">
          <h2>Quote of the Day</h2>
          {!quote && <p className="muted small">…</p>}
          {quote && (
            <>
              <p className="qotd-text">{quote.text}</p>
              <div className="qotd-author">
                {quote.author}
                {quote.authorTitle && (
                  <span className="muted small sans"> · {quote.authorTitle}</span>
                )}
              </div>
              <div className="qotd-source muted small sans">
                <em>{quote.work}</em>
                {quote.locus !== "—" && <> {quote.locus}</>} · {quote.sourceEdition}
              </div>
              <button type="button" className="card-share" onClick={() => shareQuote(quote)}>
                <Icon name="share" /> Share
              </button>
            </>
          )}
        </div>

        <div className="card">
          <h2>
            Today in the Church
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
          <div className="muted small sans">
            Season of {lit.season} · Sunday Cycle {sundayCycle(today)} · Weekday Year{" "}
            {weekdayCycle(today) === "1" ? "I" : "II"}
          </div>
          {lit.celebrations.map((c) => (
            <div className="lit-celebration" key={c.name}>
              <span className="rank">{c.rank}</span>
              {c.name}
            </div>
          ))}
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
          <Antiphon season={lit.season} />
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
                <button
                  type="button"
                  className="rosary-mystery"
                  onClick={() => setOpenMystery(m)}
                  aria-haspopup="dialog"
                >
                  <span className="rosary-title">{m.title}</span>
                  <span className="mref">
                    {getBook(m.ref[0])!.abbrev} {m.ref[1]}:{m.ref[2]}
                    {m.end && m.end !== m.ref[2] ? `–${m.end}` : ""}
                  </span>
                </button>
              </li>
            ))}
          </ol>
        </div>

        <div className="card">
          <h2>Continue Reading</h2>
          {plan && planPortion.length > 0 && (
            <p className="plan-line">
              <Link to={`/read/${translation}/${planPortion[0]}`}>
                Today's reading · {formatPortion(planPortion, translation)} · Day {planDay(plan)} of{" "}
                {planTotalDays(plan)}
              </Link>
            </p>
          )}
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

        {openMystery && (
          <Sheet titleId="mystery-sheet-title" onClose={() => setOpenMystery(null)}>
            <MysterySheet
              mystery={openMystery}
              translation={translation}
              titleId="mystery-sheet-title"
            />
          </Sheet>
        )}

        {share && (
          <Sheet titleId="share-sheet-title" onClose={() => setShare(null)}>
            <ShareSheet
              titleId="share-sheet-title"
              text={share.text}
              citation={share.citation}
              source={share.source}
              filename={share.filename}
            />
          </Sheet>
        )}
      </div>
    </>
  );
}
