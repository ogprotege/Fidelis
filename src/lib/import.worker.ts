/** The import parser, off the main thread (v1.18.0, audit FID-DATA-001): a
 *  whole-Bible USFM/OSIS parse over tens of MB froze the UI when it ran on the
 *  main thread. The parsers are pure string work (the OSIS path is regex, no
 *  DOMParser), so they run unchanged in a Worker; Translations.tsx posts
 *  { id, filename, text } and gets back the normalized books or the error
 *  message. (Typed against the DOM lib: in a dedicated worker `self` supports
 *  the same single-argument postMessage overload.)
 */
import { normalizeImport, parseImport, type ImportedBook } from "./import-formats";

export interface ImportWorkerRequest {
  id: string;
  filename: string;
  text: string;
}

export type ImportWorkerResponse =
  | { ok: true; books: ImportedBook[] }
  | { ok: false; error: string };

self.onmessage = (e: MessageEvent<ImportWorkerRequest>) => {
  const { id, filename, text } = e.data;
  let response: ImportWorkerResponse;
  try {
    response = { ok: true, books: normalizeImport(id, parseImport(filename, text)) };
  } catch (err) {
    response = { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
  self.postMessage(response);
};
