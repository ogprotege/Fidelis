import { useEffect, useRef, useState } from "react";
import { idbClearTranslation, idbPut, importedTranslations } from "../lib/data";
import { TRANSLATIONS } from "../lib/translations";

// Source book name -> slug, for importing scrollmapper-format JSON of licensed texts.
import { BOOKS } from "../lib/canon";

const IMPORT_NAME_TO_SLUG = new Map<string, string>();
for (const b of BOOKS) {
  for (const alias of [b.name, b.douay, b.slug]) {
    IMPORT_NAME_TO_SLUG.set(alias.toLowerCase(), b.slug);
  }
}
// scrollmapper-style roman numeral names
const ROMAN: [string, string][] = [
  ["i ", "1 "], ["ii ", "2 "], ["iii ", "3 "], ["iv ", "4 "]
];
function toSlug(name: string): string | undefined {
  const n = name.toLowerCase().trim();
  if (IMPORT_NAME_TO_SLUG.has(n)) return IMPORT_NAME_TO_SLUG.get(n);
  for (const [rom, ar] of ROMAN) {
    if (n.startsWith(rom)) {
      const alt = ar + n.slice(rom.length);
      if (IMPORT_NAME_TO_SLUG.has(alt)) return IMPORT_NAME_TO_SLUG.get(alt);
    }
  }
  if (n === "revelation of john" || n === "apocalypse of john") return "revelation";
  if (n === "song of solomon") return "song-of-songs";
  return undefined;
}

export default function Translations() {
  const [imported, setImported] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const pendingId = useRef<string>("");

  const refresh = () => importedTranslations().then(setImported);
  useEffect(() => {
    refresh();
  }, []);

  const startImport = (id: string) => {
    pendingId.current = id;
    setMessage(null);
    fileRef.current?.click();
  };

  const onFile = async (file: File | undefined) => {
    const id = pendingId.current;
    if (!file || !id) return;
    setBusy(id);
    setMessage(null);
    try {
      const json = JSON.parse(await file.text());
      const books: { name: string; chapters: { chapter: number; verses: { verse: number; text: string }[] }[] }[] =
        json.books ?? json;
      if (!Array.isArray(books)) throw new Error("Unrecognized format");
      let count = 0;
      for (const book of books) {
        const slug = toSlug(book.name);
        if (!slug) continue;
        const chapters = book.chapters.map((ch) => ch.verses.map((v) => v.text.trim()));
        await idbPut(`${id}/${slug}`, { translation: id, book: slug, chapters });
        count++;
      }
      if (count === 0) throw new Error("No recognizable books found");
      setMessage(`Imported ${count} books into ${id.toUpperCase()}. Stored only on this device.`);
      await refresh();
    } catch (e) {
      setMessage(`Import failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const remove = async (id: string) => {
    await idbClearTranslation(id);
    await refresh();
  };

  return (
    <div className="page-narrow" style={{ margin: "0 auto" }}>
      <h1 className="page-title">Translations</h1>
      <p className="subtitle">
        Every bundled text is public domain and presented <strong>verbatim</strong> — no
        paraphrase, no softening, no silent edits.
      </p>
      <input
        ref={fileRef}
        type="file"
        accept="application/json"
        style={{ display: "none" }}
        onChange={(e) => onFile(e.target.files?.[0])}
      />
      {message && <div className="notice" style={{ marginBottom: "1rem" }}>{message}</div>}
      {TRANSLATIONS.map((t) => (
        <div className="card trans-card" id={t.id} key={t.id}>
          <h3 className="trans-name">
            {t.name}
            {t.bundled ? (
              <span className="badge pd">Public domain · bundled</span>
            ) : imported.has(t.id) ? (
              <span className="badge imported">Imported on this device</span>
            ) : (
              <span className="badge copyright">Copyrighted · not bundled</span>
            )}
          </h3>
          <p className="trans-meta">
            {t.abbrev} · {t.language === "la" ? "Latin" : "English"} · {t.year}
            {t.copyright ? ` · ${t.copyright}` : ""}
          </p>
          <p style={{ margin: 0 }}>{t.description}</p>
          {!t.bundled && (
            <div className="import-zone">
              {imported.has(t.id) ? (
                <button className="icon-btn" onClick={() => remove(t.id)}>
                  Remove imported text
                </button>
              ) : (
                <>
                  <button className="icon-btn" onClick={() => startImport(t.id)} disabled={busy !== null}>
                    {busy === t.id ? "Importing…" : `Import your licensed ${t.abbrev} (JSON)`}
                  </button>
                  <p className="muted small" style={{ marginTop: "0.4rem" }}>
                    Expected format: <code>{"{ books: [{ name, chapters: [{ chapter, verses: [{ verse, text }] }] }] }"}</code>.
                    The file never leaves your device — it is stored in your browser only.
                  </p>
                </>
              )}
            </div>
          )}
        </div>
      ))}
      <p className="muted small sans">
        Why aren't the RSV-2CE and NABRE included? Their copyright holders (Ignatius
        Press and the Confraternity of Christian Doctrine) do not permit free
        redistribution of the full text. Rather than ship an unauthorized or altered
        copy, this app ships none — and lets you import a copy you have licensed.
      </p>
    </div>
  );
}
