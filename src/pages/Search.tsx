import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BOOKS, bookDisplayName, getBook } from "../lib/canon";
import { loadBook } from "../lib/data";
import { parseReference } from "../lib/refparse";
import { TRANSLATIONS } from "../lib/translations";
import { useSettings } from "../SettingsContext";

interface Result {
  book: string;
  chapter: number;
  verse: number;
  text: string;
}

const MAX_RESULTS = 300;

/** Case- and accent-insensitive (æ→ae) normalization, so Latin searches just work. */
function fold(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/æ/g, "ae")
    .replace(/œ/g, "oe");
}

export default function Search() {
  const [query, setQuery] = useState("");
  const settings = useSettings();
  const [translation, setTranslation] = useState(settings.translation);
  const [results, setResults] = useState<Result[]>([]);
  const [progress, setProgress] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const runId = useRef(0);
  const navigate = useNavigate();

  const run = async () => {
    const q = query.trim();
    if (q.length < 2) return;

    // "John 3:16"-style input jumps straight to the passage.
    const ref = parseReference(q);
    if (ref && ref.chapter) {
      void navigate(
        `/read/${translation}/${ref.book.slug}/${ref.chapter}${ref.verse ? `?v=${ref.verse}` : ""}`
      );
      return;
    }

    const id = ++runId.current;
    const needle = fold(q);
    const found: Result[] = [];
    setResults([]);
    setSearched(true);
    for (let i = 0; i < BOOKS.length; i++) {
      if (runId.current !== id) return;
      const b = BOOKS[i];
      setProgress(`Searching ${b.name}… (${i + 1}/${BOOKS.length})`);
      try {
        const data = await loadBook(translation, b.slug);
        data.chapters.forEach((ch, ci) => {
          ch.forEach((text, vi) => {
            if (!text) return; // grid-empty slot (see data-report.txt)
            if (found.length < MAX_RESULTS && fold(text).includes(needle)) {
              found.push({ book: b.slug, chapter: ci + 1, verse: vi + 1, text });
            }
          });
        });
        if (runId.current !== id) return;
        setResults([...found]);
        if (found.length >= MAX_RESULTS) break;
      } catch {
        setProgress(null);
        setResults([]);
        setSearched(true);
        return;
      }
    }
    if (runId.current === id) setProgress(null);
  };

  // Fold with an index map back to the original string, so accent-folded
  // matches (query "caelum", text "cælum") highlight the right span (P2-2).
  const foldWithMap = (s: string): { folded: string; map: number[] } => {
    let folded = "";
    const map: number[] = []; // folded index -> original index
    for (let i = 0; i < s.length; i++) {
      const f = fold(s[i]);
      for (let j = 0; j < f.length; j++) map.push(i);
      folded += f;
    }
    return { folded, map };
  };

  const highlight = (text: string) => {
    const needle = fold(query.trim());
    if (!needle) return text;
    const { folded, map } = foldWithMap(text);
    const idx = folded.indexOf(needle);
    if (idx === -1) return text;
    const start = map[idx];
    const last = idx + needle.length - 1;
    // Round outward past a partially consumed source char (query "ca" must
    // mark the whole "cæ", not stop before the ligature).
    const end = last + 1 < map.length ? Math.max(map[last + 1], map[last] + 1) : text.length;
    return (
      <>
        {text.slice(0, start)}
        <mark>{text.slice(start, end)}</mark>
        {text.slice(end)}
      </>
    );
  };

  const tooShort = query.trim().length < 2;

  return (
    <div className="page-narrow" style={{ margin: "0 auto" }}>
      <h1 className="page-title">Search the Scriptures</h1>
      <p className="subtitle small sans">
        Search by word or phrase, or jump to a passage — try <em>mercy</em>,{" "}
        <em>misericordia</em>, or <em>John 3:16</em>.
      </p>
      <div className="search-bar">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !tooShort && run()}
          placeholder="Word, phrase, or reference…"
          autoFocus
        />
        <select value={translation} onChange={(e) => setTranslation(e.target.value)}>
          {TRANSLATIONS.filter((t) => t.bundled).map((t) => (
            <option key={t.id} value={t.id}>
              {t.abbrev}
            </option>
          ))}
        </select>
        <button className="primary" onClick={run} disabled={tooShort}>
          Search
        </button>
      </div>
      {progress && <div className="search-progress">{progress}</div>}
      {!progress && searched && (
        <div className="search-progress">
          {results.length === 0
            ? "No verses found."
            : `${results.length}${results.length >= MAX_RESULTS ? "+" : ""} verses found.`}
        </div>
      )}
      {results.map((r) => {
        const b = getBook(r.book)!;
        return (
          <div className="result" key={`${r.book}-${r.chapter}-${r.verse}`}>
            <div className="ref">
              <Link to={`/read/${translation}/${r.book}/${r.chapter}?v=${r.verse}`}>
                {bookDisplayName(b, translation)} {r.chapter}:{r.verse}
              </Link>
            </div>
            <div>{highlight(r.text)}</div>
          </div>
        );
      })}
    </div>
  );
}
