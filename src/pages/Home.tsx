import { useEffect, useState } from "react";
import { Link } from "react-router";
import Antiphon from "../components/Antiphon";
import Icon from "../components/Icon";
import VerseQuote from "../components/VerseQuote";
import Skeleton from "../components/Skeleton";
import Sheet from "../components/Sheet";
import MysterySheet from "../components/MysterySheet";
import ShareSheet from "../components/ShareSheet";
import { getBook, bookDisplayName } from "../lib/canon";
import { loadBook, loadSaints, loadHistory } from "../lib/data";
import { dayKey } from "../lib/dateKey";
import { SaintDay, saintForCelebration } from "../lib/saints";
import { HistoryDay, leadHistoryEvent } from "../lib/history";
import { passageText } from "../lib/passage";
import { getTranslation } from "../lib/translations";
import {
  DayReadings,
  READING_LABELS,
  formatLectionaryCitation,
  readingsForDate,
  sundayCycle,
  weekdayCycle
} from "../lib/lectionary";
import { liturgicalDay, COLOR_HEX, currentCalendarProfile } from "../lib/liturgical";
import { DailyQuote, loadQuotes, quoteOfTheDay } from "../lib/quotes";
import { mysteriesForDate, Mystery } from "../lib/rosary";
import { getLastRead, activePlan } from "../lib/storage";
import { isComplete, todayPortion, planDay, planTotalDays, formatPortion } from "../lib/plans";
import { verseOfTheDay, formatVotdRef } from "../lib/votd";
import { useSettings } from "../SettingsContext";
import { useToday } from "../useToday";

/** The saint's initial for the medallion — leading honorifics and Marian/office
 *  prefixes dropped so "St. Bonaventure" → "B", "Our Lady of Mount Carmel" → "M". */
function monogram(name: string): string {
  const stripped = name.replace(
    /^(Sts?\.?|Ss\.?|Bl\.?|Bd\.?|Pope|The|Our Lady of the|Our Lady of)\s+/i,
    ""
  );
  return (stripped.trim()[0] || name.trim()[0] || "S").toUpperCase();
}

/* The Today page holds at most six cards (CLAUDE.md standing rule 2 — raised from
   five in v1.18.0 for Today in Church History):
   1 "Today at Mass" (liturgical day + Mass readings + Marian antiphon, merged per
   spec §6; its memorial name also links to the Saint of the Day) — the time-sensitive
   card leads on a phone, right under the date · 2 "Today in the Church" (the Saint
   of the Day leads with a monogram medallion, the day's Church-history event follows) ·
   3 Verse of the Day · 4 Quote of the Day · 5 The Holy Rosary · 6 Continue Reading.
   (The Mass card was titled "Today in the Church" through v1.18.x; it moved to the
   widget-consistent "Today at Mass" in v1.19.0 so the saints/history card could take
   the "Today in the Church" banner — resolving the old near-duplicate with the
   history card's title.) */
export default function Home() {
  // Live "today": rolls at local midnight and on foreground resume, so a phone
  // that keeps Fidelis resident overnight never shows yesterday's page.
  const today = useToday();
  const votd = verseOfTheDay(today);
  const votdBook = getBook(votd.book)!;
  const settings = useSettings();
  const lit = liturgicalDay(
    today,
    settings.calendarProfile,
    settings.individualChurchProper
  );
  const rosary = mysteriesForDate(today);
  const lastRead = getLastRead();
  const translation = settings.translation;
  const plan = activePlan();
  const planPortion = plan && !isComplete(plan) ? todayPortion(plan) : [];
  const [mass, setMass] = useState<DayReadings | null>(null);
  // Mirror quoteFailed: the Mass list must never look complete while missing,
  // nor leave the skeleton shimmering forever (audit FID-FUNC-006).
  const [massFailed, setMassFailed] = useState(false);
  const [massRetry, setMassRetry] = useState(0);
  const [quote, setQuote] = useState<DailyQuote | null>(null);
  // Distinguish "still loading" (skeleton) from "failed" (a quiet notice) —
  // otherwise an offline load leaves the skeleton shimmering forever.
  const [quoteFailed, setQuoteFailed] = useState(false);
  // Today in Church History: four honest states. "empty" (a resolved null — no
  // entry yet in the growing corpus) is calm, not a failure (the memory of the just).
  const dayToday = dayKey(today);
  const [history, setHistory] = useState<HistoryDay | null>(null);
  const [historyState, setHistoryState] = useState<"loading" | "ready" | "empty" | "failed">(
    "loading"
  );
  // Today's saints — both the Mass card's memorial-name link and the "Today in
  // the Church" card's Saint of the Day read this. saintLoaded distinguishes
  // "still loading" from "no saint today" so the card's empty/divider logic is
  // honest even when the two loads resolve at different times; saintFailed
  // distinguishes a transport failure from genuine absence (every date has a
  // saint since v1.20.0, so a swallowed failure would make the calm
  // "being gathered" line below a false statement).
  const [saintDay, setSaintDay] = useState<SaintDay | null>(null);
  const [saintLoaded, setSaintLoaded] = useState(false);
  const [saintFailed, setSaintFailed] = useState(false);
  const [openMystery, setOpenMystery] = useState<Mystery | null>(null);
  const [share, setShare] = useState<
    { text: string; citation: string; source?: string; filename: string } | null
  >(null);
  // The translation whose text the VOTD card actually shows (VerseQuote may
  // fall back to drc) — the citation and Reader link must follow the text,
  // never an unavailable ask (FID-FUNC-004).
  const [votdShown, setVotdShown] = useState(translation);
  // The Mass load stands alone so "Try again" can re-fire it without touching
  // the quote. A RESOLVED null (a date outside the bundled window) settles as
  // failed too — only .catch would leave the skeleton shimmering forever.
  // loadLectionary never memoizes a rejection, so a retry is a real fetch.
  useEffect(() => {
    let alive = true;
    setMass(null);
    setMassFailed(false);
    readingsForDate(
      today,
      settings.calendarProfile,
      settings.lectionaryPackId,
      settings.individualChurchProper
    )
      .then((m) => {
        if (!alive) return;
        if (m) setMass(m);
        else setMassFailed(true);
      })
      .catch(() => alive && setMassFailed(true));
    return () => {
      alive = false;
    };
  }, [
    today,
    massRetry,
    settings.calendarProfile,
    settings.individualChurchProper,
    settings.lectionaryPackId
  ]);

  useEffect(() => {
    let alive = true;
    setQuoteFailed(false);
    loadQuotes()
      .then(
        (qs) =>
          alive && setQuote(
            quoteOfTheDay(qs, today, (d) => liturgicalDay(d), currentCalendarProfile())
          )
      )
      .catch(() => {
        if (alive) {
          setQuote(null);
          setQuoteFailed(true);
        }
      });
    return () => {
      alive = false;
    };
    // Re-resolve when the day rolls (midnight / foreground resume).
  }, [today]);

  useEffect(() => {
    let alive = true;
    setHistory(null);
    setHistoryState("loading");
    loadHistory(dayToday)
      .then((h) => {
        if (!alive) return;
        if (h && h.events.length) {
          setHistory(h);
          setHistoryState("ready");
        } else {
          setHistoryState("empty");
        }
      })
      .catch(() => alive && setHistoryState("failed"));
    setSaintDay(null);
    setSaintLoaded(false);
    setSaintFailed(false);
    loadSaints(dayToday)
      .then((s) => {
        if (alive) {
          setSaintDay(s);
          setSaintLoaded(true);
        }
      })
      .catch(() => {
        if (alive) {
          setSaintDay(null);
          setSaintLoaded(true);
          setSaintFailed(true);
        }
      });
    return () => {
      alive = false;
    };
  }, [dayToday]);

  const dateLabel = today.toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  });

  const readerLink = (book: string, chapter: number, verse?: number, t: string = translation) =>
    `/read/${t}/${book}/${chapter}${verse ? `?v=${verse}` : ""}`;

  async function shareVotd() {
    // An import-only translation that isn't imported (or an offline miss) must
    // not turn the Share tap into a silent no-op — fall back to the bundled
    // Douay-Rheims, the same fallback the Reader uses, and cite it honestly.
    let shareTranslation = translation;
    let data;
    try {
      data = await loadBook(translation, votd.book);
    } catch {
      shareTranslation = "drc";
      try {
        data = await loadBook(shareTranslation, votd.book);
      } catch {
        return; // offline with nothing cached — leave the page unchanged
      }
    }
    const text = passageText(data, votd.chapter, votd.verse, votd.endVerse);
    const ref = formatVotdRef(votd, bookDisplayName(votdBook, shareTranslation));
    const abbrev = getTranslation(shareTranslation)?.abbrev;
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

  // The Church card's saint lead — also the subject the history lead must NOT
  // restate (leadHistoryEvent skips an event about the same saint when the day
  // has another to offer).
  const cardSaint =
    saintDay && saintDay.saints.length > 0
      ? (saintForCelebration(saintDay.saints, lit.celebrations.map((c) => c.name)) ??
        saintDay.saints[0])
      : null;

  return (
    <>
      <h1 className="page-title">Today</h1>
      <p className="subtitle">{dateLabel}</p>
      <div className="widget-grid">
        <div className="card">
          <h2>
            Today at Mass
            <span className="spacer" />
            <span
              className="lit-color-chip"
              style={{ background: COLOR_HEX[lit.color] }}
              title={`Liturgical color: ${lit.color}`}
              aria-hidden="true"
            />
            <span className="sr-only">Liturgical color: {lit.color}</span>
          </h2>
          <div className="lit-season">
            <strong>{lit.seasonLabel}</strong>
          </div>
          <div className="muted small sans">
            Season of {lit.season} · Sunday Cycle {sundayCycle(today)} · Weekday Year{" "}
            {weekdayCycle(today) === "1" ? "I" : "II"}
          </div>
          {lit.celebrations.map((c) => {
            const s = saintDay ? saintForCelebration(saintDay.saints, [c.name]) : null;
            return s ? (
              <Link
                className="lit-celebration lit-celebration-link"
                key={c.name}
                to={`/saint/${dayToday}/${s.id}`}
              >
                <span className="rank">{c.rank}</span>
                {c.name}
                <span className="lit-celebration-go" aria-hidden="true">›</span>
                <span className="sr-only"> — read the life of {s.name}</span>
              </Link>
            ) : (
              <div className="lit-celebration" key={c.name}>
                <span className="rank">{c.rank}</span>
                {c.name}
              </div>
            );
          })}
          {lit.alternatives.map((c) => {
            const s = saintDay ? saintForCelebration(saintDay.saints, [c.name]) : null;
            const alternativeType = c.rank === "Commemoration" ? "Commemoration" : "Optional";
            return s ? (
              <Link
                className="lit-celebration lit-celebration-link lit-alternative"
                key={`alternative-${c.id}`}
                to={`/saint/${dayToday}/${s.id}`}
              >
                <span className="rank">{alternativeType}</span>
                {c.name}
                <span className="lit-celebration-go" aria-hidden="true">›</span>
                <span className="sr-only">
                  {c.rank === "Commemoration"
                    ? " — permitted commemoration; read the life of "
                    : " — lawful optional memorial; read the life of "}
                  {s.name}
                </span>
              </Link>
            ) : (
              <div className="lit-celebration lit-alternative" key={`alternative-${c.id}`}>
                <span className="rank">{alternativeType}</span>
                {c.name}
              </div>
            );
          })}
          {!mass && !massFailed && <Skeleton lines={4} className="mass-skeleton" />}
          {!mass && massFailed && (
            <p className="muted small sans" role="status">
              Today&rsquo;s readings couldn&rsquo;t be loaded.{" "}
              <button type="button" className="link-btn" onClick={() => setMassRetry((x) => x + 1)}>
                Try again
              </button>
            </p>
          )}
          {mass?.formularyState && (
            <p className="notice small sans" role="status">
              The selected calendar observes {mass.formularyState.celebrationName}, but this
              citation table does not contain its mapped proper. Fidelis does not label the
              seasonal readings as that celebration&rsquo;s proper.
            </p>
          )}
          {mass && !mass.formularyState && (
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
                    {formatLectionaryCitation(row, book)}
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
          <h2><span className="cross"><Icon name="cross" /></span> Today in the Church</h2>

          {/* Saint of the Day — decoupled from the sanctoral engine: shown whenever
              we have a life for the day, even on a feria. The celebrated saint (if
              any) leads; otherwise the day's first seeded saint (cardSaint above). */}
          {cardSaint
            ? (() => {
                const s = cardSaint;
                return (
                  <div className="saint-lead">
                    {/* The medallion honors the saint — its ring is gold (the
                        sacred mark), not the day's liturgical color; card 1 already
                        carries the color chip. */}
                    <div className="saint-medallion" aria-hidden="true">
                      {monogram(s.name)}
                    </div>
                    <div className="saint-lead-body">
                      <div className="church-eyebrow sans small">Saint of the Day</div>
                      <div className="saint-lead-name">{s.name}</div>
                      <p className="muted small sans saint-lead-meta">
                        {s.title} · {s.rank}
                        {(s.bornYear || s.diedYear) && (
                          <>
                            {" "}
                            · {s.bornYear || "?"}–{s.diedYear || "?"}
                          </>
                        )}
                      </p>
                      <p className="saint-lead-blurb">{s.shortBlurb}</p>
                      {s.patronage && s.patronage.length > 0 && (
                        <p className="muted small sans saint-lead-patron">
                          Patron of {s.patronage.join(", ")}.
                        </p>
                      )}
                      <Link className="continue-cta" to={`/saint/${dayToday}/${s.id}`}>
                        Read the life →
                      </Link>
                    </div>
                  </div>
                );
              })()
            : null}

          {/* Divider only when both sections are present. */}
          {saintDay && saintDay.saints.length > 0 && historyState === "ready" && history && (
            <hr className="church-divider" />
          )}

          {/* In Church History — the day's event. */}
          {historyState === "loading" && !(saintDay && saintDay.saints.length > 0) && (
            <Skeleton lines={3} className="mass-skeleton" />
          )}
          {saintFailed && historyState === "failed" && (
            <p className="muted small sans" role="status">
              Today in the Church couldn&rsquo;t be loaded — it will return with your connection.
            </p>
          )}
          {saintFailed && historyState !== "failed" && (
            <p className="muted small sans" role="status">
              The Saint of the Day couldn&rsquo;t be loaded — it will return with your connection.
            </p>
          )}
          {!saintFailed && historyState === "failed" && (
            <p className="muted small sans" role="status">
              Church history couldn&rsquo;t be loaded — it will return with your connection.
            </p>
          )}
          {/* In Church History — the day's event. leadHistoryEvent keeps the
              lead off the Saint of the Day's own subject when the day has
              another event to offer, so the card never reads the same name
              twice (the /history page still lists them all). */}
          {historyState === "ready" &&
            history &&
            (() => {
              const lead = leadHistoryEvent(history.events, cardSaint?.name);
              if (!lead) return null;
              return (
                <div className="church-history">
                  <div className="church-eyebrow sans small">In Church History</div>
                  <div className="history-lead">
                    <span className="history-year">{lead.year}</span>{" "}
                    <strong>{lead.title}</strong>
                  </div>
                  <p className="history-blurb">{lead.shortBlurb}</p>
                  <Link className="continue-cta" to={`/history/${dayToday}`}>
                    {history.events.length > 1
                      ? `Read more · ${history.events.length} events →`
                      : "Read more →"}
                  </Link>
                </div>
              );
            })()}

          {/* One calm line when neither a saint nor an event is recorded yet —
              never on a failure (that is the connection notice above). */}
          {saintLoaded &&
            !saintFailed &&
            !(saintDay && saintDay.saints.length > 0) &&
            historyState === "empty" && (
            <p className="muted small sans" role="status">
              The saints and the day&rsquo;s chronicle are being gathered from public-domain
              sources, one day at a time.
            </p>
          )}
        </div>

        <div className="card" id="votd" tabIndex={-1}>
          <h2><span className="cross"><Icon name="cross" /></span> Verse of the Day</h2>
          <VerseQuote
            translation={translation}
            book={votd.book}
            chapter={votd.chapter}
            verse={votd.verse}
            endVerse={votd.endVerse}
            className="votd-text"
            onShownTranslation={setVotdShown}
          />
          <div className="votd-ref">
            <Link to={readerLink(votd.book, votd.chapter, votd.verse, votdShown)}>
              {formatVotdRef(votd, bookDisplayName(votdBook, votdShown))}
              {votdShown !== translation && ` · ${getTranslation(votdShown)?.abbrev}`}
            </Link>
            {votd.book === "psalms" && " · Vulgate Psalm numbering"}
          </div>
          <button type="button" className="card-share" onClick={() => void shareVotd()}>
            <Icon name="share" /> Share
          </button>
        </div>

        <div className="card" id="qotd" tabIndex={-1}>
          <h2>Quote of the Day</h2>
          {!quote && !quoteFailed && <Skeleton lines={4} className="qotd-skeleton" />}
          {!quote && quoteFailed && (
            <p className="muted small sans" role="status">
              The quote couldn't be loaded — it will return with your connection.
            </p>
          )}
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
          <h2>The Holy Rosary</h2>
          <div>
            Today's mysteries: <strong>The {rosary.name} Mysteries</strong>{" "}
            <span className="muted small" lang="la">({rosary.latin})</span>
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
          <p className="small sans muted browse-links">
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
