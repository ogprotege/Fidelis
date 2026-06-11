import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { BOOKS, bookDisplayName, bookIndex, getBook } from "../lib/canon";
import { BookData, loadBook } from "../lib/data";
import {
  HighlightColor,
  VerseRef,
  getBookmarks,
  getHighlights,
  getNote,
  getNotes,
  getSettings,
  refKey,
  saveLastRead,
  saveSettings,
  setHighlight,
  setNote,
  toggleBookmark
} from "../lib/storage";
import { TRANSLATIONS, getTranslation } from "../lib/translations";

export default function Reader() {
  const params = useParams<{ translation: string; book: string; chapter: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const translation = params.translation ?? "drc";
  const bookSlug = params.book ?? "genesis";
  const chapter = Math.max(1, parseInt(params.chapter ?? "1", 10) || 1);
  const focusVerse = parseInt(searchParams.get("v") ?? "", 10) || null;

  const book = getBook(bookSlug);
  const settings = getSettings();
  const [parallel, setParallel] = useState<string | null>(settings.parallel);
  const [fontSize, setFontSize] = useState(settings.fontSize);
  const [data, setData] = useState<BookData | null>(null);
  const [parallelData, setParallelData] = useState<BookData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteDraft, setNoteDraft] = useState("");
  const [marksVersion, setMarksVersion] = useState(0);

  const bookmarks = useMemo(
    () => new Set(getBookmarks().map(refKey)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [marksVersion]
  );
  const highlights = useMemo(() => {
    const m = new Map<string, HighlightColor>();
    for (const h of getHighlights()) m.set(refKey(h), h.color);
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [marksVersion]);
  const notedKeys = useMemo(
    () => new Set(getNotes().map(refKey)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [marksVersion]
  );

  useEffect(() => {
    if (!book) return;
    setError(null);
    setData(null);
    let alive = true;
    loadBook(translation, bookSlug)
      .then((d) => alive && setData(d))
      .catch((e) => alive && setError(e instanceof Error ? e.message : String(e)));
    return () => {
      alive = false;
    };
  }, [translation, bookSlug, book]);

  useEffect(() => {
    if (!parallel || parallel === translation) {
      setParallelData(null);
      return;
    }
    let alive = true;
    setParallelData(null);
    loadBook(parallel, bookSlug)
      .then((d) => alive && setParallelData(d))
      .catch(() => alive && setParallelData(null));
    return () => {
      alive = false;
    };
  }, [parallel, translation, bookSlug]);

  useEffect(() => {
    if (book) {
      saveLastRead({ translation, book: bookSlug, chapter });
      saveSettings({ translation });
    }
    setSelected(null);
    setNoteOpen(false);
    window.scrollTo(0, 0);
  }, [translation, bookSlug, chapter, book]);

  useEffect(() => {
    if (focusVerse && data) {
      const el = document.getElementById(`v-${focusVerse}`);
      if (el) {
        el.scrollIntoView({ block: "center" });
        setSelected(focusVerse);
      }
    }
  }, [focusVerse, data]);

  if (!book) {
    return <p className="notice">Unknown book. <Link to="/read">Browse the books</Link>.</p>;
  }

  const trans = getTranslation(translation);
  const verses = data?.chapters[chapter - 1] ?? null;
  const chapterEmpty = verses !== null && verses.every((v) => !v || !v.trim());
  const chapterCount = data?.chapters.length ?? book.chapters;
  const displayName = bookDisplayName(book, translation);
  const bi = bookIndex(bookSlug);
  const prev =
    chapter > 1
      ? { book: bookSlug, chapter: chapter - 1 }
      : bi > 0
        ? { book: BOOKS[bi - 1].slug, chapter: BOOKS[bi - 1].chapters }
        : null;
  const next =
    chapter < chapterCount
      ? { book: bookSlug, chapter: chapter + 1 }
      : bi < BOOKS.length - 1
        ? { book: BOOKS[bi + 1].slug, chapter: 1 }
        : null;

  const selRef: VerseRef | null = selected ? { book: bookSlug, chapter, verse: selected } : null;
  const selKey = selRef ? refKey(selRef) : "";

  const go = (t: string, b: string, c: number) => navigate(`/read/${t}/${b}/${c}`);

  const onSelectVerse = (v: number) => {
    setSelected(selected === v ? null : v);
    setNoteOpen(false);
  };

  const copySelected = async () => {
    if (!selRef || !verses) return;
    const text = `"${verses[selRef.verse - 1]}" — ${displayName} ${chapter}:${selRef.verse} (${trans?.abbrev})`;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // clipboard unavailable
    }
  };

  const renderVerses = (vs: string[], interactive: boolean) => (
    <div className="verses" style={{ fontSize: `${fontSize}px` }}>
      {vs.map((text, i) => {
        // Grid-empty slot (see data-report.txt): no text in this translation.
        if (!text || !text.trim()) return null;
        const v = i + 1;
        const key = refKey({ book: bookSlug, chapter, verse: v });
        const hl = highlights.get(key);
        const cls = [
          "verse",
          interactive && selected === v ? "selected" : "",
          hl ? `hl-${hl}` : ""
        ]
          .filter(Boolean)
          .join(" ");
        return (
          <span
            key={v}
            id={interactive ? `v-${v}` : undefined}
            className={cls}
            onClick={interactive ? () => onSelectVerse(v) : undefined}
          >
            {settings.showVerseNumbers && <sup className="vnum">{v}</sup>}
            {text}
            {interactive && bookmarks.has(key) && <span className="bm-mark">⚑</span>}
            {interactive && notedKeys.has(key) && <span className="note-mark">✎</span>}{" "}
          </span>
        );
      })}
    </div>
  );

  return (
    <div className={parallelData ? "parallel" : ""}>
      <div className="reader-toolbar">
        <select
          value={translation}
          onChange={(e) => go(e.target.value, bookSlug, Math.min(chapter, getBook(bookSlug)!.chapters))}
          title="Translation"
        >
          {TRANSLATIONS.map((t) => (
            <option key={t.id} value={t.id}>
              {t.abbrev} {t.bundled ? "" : "(import required)"}
            </option>
          ))}
        </select>
        <select value={bookSlug} onChange={(e) => go(translation, e.target.value, 1)} title="Book">
          {BOOKS.map((b) => (
            <option key={b.slug} value={b.slug}>
              {bookDisplayName(b, translation)}
            </option>
          ))}
        </select>
        <select
          value={chapter}
          onChange={(e) => go(translation, bookSlug, parseInt(e.target.value, 10))}
          title="Chapter"
        >
          {Array.from({ length: chapterCount }, (_, i) => (
            <option key={i + 1} value={i + 1}>
              {i + 1}
            </option>
          ))}
        </select>
        <div className="toolbar-right">
          <select
            value={parallel ?? ""}
            onChange={(e) => {
              const v = e.target.value || null;
              setParallel(v);
              saveSettings({ parallel: v });
            }}
            title="Parallel translation"
          >
            <option value="">No parallel</option>
            {TRANSLATIONS.filter((t) => t.id !== translation).map((t) => (
              <option key={t.id} value={t.id}>
                ∥ {t.abbrev}
              </option>
            ))}
          </select>
          <button
            className="icon-btn"
            onClick={() => {
              const s = Math.max(14, fontSize - 1);
              setFontSize(s);
              saveSettings({ fontSize: s });
            }}
            title="Smaller text"
          >
            A−
          </button>
          <button
            className="icon-btn"
            onClick={() => {
              const s = Math.min(28, fontSize + 1);
              setFontSize(s);
              saveSettings({ fontSize: s });
            }}
            title="Larger text"
          >
            A+
          </button>
        </div>
      </div>

      <h1 className="chapter-title">
        {displayName} {chapterCount > 1 ? chapter : ""}
      </h1>
      <p className="chapter-subtitle">
        {trans?.name}
        {bookSlug === "psalms" && " · traditional Vulgate Psalm numbering"}
      </p>

      {error && (
        <div className="notice">
          {error}
          {trans && !trans.bundled && (
            <>
              {" "}
              <Link to="/translations">Go to Translations</Link>
            </>
          )}
        </div>
      )}
      {!error && !verses && <p className="loading">Loading the sacred text…</p>}

      {chapterEmpty && (
        <p className="notice">
          The bundled {trans?.name ?? translation} source does not include the text of this{" "}
          {book.appendix ? "book" : "chapter"}.
        </p>
      )}

      {verses && !chapterEmpty && !parallelData && renderVerses(verses, true)}
      {verses && !chapterEmpty && parallelData && (
        <div className="parallel-grid">
          <div>
            <div className="col-label">{trans?.abbrev}</div>
            {renderVerses(verses, true)}
          </div>
          <div>
            <div className="col-label">{getTranslation(parallel!)?.abbrev}</div>
            {renderVerses(parallelData.chapters[chapter - 1] ?? [], false)}
          </div>
        </div>
      )}

      {verses && (
        <div className="chapter-nav">
          {prev ? (
            <Link to={`/read/${translation}/${prev.book}/${prev.chapter}`}>
              ← {prev.book === bookSlug ? `Chapter ${prev.chapter}` : bookDisplayName(getBook(prev.book)!, translation)}
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link to={`/read/${translation}/${next.book}/${next.chapter}`}>
              {next.book === bookSlug ? `Chapter ${next.chapter}` : bookDisplayName(getBook(next.book)!, translation)} →
            </Link>
          ) : (
            <span />
          )}
        </div>
      )}

      {selRef && verses && (
        <div className="verse-actions">
          <span className="ref">
            {book.abbrev} {chapter}:{selRef.verse}
          </span>
          <button
            className="icon-btn"
            onClick={() => {
              toggleBookmark({ ...selRef, translation });
              setMarksVersion((x) => x + 1);
            }}
          >
            {bookmarks.has(selKey) ? "⚑ Unbookmark" : "⚑ Bookmark"}
          </button>
          {(["gold", "rose", "sky", "olive"] as HighlightColor[]).map((c) => (
            <button
              key={c}
              className={`hl-dot ${c}`}
              title={`Highlight ${c}`}
              onClick={() => {
                setHighlight(selRef, c);
                setMarksVersion((x) => x + 1);
              }}
            />
          ))}
          {highlights.has(selKey) && (
            <button
              className="hl-dot clear"
              title="Remove highlight"
              onClick={() => {
                setHighlight(selRef, null);
                setMarksVersion((x) => x + 1);
              }}
            >
              ✕
            </button>
          )}
          <button
            className="icon-btn"
            onClick={() => {
              setNoteDraft(getNote(selRef)?.text ?? "");
              setNoteOpen(!noteOpen);
            }}
          >
            ✎ Note
          </button>
          <button className="icon-btn" onClick={copySelected}>
            ⧉ Copy
          </button>
          <button className="icon-btn" onClick={() => setSelected(null)} title="Close">
            ✕
          </button>
          {noteOpen && (
            <div className="note-editor">
              <textarea
                value={noteDraft}
                onChange={(e) => setNoteDraft(e.target.value)}
                placeholder="Your note on this verse…"
              />
              <button
                className="icon-btn"
                onClick={() => {
                  setNote(selRef, noteDraft);
                  setMarksVersion((x) => x + 1);
                  setNoteOpen(false);
                }}
              >
                Save note
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
