import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Icon from "../components/Icon";
import Sheet from "../components/Sheet";
import ShareSheet from "../components/ShareSheet";
import SectionNav from "../components/SectionNav";
import { loadSaints } from "../lib/data";
import type { Saint as SaintRecord, SaintDay } from "../lib/saints";

/** A calendar "MM-DD" (any year, for display only) → "July 14". */
function humanDate(day: string): string {
  const [m, d] = day.split("-").map(Number);
  if (!m || !d) return day;
  return new Date(2001, m - 1, d).toLocaleDateString(undefined, { month: "long", day: "numeric" });
}

export default function Saint() {
  const { day = "", id } = useParams();
  const [data, setData] = useState<SaintDay | null | "loading" | "failed">("loading");
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
    // A resolved null is genuine absence (404 — not in the collection); a
    // rejection is a transport failure and must say so, not claim absence.
    loadSaints(day)
      .then((d) => alive && setData(d))
      .catch(() => alive && setData("failed"));
    return () => {
      alive = false;
    };
  }, [day]);

  const shareSaint = (s: SaintRecord) =>
    setShare({
      text: s.shortBlurb.replace(/…$/, "."),
      citation: s.name,
      source: s.title,
      filename: `fidelis-saint-${s.id}`
    });

  if (data === "loading") {
    return (
      <div className="page-narrow" style={{ margin: "0 auto" }}>
        <p className="loading" role="status">
          Finding the saint of the day…
        </p>
      </div>
    );
  }

  if (data === "failed") {
    return (
      <div className="page-narrow" style={{ margin: "0 auto" }}>
        <h1 className="page-title">Saint of the Day</h1>
        <p className="subtitle">{humanDate(day)}</p>
        <div className="notice" role="status">
          The life couldn&rsquo;t be loaded — it will return with your connection.
          <div className="browse-links">
            <Link className="continue-cta" to="/">
              Back to Today →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const saints = data ? (id ? data.saints.filter((s) => s.id === id) : data.saints) : [];

  if (saints.length === 0) {
    return (
      <div className="page-narrow" style={{ margin: "0 auto" }}>
        <h1 className="page-title">Saint of the Day</h1>
        <p className="subtitle">{humanDate(day)}</p>
        <div className="notice" role="status">
          This life is not yet in the collection. The saints are being gathered from
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

  const many = saints.length > 1;
  const sections = many ? saints.map((s) => ({ id: s.id, label: s.name })) : [];

  return (
    <div className="page-narrow" style={{ margin: "0 auto" }}>
      <h1 className="page-title">{many ? "Saints of the Day" : saints[0].name}</h1>
      <p className="subtitle">{humanDate(day)}</p>
      {many && <SectionNav sections={sections} />}

      {saints.map((s) => (
        <article className="saint" key={s.id}>
          {many && (
            <h2 className="testament-title" id={s.id}>
              {s.name}
            </h2>
          )}
          <p className="muted small sans saint-meta">
            {s.title} · {s.rank}
            {(s.bornYear || s.diedYear) && (
              <>
                {" "}
                · {s.bornYear || "?"}–{s.diedYear || "?"}
              </>
            )}
          </p>

          {s.biography.map((para, i) => (
            <p key={i}>{para}</p>
          ))}

          <p>
            <strong>Known for.</strong> {s.knownFor}
          </p>

          {s.patronage && s.patronage.length > 0 && (
            <p>
              <strong>Patron of.</strong> {s.patronage.join(", ")}.
            </p>
          )}

          {s.canonization && (s.canonization.beatified || s.canonization.canonized) && (
            <p className="muted small sans">
              {s.canonization.beatified && <>Beatified {s.canonization.beatified}. </>}
              {s.canonization.canonized && <>Canonized {s.canonization.canonized}.</>}
            </p>
          )}

          {s.prayer && s.prayer.text && (
            <div className="saint-prayer">
              <div className="saint-prayer-title sans small">{s.prayer.title}</div>
              <p className="saint-prayer-text">{s.prayer.text}</p>
              {s.prayer.source && <p className="muted small sans">{s.prayer.source}</p>}
            </div>
          )}

          <details className="saint-sources">
            <summary className="sans small">Sources{s.verified ? "" : " (draft — pending verification)"}</summary>
            <ul className="muted small sans">
              {s.sources.map((src, i) => (
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

          <button type="button" className="card-share" onClick={() => shareSaint(s)}>
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
