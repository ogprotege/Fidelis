import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { BOOKS, bookDisplayName, bookIndex, getBook } from "../lib/canon";
import { BookData, CommentaryBook, loadBook, loadCommentary } from "../lib/data";
import { GOSPELS } from "../lib/commentary";
import {
  HighlightColor,
  VerseRef,
  getBookmarks,
  getHighlights,
  getNote,
  getNotes,
  refKey,
  saveLastRead,
  setHighlight,
  setNote,
  toggleBookmark
} from "../lib/storage";
import { TRANSLATIONS, getTranslation } from "../lib/translations";
import Icon from "../components/Icon";
import IndulgenceNotice from "../components/IndulgenceNotice";
import Sheet from "../components/Sheet";
import CommentarySheet from "../components/CommentarySheet";
import ShareSheet from "../components/ShareSheet";
import { clampFontSize } from "../lib/typography";
import { useSettings, useUpdateSettings } from "../SettingsContext";
import { activePlan, updatePlan } from "../lib/storage";
import { isComplete, todayPortion, markPortionRead } from "../lib/plans";

export default function Reader() {
  const params = useParams<{ translation: string; book: string; chapter: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const translation = params.translation ?? "drc";
  const bookSlug = params.book ?? "genesis";
  const chapter = Math.max(1, parseInt(params.chapter ?? "1", 10) || 1);
  const focusVerse = parseInt(searchParams.get("v") ?? "", 10) || null;

  const book = getBook(bookSlug);
  // Live settings (spec §2.2): font size, the parallel pane, and verse numbers
  // all reflect Settings-screen changes without a remount.
  const settings = useSettings();
  const update = useUpdateSettings();
  const parallel = settings.parallel;
  const fontSize = settings.fontSize;
  const [data, setData] = useState<BookData | null>(null);
  const [parallelData, setParallelData] = useState<BookData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [focusedVerse, setFocusedVerse] = useState<number | null>(null);
  const [plan, setPlan] = useState(activePlan);
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteDraft, setNoteDraft] = useState("");
  const [marksVersion, setMarksVersion] = useState(0);
  // §4.2 commentary: the book's Haydock notes drive the gold dots (and feed the
  // sheet); commentaryFor is the verse whose commentary sheet is open.
  const [haydockBook, setHaydockBook] = useState<CommentaryBook | null>(null);
  const [commentaryFor, setCommentaryFor] = useState<number | null>(null);
  const [shareFor, setShareFor] = useState<number | null>(null);
  const [chapterPickerOpen, setChapterPickerOpen] = useState(false);
  const wantHaydockDots = settings.commentaryEnabled && settings.commentaryHaydock;

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

  // §4.2: load the book's Haydock notes for the gold dots. Book-level (not per
  // chapter), after the sacred text paints; a 404 (appendix book) yields {}.
  useEffect(() => {
    if (!book || !wantHaydockDots) {
      setHaydockBook(null);
      return;
    }
    let alive = true;
    loadCommentary("haydock", bookSlug)
      .then((b) => alive && setHaydockBook(b))
      .catch(() => alive && setHaydockBook(null));
    return () => {
      alive = false;
    };
  }, [bookSlug, book, wantHaydockDots]);

  useEffect(() => {
    if (book) {
      saveLastRead({ translation, book: bookSlug, chapter });
      // Remember the chosen translation as the default — but only when it
      // actually changes, so turning chapters doesn't churn the context.
      if (settings.translation !== translation) update({ translation });
    }
    setSelected(null);
    setNoteOpen(false);
    setCommentaryFor(null);
    setShareFor(null);
    setChapterPickerOpen(false);
    window.scrollTo(0, 0);
    // Runs on navigation only; settings.translation/update are read to persist
    // the chosen translation, not to re-fire this effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [translation, bookSlug, chapter, book]);

  // A deep-linked verse (?v=) gets a transient gold rule for ~3s — gold honors
  // a scripture-focus mark — rather than staying permanently selected (which
  // also popped the action bar). The 3s timer works regardless of motion
  // settings, so the indicator is never invisible to reduced-motion users.
  useEffect(() => {
    if (focusVerse && data) {
      const el = document.getElementById(`v-${focusVerse}`);
      if (el) {
        el.scrollIntoView({ block: "center" });
        setFocusedVerse(focusVerse);
        const t = setTimeout(() => setFocusedVerse(null), 3000);
        return () => clearTimeout(t);
      }
    }
  }, [focusVerse, data]);

  // P1-8: book.chapters is the cross-translation maximum, so a chapter that
  // exists in one translation may not exist in another (imported RSV-2CE/
  // NABRE versification differs). Once the target text is loaded, clamp to
  // its real chapter count instead of waiting forever on a chapter that
  // isn't there.
  useEffect(() => {
    if (data && data.chapters.length > 0 && chapter > data.chapters.length) {
      void navigate(`/read/${translation}/${bookSlug}/${data.chapters.length}`, { replace: true });
    }
  }, [data, chapter, translation, bookSlug, navigate]);

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

  // §4.2: the gold dot marks Haydock notes; the Commentary action appears when
  // any enabled source has a note (Catena covers ~99% of Gospel verses, so the
  // Gospel action shows without loading the heavy Catena file first).
  const isGospel = GOSPELS.has(bookSlug);
  const haydockHas = (v: number) => !!haydockBook?.[`${chapter}:${v}`]?.length;
  const commentaryAvailable = (v: number) =>
    settings.commentaryEnabled &&
    ((settings.commentaryHaydock && haydockHas(v)) || (settings.commentaryCatena && isGospel));

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

  const renderVerses = (vs: string[], interactive: boolean, transId: string) => (
    <div className="verses" style={{ fontSize: `${fontSize}px` }} lang={getTranslation(transId)?.language === "la" ? "la" : undefined}>
      {vs.map((text, i) => {
        // Grid-empty slot (see data-report.txt): no text in this translation.
        if (!text || !text.trim()) return null;
        const v = i + 1;
        const key = refKey({ book: bookSlug, chapter, verse: v });
        const hl = highlights.get(key);
        const cls = [
          "verse",
          interactive && selected === v ? "selected" : "",
          interactive && focusedVerse === v ? "verse-focused" : "",
          hl ? `hl-${hl}` : ""
        ]
          .filter(Boolean)
          .join(" ");
        return (
          <span
            key={v}
            id={interactive ? `v-${v}` : undefined}
            className={cls}
            role={interactive ? "button" : undefined}
            tabIndex={interactive ? 0 : undefined}
            aria-pressed={interactive ? selected === v : undefined}
            onClick={interactive ? () => onSelectVerse(v) : undefined}
            onKeyDown={
              interactive
                ? (e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSelectVerse(v);
                    }
                  }
                : undefined
            }
          >
            {settings.showVerseNumbers && (
              <sup className="vnum">
                {v}
                {interactive && wantHaydockDots && haydockHas(v) && (
                  <span className="cmt-dot" aria-hidden="true" />
                )}
              </sup>
            )}
            {text}
            {interactive && bookmarks.has(key) && <span className="bm-mark"><Icon name="bookmark" title="Bookmarked" /></span>}
            {interactive && notedKeys.has(key) && <span className="note-mark"><Icon name="note" title="Has a note" /></span>}{" "}
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
            onChange={(e) => update({ parallel: e.target.value || null })}
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
            onClick={() => update({ fontSize: clampFontSize(fontSize - 1) })}
            title="Smaller text"
          >
            A−
          </button>
          <button
            className="icon-btn"
            onClick={() => update({ fontSize: clampFontSize(fontSize + 1) })}
            title="Larger text"
          >
            A+
          </button>
        </div>
      </div>

      <h1 className="chapter-title" lang={trans?.language === "la" ? "la" : undefined}>
        {displayName}{" "}
        {chapterCount > 1 && (
          <button
            type="button"
            className="chapter-pick"
            aria-haspopup="dialog"
            onClick={() => setChapterPickerOpen(true)}
            title="Choose a chapter"
          >
            {chapter}
          </button>
        )}
      </h1>
      <p className="chapter-subtitle">
        {trans?.name}
        {bookSlug === "psalms" && " · traditional Vulgate Psalm numbering"}
      </p>
      <IndulgenceNotice enabled={settings.showIndulgence} />

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
      {!error && !data && <p className="loading">Loading the sacred text…</p>}
      {!error && data && !verses && (
        <p className="notice">
          Chapter {chapter} is not present in {trans?.name ?? translation}
          {chapterCount > 0 ? ` — this book has ${chapterCount} chapter${chapterCount === 1 ? "" : "s"} there` : ""}.
        </p>
      )}

      {chapterEmpty && (
        <p className="notice">
          The bundled {trans?.name ?? translation} source does not include the text of this{" "}
          {book.appendix ? "book" : "chapter"}.
        </p>
      )}

      {verses && !chapterEmpty && !parallelData && renderVerses(verses, true, translation)}
      {verses && !chapterEmpty && parallelData && (
        <div className="parallel-grid">
          <div>
            <div className="col-label">{trans?.abbrev}</div>
            {renderVerses(verses, true, translation)}
          </div>
          <div>
            <div className="col-label">{getTranslation(parallel!)?.abbrev}</div>
            {renderVerses(parallelData.chapters[chapter - 1] ?? [], false, parallel ?? translation)}
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

      {verses && plan && !isComplete(plan) && todayPortion(plan).includes(`${bookSlug}/${chapter}`) && (
        <div className="plan-mark">
          <button
            type="button"
            className="continue-cta"
            onClick={() => {
              const next = markPortionRead(plan);
              updatePlan(next);
              setPlan(next);
            }}
          >
            Mark today's portion read ✓
          </button>
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
            <Icon name="bookmark" /> {bookmarks.has(selKey) ? "Unbookmark" : "Bookmark"}
          </button>
          {(["gold", "rose", "sky", "olive"] as HighlightColor[]).map((c) => (
            <button
              key={c}
              className={`hl-dot ${c}`}
              title={`Highlight ${c}`}
              aria-label={`Highlight ${c}`}
              aria-pressed={highlights.get(selKey) === c}
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
            <Icon name="note" /> Note
          </button>
          <button className="icon-btn" onClick={copySelected}>
            <Icon name="copy" /> Copy
          </button>
          <button className="icon-btn" onClick={() => setShareFor(selRef.verse)}>
            <Icon name="share" /> Share
          </button>
          {commentaryAvailable(selRef.verse) && (
            <button className="icon-btn" onClick={() => setCommentaryFor(selRef.verse)}>
              <Icon name="commentary" /> Commentary
            </button>
          )}
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

      {commentaryFor != null && (
        <Sheet variant="panel" titleId="cmt-title" onClose={() => setCommentaryFor(null)}>
          <CommentarySheet
            book={bookSlug}
            chapter={chapter}
            verse={commentaryFor}
            refLabel={`${displayName} ${chapter}:${commentaryFor}`}
            titleId="cmt-title"
            isGospel={isGospel}
            hasHaydock={haydockHas(commentaryFor)}
            showHaydock={settings.commentaryHaydock}
            showCatena={settings.commentaryCatena}
            doctorsOnlyDefault={settings.commentaryDoctorsOnly}
          />
        </Sheet>
      )}

      {shareFor != null && verses && (
        <Sheet titleId="share-title" onClose={() => setShareFor(null)}>
          <ShareSheet
            titleId="share-title"
            text={verses[shareFor - 1]}
            citation={`${displayName} ${chapter}:${shareFor}${
              trans?.abbrev ? ` · ${trans.abbrev}` : ""
            }`}
            filename={`fidelis-${bookSlug}-${chapter}-${shareFor}`}
          />
        </Sheet>
      )}

      {chapterPickerOpen && (
        <Sheet titleId="chapter-grid-title" onClose={() => setChapterPickerOpen(false)}>
          <h2 id="chapter-grid-title" className="chapter-grid-title">
            {displayName} — chapters
          </h2>
          <div className="chapter-grid">
            {Array.from({ length: chapterCount }, (_, i) => i + 1).map((c) => (
              <button
                key={c}
                type="button"
                className={c === chapter ? "chapter-cell current" : "chapter-cell"}
                aria-current={c === chapter ? "true" : undefined}
                onClick={() => {
                  setChapterPickerOpen(false);
                  void go(translation, bookSlug, c);
                }}
              >
                {c}
              </button>
            ))}
          </div>
        </Sheet>
      )}
    </div>
  );
}
