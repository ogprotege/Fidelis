import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { BOOKS, bookDisplayName, bookIndex, getBook } from "../lib/canon";
import { BookData, CCCData, CommentaryBook, loadBook, loadCCC, loadCommentary } from "../lib/data";
import { GOSPELS } from "../lib/commentary";
import { cccParagraphs, isCited } from "../lib/ccc";
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
import { TRANSLATIONS, getTranslation, langAttr } from "../lib/translations";
import Icon from "../components/Icon";
import IndulgenceNotice from "../components/IndulgenceNotice";
import Sheet from "../components/Sheet";
import CommentarySheet from "../components/CommentarySheet";
import CCCSheet from "../components/CCCSheet";
import ShareSheet from "../components/ShareSheet";
import { SCRIPTURE_FONTS, clampFontSize } from "../lib/typography";
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
  // §5 catechism: the verse whose inline Catechism sheet is open.
  const [cccFor, setCccFor] = useState<number | null>(null);
  // v1.16.0 folio line (spec §4): the extended book+chapter picker and the
  // "Aa" type menu. pickBook is the book the picker grid is showing — it
  // resets to the open book each time the picker opens.
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickBook, setPickBook] = useState(bookSlug);
  const [typeOpen, setTypeOpen] = useState(false);
  // §5 CCC links: the small index+url maps, loaded once when enabled.
  const [ccc, setCcc] = useState<CCCData | null>(null);
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

  // §5: load the CCC index + url maps once (small, global) when links are on.
  useEffect(() => {
    if (!settings.cccLinksEnabled) {
      setCcc(null);
      return;
    }
    let alive = true;
    loadCCC()
      .then((d) => alive && setCcc(d))
      .catch(() => alive && setCcc(null));
    return () => {
      alive = false;
    };
  }, [settings.cccLinksEnabled]);

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
    setCccFor(null);
    setPickerOpen(false);
    setTypeOpen(false);
    // Scroll position is owned by <ScrollManager> now (top on a fresh chapter,
    // your place restored on Back); the ?v= effect below still wins when present.
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
        // Smooth glide to the deep-linked verse, but only when the reader hasn't
        // asked the system to reduce motion (then snap, no disorienting scroll).
        const reduce =
          typeof window !== "undefined" &&
          typeof window.matchMedia === "function" &&
          window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        el.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" });
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

  // §5: the CCC paragraphs that cite the selected verse (empty unless enabled,
  // loaded, and cited). The links open vatican.va; "CCC" is muted, the ¶ purple.
  const cccParas =
    ccc && settings.cccLinksEnabled && selRef
      ? cccParagraphs(ccc.index, bookSlug, chapter, selRef.verse)
      : [];

  // §4.2: the gold dot marks Haydock notes; the Commentary action appears when
  // any enabled source has a note (Catena covers ~99% of Gospel verses, so the
  // Gospel action shows without loading the heavy Catena file first).
  const isGospel = GOSPELS.has(bookSlug);
  const haydockHas = (v: number) => !!haydockBook?.[`${chapter}:${v}`]?.length;
  const commentaryAvailable = (v: number) =>
    settings.commentaryEnabled &&
    ((settings.commentaryHaydock && haydockHas(v)) || (settings.commentaryCatena && isGospel));
  // §5: a verse cited in the Catechism wears a quiet purple gutter mark so the
  // citation is discoverable before tapping (the CATECHISM links live in the
  // action bar). Cheap per-verse index lookup; only when links are enabled.
  const cccCited = (v: number) =>
    settings.cccLinksEnabled && !!ccc && isCited(ccc.index, bookSlug, chapter, v);

  const go = (t: string, b: string, c: number) => navigate(`/read/${t}/${b}/${c}`);

  // The picker grid's book: the open book uses the loaded text's real chapter
  // count; any other book falls back to the canon maximum (P1-8 clamps after
  // navigation, exactly as the old toolbar selects did).
  const pickBookDef = getBook(pickBook) ?? book;
  const pickChapters = pickBook === bookSlug ? chapterCount : pickBookDef.chapters;
  const openPicker = () => {
    setPickBook(bookSlug);
    setPickerOpen(true);
  };

  const onSelectVerse = (v: number) => {
    setSelected(selected === v ? null : v);
    setNoteOpen(false);
    setCccFor(null);
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
    // Reading size in rem (the stored preset / 16) so it scales with the iOS
    // text-size / browser-zoom setting instead of being pinned to device px.
    <div className="verses" style={{ fontSize: `${fontSize / 16}rem` }} lang={langAttr(transId)}>
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
                {interactive && cccCited(v) && (
                  <span className="ccc-mark" aria-hidden="true" />
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
        <button
          type="button"
          className="folio-pick"
          aria-haspopup="dialog"
          aria-label={`${displayName} chapter ${chapter} — choose book and chapter`}
          onClick={openPicker}
        >
          <span className="folio-name" lang={langAttr(translation)}>
            {displayName} {chapter}
          </span>
          <svg
            className="icon folio-caret"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.6}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
        <select
          className="folio-trans"
          value={translation}
          onChange={(e) => go(e.target.value, bookSlug, Math.min(chapter, getBook(bookSlug)!.chapters))}
          title="Translation"
          aria-label="Translation"
        >
          {TRANSLATIONS.map((t) => (
            <option key={t.id} value={t.id}>
              {t.abbrev} {t.bundled ? "" : "(import required)"}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="icon-btn folio-type"
          aria-haspopup="dialog"
          aria-label="Text options"
          title="Text options"
          onClick={() => setTypeOpen(true)}
        >
          Aa
        </button>
      </div>

      <h1 className="chapter-title" lang={langAttr(translation)}>
        {displayName}{" "}
        {chapterCount > 1 && (
          <button
            type="button"
            className="chapter-pick"
            aria-haspopup="dialog"
            onClick={openPicker}
            title="Choose book and chapter"
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
            Mark today's portion read <Icon name="check" />
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
          <span className="hl-group">
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
                aria-label="Remove highlight"
                onClick={() => {
                  setHighlight(selRef, null);
                  setMarksVersion((x) => x + 1);
                }}
              >
                <Icon name="close" />
              </button>
            )}
          </span>
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
          {cccParas.length > 0 && (
            <button className="icon-btn" onClick={() => setCccFor(selRef.verse)}>
              <Icon name="book" /> Catechism
            </button>
          )}
          <button className="icon-btn" onClick={() => setSelected(null)} title="Close" aria-label="Close">
            <Icon name="close" />
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

      {cccFor != null && ccc && (
        <Sheet variant="panel" titleId="ccc-title" onClose={() => setCccFor(null)}>
          <CCCSheet
            book={bookSlug}
            chapter={chapter}
            verse={cccFor}
            refLabel={`${displayName} ${chapter}:${cccFor}`}
            titleId="ccc-title"
            paras={cccParagraphs(ccc.index, bookSlug, chapter, cccFor)}
            urls={ccc.url}
            edition={settings.trentEdition}
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

      {pickerOpen && (
        <Sheet titleId="passage-pick-title" onClose={() => setPickerOpen(false)}>
          <h2 id="passage-pick-title" className="chapter-grid-title" lang={langAttr(translation)}>
            {bookDisplayName(pickBookDef, translation)} — chapters
          </h2>
          <div className="chapter-grid">
            {Array.from({ length: pickChapters }, (_, i) => i + 1).map((c) => (
              <button
                key={c}
                type="button"
                className={
                  pickBook === bookSlug && c === chapter ? "chapter-cell current" : "chapter-cell"
                }
                aria-current={pickBook === bookSlug && c === chapter ? "true" : undefined}
                onClick={() => {
                  setPickerOpen(false);
                  void go(translation, pickBook, c);
                }}
              >
                {c}
              </button>
            ))}
          </div>
          <h3 className="picker-books-title">Books</h3>
          <div className="picker-books">
            {BOOKS.map((b) => (
              <button
                key={b.slug}
                type="button"
                className={b.slug === pickBook ? "picker-book current" : "picker-book"}
                aria-pressed={b.slug === pickBook}
                onClick={() => setPickBook(b.slug)}
              >
                {bookDisplayName(b, translation)}
              </button>
            ))}
          </div>
        </Sheet>
      )}

      {typeOpen && (
        <Sheet titleId="type-title" onClose={() => setTypeOpen(false)}>
          <h2 id="type-title" className="chapter-grid-title">Text options</h2>
          <div className="setting-row">
            <span className="setting-label">Text size</span>
            <span className="type-size">
              <button
                className="icon-btn"
                onClick={() => update({ fontSize: clampFontSize(fontSize - 1), followSystemTextSize: false })}
                aria-label="Smaller text"
              >
                A−
              </button>
              <span className="muted sans type-size-px">{fontSize}px</span>
              <button
                className="icon-btn"
                onClick={() => update({ fontSize: clampFontSize(fontSize + 1), followSystemTextSize: false })}
                aria-label="Larger text"
              >
                A+
              </button>
            </span>
          </div>
          <div className="type-group">
            <div className="setting-label">Scripture face</div>
            <div className="pill-row" role="group" aria-label="Scripture font">
              {SCRIPTURE_FONTS.map((f) => (
                <button
                  key={f.id}
                  className={`pill ${settings.scriptureFont === f.id ? "active" : ""}`}
                  aria-pressed={settings.scriptureFont === f.id}
                  style={{ fontFamily: `var(${f.cssVar})` }}
                  onClick={() => update({ scriptureFont: f.id })}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
          <div className="setting-row">
            <span className="setting-label">Parallel translation</span>
            <select
              value={parallel ?? ""}
              onChange={(e) => update({ parallel: e.target.value || null })}
              aria-label="Parallel translation"
            >
              <option value="">No parallel</option>
              {TRANSLATIONS.filter((t) => t.id !== translation).map((t) => (
                <option key={t.id} value={t.id}>
                  ∥ {t.abbrev}
                </option>
              ))}
            </select>
          </div>
        </Sheet>
      )}
    </div>
  );
}
