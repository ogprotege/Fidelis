import { useEffect, useMemo, useState } from "react";
import { CommentaryNote, loadCommentary } from "../lib/data";
import { fathersOf, groupCatena } from "../lib/commentary";

interface Props {
  book: string;
  chapter: number;
  verse: number;
  /** e.g. "John 3:16" — the sheet heading; matches Sheet's aria-labelledby. */
  refLabel: string;
  titleId: string;
  isGospel: boolean;
  /** Whether THIS verse has a Haydock note (the Reader already knows). */
  hasHaydock: boolean;
  showHaydock: boolean;
  showCatena: boolean;
  doctorsOnlyDefault: boolean;
}

/** Render commentary text that groupCatena may have joined with blank lines. */
function Paragraphs({ text }: { text: string }) {
  return (
    <>
      {text.split("\n\n").map((p, i) => (
        <p key={i} className="cmt-text">{p}</p>
      ))}
    </>
  );
}

/**
 * The §4.2 study surface: Haydock and Catena Aurea tabs, with per-Father chips
 * and a Doctors-only toggle on the Catena tab. Scripture stays Scripture; this is
 * study, one tap away. Haydock is already cached (the Reader loaded it for the
 * dots); the Catena Gospel file (6–10 MB) loads here, on first open, and only then.
 */
export default function CommentarySheet({
  book, chapter, verse, refLabel, titleId, isGospel, hasHaydock,
  showHaydock, showCatena, doctorsOnlyDefault
}: Props) {
  const key = `${chapter}:${verse}`;
  const catenaTab = isGospel && showCatena;
  const haydockTab = showHaydock && hasHaydock;

  const [tab, setTab] = useState<"haydock" | "catena">(haydockTab ? "haydock" : "catena");
  const [haydock, setHaydock] = useState<CommentaryNote[] | null>(haydockTab ? null : []);
  const [catena, setCatena] = useState<CommentaryNote[] | null>(catenaTab ? null : []);

  useEffect(() => {
    let alive = true;
    if (haydockTab) {
      loadCommentary("haydock", book)
        .then((b) => alive && setHaydock(b[key] ?? []))
        .catch(() => alive && setHaydock([]));
    }
    if (catenaTab) {
      loadCommentary("catena", book)
        .then((b) => alive && setCatena(b[key] ?? []))
        .catch(() => alive && setCatena([]));
    }
    return () => {
      alive = false;
    };
  }, [book, key, haydockTab, catenaTab]);

  // ── Catena filters: Doctors-only + per-Father chips ─────────────────────────
  const [doctorsOnly, setDoctorsOnly] = useState(doctorsOnlyDefault);
  const [picked, setPicked] = useState<Set<string>>(new Set());

  const blocks = useMemo(() => groupCatena(catena ?? []), [catena]);
  const fatherChips = useMemo(() => fathersOf(blocks), [blocks]);
  const otherChips = useMemo(() => {
    const seen = new Set<string>();
    const out: { id: string; name: string }[] = [];
    for (const b of blocks) {
      if (b.kind === "father") continue;
      const id = b.kind === "gloss" ? "gloss" : `source:${b.name}`;
      if (!seen.has(id)) {
        seen.add(id);
        out.push({ id, name: b.name || "Source" });
      }
    }
    return out;
  }, [blocks]);

  const blockId = (b: (typeof blocks)[number]) =>
    b.father ? b.father.id : b.kind === "gloss" ? "gloss" : `source:${b.name}`;
  const visible = blocks.filter(
    (b) => (!doctorsOnly || b.isDoctor) && (picked.size === 0 || picked.has(blockId(b)))
  );

  const toggle = (id: string) =>
    setPicked((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  return (
    <div className="cmt-sheet">
      <h2 id={titleId} className="cmt-title">{refLabel}</h2>

      {haydockTab && catenaTab && (
        <div className="cmt-tabs" role="group" aria-label="Commentary source">
          <button
            className={`cmt-tab ${tab === "haydock" ? "active" : ""}`}
            aria-pressed={tab === "haydock"}
            onClick={() => setTab("haydock")}
          >
            Haydock
          </button>
          <button
            className={`cmt-tab ${tab === "catena" ? "active" : ""}`}
            aria-pressed={tab === "catena"}
            onClick={() => setTab("catena")}
          >
            Catena Aurea
          </button>
        </div>
      )}

      {/* ── Haydock pane ── */}
      {tab === "haydock" && haydockTab && (
        <div className="cmt-pane">
          {haydock === null ? (
            <p className="cmt-loading muted small sans">Opening Haydock…</p>
          ) : haydock.length === 0 ? (
            <p className="muted small sans">No Haydock note on this verse.</p>
          ) : (
            haydock.map((n, i) => (
              <div className="cmt-block" key={i}>
                {n.src ? <div className="cmt-attr">{n.src}</div> : null}
                <Paragraphs text={n.text} />
              </div>
            ))
          )}
        </div>
      )}

      {/* ── Catena Aurea pane ── */}
      {tab === "catena" && catenaTab && (
        <div className="cmt-pane">
          <div className="cmt-credit">The Catena Aurea · the Newman edition</div>

          {catena === null ? (
            <p className="cmt-loading muted small sans">Gathering the Fathers…</p>
          ) : blocks.length === 0 ? (
            <p className="muted small sans">No Catena commentary on this verse.</p>
          ) : (
            <>
              <div className="cmt-filters">
                <div className="cmt-chips" role="group" aria-label="Filter by Father">
                  {fatherChips
                    .filter((f) => !doctorsOnly || f.isDoctor)
                    .map((f) => (
                      <button
                        key={f.id}
                        className={`cmt-chip ${picked.has(f.id) ? "active" : ""}`}
                        aria-pressed={picked.has(f.id)}
                        onClick={() => toggle(f.id)}
                      >
                        {f.name}
                      </button>
                    ))}
                  {!doctorsOnly && otherChips.length > 0 && <span className="cmt-chip-sep" aria-hidden="true" />}
                  {!doctorsOnly &&
                    otherChips.map((c) => (
                      <button
                        key={c.id}
                        className={`cmt-chip plain ${picked.has(c.id) ? "active" : ""}`}
                        aria-pressed={picked.has(c.id)}
                        title={c.id === "gloss" ? "The Glossa Ordinaria — a medieval gloss, not a Father" : undefined}
                        onClick={() => toggle(c.id)}
                      >
                        {c.name}
                      </button>
                    ))}
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={doctorsOnly}
                  aria-label="Doctors of the Church only"
                  className={`cmt-doctors ${doctorsOnly ? "on" : ""}`}
                  onClick={() => setDoctorsOnly((v) => !v)}
                >
                  Doctors only
                </button>
              </div>

              {visible.length === 0 ? (
                <p className="muted small sans">No comments match this filter.</p>
              ) : (
                visible.map((b, i) => (
                  <div className="cmt-block" key={i}>
                    <div className={`cmt-attr ${b.kind !== "father" ? "plain" : ""}`}>{b.name}</div>
                    <Paragraphs text={b.text} />
                  </div>
                ))
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
