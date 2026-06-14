import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { bookDisplayName, getBook } from "../lib/canon";
import Icon from "../components/Icon";
import {
  exportMarginalia,
  getBookmarks,
  getHighlights,
  getNotes,
  importMarginalia,
  setHighlight,
  setNote,
  toggleBookmark
} from "../lib/storage";
import { useSettings } from "../SettingsContext";

type Tab = "bookmarks" | "highlights" | "notes";

export default function Library() {
  const [tab, setTab] = useState<Tab>("bookmarks");
  const [version, setVersion] = useState(0);
  const [transfer, setTransfer] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  void version;
  const translation = useSettings().translation;

  const doExport = () => {
    const data = exportMarginalia();
    const blob = new Blob([JSON.stringify(data, null, 1)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `fidelis-library-${data.exportedAt.slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    setTransfer(
      `Exported ${data.bookmarks.length} bookmark(s), ${data.highlights.length} highlight(s), ${data.notes.length} note(s).`
    );
  };

  const doImport = async (file: File) => {
    try {
      const counts = importMarginalia(await file.text());
      setVersion((x) => x + 1);
      setTransfer(
        `Imported ${counts.bookmarks} bookmark(s), ${counts.highlights} highlight(s), ${counts.notes} note(s) — merged with what was here; where both had an entry for the same verse, the newer one was kept.`
      );
    } catch (e) {
      setTransfer(e instanceof Error ? e.message : "Could not read that file.");
    }
  };

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
        <span className="spacer" />
        <button className="icon-btn" onClick={doExport} title="Download bookmarks, highlights, and notes as JSON">
          ↓ Export
        </button>
        <button
          className="icon-btn"
          onClick={() => fileRef.current?.click()}
          title="Merge a previously exported Fidelis library file"
        >
          ↑ Import
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          style={{ display: "none" }}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) doImport(f);
            e.target.value = "";
          }}
        />
      </div>
      {transfer && <p className="muted small sans">{transfer}</p>}
      <p className="muted small sans">
        Your library lives only in this browser — export it now and then so a
        lost device does not take your marginalia with it.
      </p>

      {tab === "bookmarks" &&
        (bookmarks.length === 0 ? (
          <p className="muted">No bookmarks yet. Tap a verse while reading to add one.</p>
        ) : (
          bookmarks.map((bm) => (
            <div className="lib-item" key={`${bm.book}-${bm.chapter}-${bm.verse}`}>
              <span className="lib-mark"><Icon name="bookmark" /></span> {refLink(bm.book, bm.chapter, bm.verse)}{" "}
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
          <p className="muted">No notes yet. Tap a verse while reading and choose <Icon name="note" /> Note.</p>
        ) : (
          notes.map((n) => (
            <div className="lib-item" key={`${n.book}-${n.chapter}-${n.verse}`}>
              <span className="lib-mark"><Icon name="note" /></span> {refLink(n.book, n.chapter, n.verse)}{" "}
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
