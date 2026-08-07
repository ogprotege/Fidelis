import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import Icon from "../components/Icon";
import Sheet from "../components/Sheet";
import ShareSheet from "../components/ShareSheet";
import SectionNav from "../components/SectionNav";
import { loadHistory } from "../lib/data";
import { HistoryDay, HistoryEvent } from "../lib/history";

/** A calendar "MM-DD" (any year, for display only) → "July 14". */
function humanDate(day: string): string {
  const [m, d] = day.split("-").map(Number);
  if (!m || !d) return day;
  return new Date(2001, m - 1, d).toLocaleDateString(undefined, { month: "long", day: "numeric" });
}

export default function History() {
  const { day = "" } = useParams();
  const [data, setData] = useState<HistoryDay | null | "loading" | "failed">("loading");
  const [share, setShare] = useState<
    { text: string; citation: string; source?: string; filename: string } | null
  >(null);

  useEffect(() => {
    let alive = true;
    setData("loading");
    if (!/^\d{2}-\d{2}$/.test(day)) {
      setData(null);
      return;
    }
    // A resolved null is genuine absence (404 — no entry for the date); a
    // rejection is a transport failure and must say so, not claim absence.
    loadHistory(day)
      .then((d) => alive && setData(d))
      .catch(() => alive && setData("failed"));
    return () => {
      alive = false;
    };
  }, [day]);

  const shareEvent = (e: HistoryEvent) =>
    setShare({
      text: e.shortBlurb.replace(/…$/, "."),
      citation: e.title,
      source: `${e.year} · Church history`,
      filename: `fidelis-history-${e.id}`
    });

  if (data === "loading") {
    return (
      <div className="page-narrow" style={{ margin: "0 auto" }}>
        <p className="loading" role="status">
          Turning the pages of the day…
        </p>
      </div>
    );
  }

  if (data === "failed") {
    return (
      <div className="page-narrow" style={{ margin: "0 auto" }}>
        <h1 className="page-title">Today in Church History</h1>
        <p className="subtitle">{humanDate(day)}</p>
        <div className="notice" role="status">
          The chronicle couldn&rsquo;t be loaded — it will return with your connection.
          <div className="browse-links">
            <Link className="continue-cta" to="/">
              Back to Today →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const events = data ? data.events : [];

  if (events.length === 0) {
    return (
      <div className="page-narrow" style={{ margin: "0 auto" }}>
        <h1 className="page-title">Today in Church History</h1>
        <p className="subtitle">{humanDate(day)}</p>
        <div className="notice" role="status">
          No entry is recorded for this day yet. The chronicle is being gathered from
          public-domain sources, one day at a time.
          <div className="browse-links">
            <Link className="continue-cta" to="/">
              Back to Today →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const sections = events.length >= 3 ? events.map((e) => ({ id: e.id, label: String(e.year) })) : [];

  return (
    <div className="page-narrow" style={{ margin: "0 auto" }}>
      <h1 className="page-title">Today in Church History</h1>
      <p className="subtitle">{humanDate(day)}</p>
      {sections.length > 0 && <SectionNav sections={sections} />}

      {events.map((e) => (
        <article className="history-event" key={e.id}>
          <h2 className="testament-title" id={e.id}>
            <span className="history-year">{e.year}</span> {e.title}
          </h2>
          {e.body.map((para, i) => (
            <p key={i}>{para}</p>
          ))}

          <details className="saint-sources">
            <summary className="sans small">Sources{e.verified ? "" : " (draft — pending verification)"}</summary>
            <ul className="muted small sans">
              {e.sources.map((src, i) => (
                <li key={i}>
                  {src.url ? (
                    <a href={src.url} target="_blank" rel="noopener noreferrer">
                      {src.text}
                    </a>
                  ) : (
                    src.text
                  )}
                </li>
              ))}
            </ul>
          </details>

          <button type="button" className="card-share" onClick={() => shareEvent(e)}>
            <Icon name="share" /> Share
          </button>
        </article>
      ))}

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
  );
}
