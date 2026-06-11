import { useState } from "react";
import { Link } from "react-router-dom";
import { bookDisplayName, getBook } from "../lib/canon";
import {
  getBookmarks,
  getHighlights,
  getNotes,
  getSettings,
  setHighlight,
  setNote,
  toggleBookmark
} from "../lib/storage";

type Tab = "bookmarks" | "highlights" | "notes";

export default function Library() {
  const [tab, setTab] = useState<Tab>("bookmarks");
  const [version, setVersion] = useState(0);
  void version;
  const translation = getSettings().translation;

  const bookmarks = getBookmarks();
  const highlights = getHighlights();
  const notes = getNotes();

  const refLink = (book: string, chapter: number, verse: number) => {
    const b = getBook(book);
    if (!b) return null;
    return (
      <Link to={`/read/${translation}/${book}/${chapter}?v=${verse}`}>
        {bookDisplayName(b, translation)} {chapter}:{verse}
      </Link>
    );
  };

  const when = (ts: number) => new Date(ts).toLocaleDateString();

  return (
    <div className="page-narrow" style={{ margin: "0 auto" }}>
      <h1 className="page-title">My Library</h1>
      <div className="tabs">
        {(["bookmarks", "highlights", "notes"] as Tab[]).map((t) => (
          <button key={t} className={tab === t ? "active" : ""} onClick={() => setTab(t)}>
            {t[0].toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === "bookmarks" &&
        (bookmarks.length === 0 ? (
          <p className="muted">No bookmarks yet. Tap a verse while reading to add one.</p>
        ) : (
          bookmarks.map((bm) => (
            <div className="lib-item" key={`${bm.book}-${bm.chapter}-${bm.verse}`}>
              ⚑ {refLink(bm.book, bm.chapter, bm.verse)}{" "}
              <span className="when">added {when(bm.createdAt)}</span>
              <div className="actions">
                <button
                  onClick={() => {
                    toggleBookmark(bm);
                    setVersion((x) => x + 1);
                  }}
                >
                  Remove
                </button>
              </div>
            </div>
          ))
        ))}

      {tab === "highlights" &&
        (highlights.length === 0 ? (
          <p className="muted">No highlights yet. Tap a verse while reading and pick a color.</p>
        ) : (
          highlights.map((h) => (
            <div className="lib-item" key={`${h.book}-${h.chapter}-${h.verse}`}>
              <span className={`hl-dot ${h.color}`} style={{ display: "inline-block", verticalAlign: "-0.3rem", marginRight: "0.5rem" }} />
              {refLink(h.book, h.chapter, h.verse)}{" "}
              <span className="when">added {when(h.createdAt)}</span>
              <div className="actions">
                <button
                  onClick={() => {
                    setHighlight(h, null);
                    setVersion((x) => x + 1);
                  }}
                >
                  Remove
                </button>
              </div>
            </div>
          ))
        ))}

      {tab === "notes" &&
        (notes.length === 0 ? (
          <p className="muted">No notes yet. Tap a verse while reading and choose ✎ Note.</p>
        ) : (
          notes.map((n) => (
            <div className="lib-item" key={`${n.book}-${n.chapter}-${n.verse}`}>
              ✎ {refLink(n.book, n.chapter, n.verse)}{" "}
              <span className="when">updated {when(n.updatedAt)}</span>
              <div className="lib-note">{n.text}</div>
              <div className="actions">
                <button
                  onClick={() => {
                    setNote(n, "");
                    setVersion((x) => x + 1);
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        ))}
    </div>
  );
}
