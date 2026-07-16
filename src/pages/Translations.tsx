import { useEffect, useRef, useState } from "react";
import { idbClearTranslation, importedTranslations, stageAndSwapImport } from "../lib/data";
import { TRANSLATIONS, languageLabel } from "../lib/translations";
import { checkImportSize, describeStorageError } from "../lib/importPlan";
import { normalizeImport, parseImport, type ImportedBook } from "../lib/import-formats";
import type { ImportWorkerRequest, ImportWorkerResponse } from "../lib/import.worker";

/** Parse + normalize off the main thread (v1.18.0, audit FID-DATA-001): a
 *  whole-Bible parse over tens of MB froze the UI. One short-lived Worker per
 *  import; the direct call remains as the no-Worker fallback (old WebViews,
 *  test environments) — same pure functions either way. */
function parseInWorker(id: string, filename: string, text: string): Promise<ImportedBook[]> {
  if (typeof Worker === "undefined") {
    return Promise.resolve(normalizeImport(id, parseImport(filename, text)));
  }
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("../lib/import.worker.ts", import.meta.url), {
      type: "module"
    });
    worker.onmessage = (e: MessageEvent<ImportWorkerResponse>) => {
      worker.terminate();
      if (e.data.ok) resolve(e.data.books);
      else reject(new Error(e.data.error));
    };
    worker.onerror = () => {
      worker.terminate();
      reject(new Error("The import parser failed to start — please try again."));
    };
    worker.postMessage({ id, filename, text } satisfies ImportWorkerRequest);
  });
}

export default function Translations() {
  const [imported, setImported] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const pendingId = useRef<string>("");

  const refresh = () => importedTranslations().then(setImported).catch(() => {});
  useEffect(() => {
    void refresh();
  }, []);

  const startImport = (id: string) => {
    pendingId.current = id;
    setMessage(null);
    fileRef.current?.click();
  };

  const onFile = async (file: File | undefined) => {
    const id = pendingId.current;
    if (!file || !id) return;
    setMessage(null);
    // The size gate runs BEFORE the file is read into memory (FID-DATA-001:
    // oversized files fail before full read/parse).
    const oversize = checkImportSize(file.size);
    if (oversize) {
      setMessage(`Import failed: ${oversize}`);
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    setBusy(id);
    try {
      // normalizeImport (inside the worker) places the text on the app's
      // Vulgate grid; it never alters the text itself. stageAndSwapImport then
      // validates the WHOLE corpus, stages it under a fresh generation, flips
      // the active marker only after every write succeeded, and sweeps the old
      // keys — so a mid-import failure leaves the prior text untouched, and a
      // smaller replacement corpus retains no stale books.
      const books = await parseInWorker(id, file.name, await file.text());
      const count = await stageAndSwapImport(id, books, (done, total) =>
        setProgress({ done, total })
      );
      setMessage(`Imported ${count} books into ${id.toUpperCase()}. Kept on this device — never uploaded.`);
      await refresh();
    } catch (e) {
      setMessage(`Import failed: ${describeStorageError(e)}`);
    } finally {
      setBusy(null);
      setProgress(null);
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
        accept=".json,.usfm,.sfm,.osis,.xml,application/json,text/xml"
        style={{ display: "none" }}
        onChange={(e) => onFile(e.target.files?.[0])}
      />
      {message && <div className="notice" style={{ marginBottom: "1rem" }}>{message}</div>}
      {TRANSLATIONS.map((t) => (
        <div className="card trans-card" id={t.id} key={t.id}>
          <h2 className="trans-name">
            {t.name}
            {t.bundled ? (
              <span className="badge pd">Public domain · bundled</span>
            ) : imported.has(t.id) ? (
              <span className="badge imported">Imported on this device</span>
            ) : (
              <span className="badge copyright">Copyrighted · not bundled</span>
            )}
          </h2>
          <p className="trans-meta">
            {t.abbrev} · {languageLabel(t)} · {t.year}
            {t.copyright ? ` · ${t.copyright}` : ""}
          </p>
          <p style={{ margin: 0 }}>{t.description}</p>
          {!t.bundled && (
            <div className="import-zone">
              {imported.has(t.id) ? (
                <>
                  {/* Replace rides the same atomic swap as a first import: the
                      old text stays readable until the new corpus has fully
                      landed, and nothing of it survives the sweep (v1.18.0). */}
                  <button className="icon-btn" onClick={() => startImport(t.id)} disabled={busy !== null}>
                    {busy === t.id
                      ? progress
                        ? `Importing… ${progress.done}/${progress.total}`
                        : "Importing…"
                      : "Replace imported text"}
                  </button>{" "}
                  <button className="icon-btn" onClick={() => remove(t.id)} disabled={busy !== null}>
                    Remove imported text
                  </button>
                </>
              ) : (
                <>
                  <button className="icon-btn" onClick={() => startImport(t.id)} disabled={busy !== null}>
                    {busy === t.id
                      ? progress
                        ? `Importing… ${progress.done}/${progress.total}`
                        : "Importing…"
                      : `Import your licensed ${t.abbrev}`}
                  </button>
                  <p className="muted small" style={{ marginTop: "0.4rem" }}>
                    Accepts <strong>USFM</strong> (.usfm), <strong>OSIS</strong> (.xml), or
                    scrollmapper-style <strong>JSON</strong>
                    (<code>{"{ books: [{ name, chapters: [{ verses: [{ text }] }] }] }"}</code>).
                    Fidelis never uploads the file — it is stored in the app on this device.
                  </p>
                </>
              )}
            </div>
          )}
        </div>
      ))}
      <p className="muted small sans">
        Why aren't the RSV-2CE, NABRE, and Biblia Platense included? Their texts are
        not freely redistributable — the RSV-2CE and NABRE are under copyright
        (Ignatius Press; the Confraternity of Christian Doctrine), and the Platense's
        U.S. term has not clearly expired. Rather than ship an unauthorized or altered
        copy, this app ships none — and lets you import a copy you may lawfully use.
      </p>
    </div>
  );
}
