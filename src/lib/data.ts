import { getTranslation } from "./translations";
import type { CccTextDoc } from "./import-formats";

export interface BookData {
  translation: string;
  book: string;
  /** chapters[ci][vi] = verse text (1-indexed in references, 0-indexed here) */
  chapters: string[][];
}

/** Per-bundle file count and byte total, emitted by build-manifest.mjs from the
 *  same file walk that hashes the corpus (so the size is real, not guessed). */
export interface BundleInfo {
  files: number;
  bytes: number;
}

/** The sealed data manifest (public/data/manifest.json, P1-10) as the client
 *  reads it: the integrity surface plus the §2.2 per-bundle download sizes. */
export interface ManifestDoc {
  rootHash: string;
  fileCount: number;
  sources: Record<string, { repo: string; commit: string }>;
  files: Record<string, string>;
  bundles?: Record<string, BundleInfo>;
}

const memCache = new Map<string, Promise<BookData>>();

let manifestPromise: Promise<ManifestDoc | null> | null = null;

/** Fetch and cache the data manifest once per session. Used by About (the
 *  integrity line) and Settings (per-bundle sizes + the offline file list). */
export function loadManifest(): Promise<ManifestDoc | null> {
  if (!manifestPromise) {
    manifestPromise = fetch(`${import.meta.env.BASE_URL}data/manifest.json`)
      .then((r) => (r.ok ? (r.json() as Promise<ManifestDoc>) : null))
      .catch(() => null);
  }
  return manifestPromise;
}

const DB_NAME = "fidelis-imported";
const DB_VERSION = 2;
const STORE = "books";
const CCC_STORE = "ccc";
const CCC_KEY = "text";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      // Idempotent: covers a fresh install (oldVersion 0) and the 1→2 upgrade.
      // The books store (NABRE/RSV-2CE imports) is preserved — only added if absent.
      if (!req.result.objectStoreNames.contains(STORE)) {
        req.result.createObjectStore(STORE);
      }
      if (!req.result.objectStoreNames.contains(CCC_STORE)) {
        req.result.createObjectStore(CCC_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGet(key: string): Promise<BookData | undefined> {
  const db = await openDb();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  } finally {
    db.close();
  }
}

export async function idbPut(key: string, value: BookData): Promise<void> {
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

export async function idbListKeys(): Promise<string[]> {
  const db = await openDb();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).getAllKeys();
      req.onsuccess = () => resolve(req.result as string[]);
      req.onerror = () => reject(req.error);
    });
  } finally {
    db.close();
  }
}

export async function idbClearTranslation(translation: string): Promise<void> {
  const keys = await idbListKeys();
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      const store = tx.objectStore(STORE);
      for (const k of keys) if (k.startsWith(`${translation}/`)) store.delete(k);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
  for (const k of memCache.keys()) if (k.startsWith(`${translation}/`)) memCache.delete(k);
}

/** Which non-bundled translations have imported text available. */
export async function importedTranslations(): Promise<Set<string>> {
  try {
    const keys = await idbListKeys();
    return new Set(keys.map((k) => k.split("/")[0]));
  } catch {
    return new Set();
  }
}

/** The modern Catechism the owner imported — never bundled (spec §6). Stored
 *  under one key in the ccc store as { edition, language, paragraphs }. */
export type CCCText = CccTextDoc;

/** Persist the owner's imported CCC text (replaces any prior import). */
export async function idbPutCcc(doc: CCCText): Promise<void> {
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(CCC_STORE, "readwrite");
      tx.objectStore(CCC_STORE).put(doc, CCC_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
  cccTextPromise = null; // a fresh import must be seen by the next loadCCCText()
}

/** Read the owner's imported CCC text, or null if none. */
export async function idbGetCcc(): Promise<CCCText | null> {
  const db = await openDb();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(CCC_STORE, "readonly");
      const req = tx.objectStore(CCC_STORE).get(CCC_KEY);
      req.onsuccess = () => resolve((req.result as CCCText | undefined) ?? null);
      req.onerror = () => reject(req.error);
    });
  } finally {
    db.close();
  }
}

/** Remove the imported Catechism ("Remove imported Catechism"). */
export async function idbClearCcc(): Promise<void> {
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(CCC_STORE, "readwrite");
      tx.objectStore(CCC_STORE).delete(CCC_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
  cccTextPromise = null;
}

let cccTextPromise: Promise<CCCText | null> | null = null;
/** The owner's imported modern CCC, memoized like loadCCC; the memo is cleared
 *  by idbPutCcc/idbClearCcc so the supersede tier flips live after an import. */
export function loadCCCText(): Promise<CCCText | null> {
  cccTextPromise ??= idbGetCcc().catch(() => null);
  return cccTextPromise;
}

export function loadBook(translation: string, book: string): Promise<BookData> {
  const key = `${translation}/${book}`;
  let p = memCache.get(key);
  if (!p) {
    p = (async () => {
      const t = getTranslation(translation);
      if (t && !t.bundled) {
        const data = await idbGet(key);
        if (!data) {
          throw new Error(
            `${t.abbrev} is under copyright and not bundled. Import a licensed copy from the Translations page.`
          );
        }
        return data;
      }
      const res = await fetch(`${import.meta.env.BASE_URL}data/${translation}/${book}.json`);
      if (!res.ok) throw new Error(`Could not load ${translation}/${book} (HTTP ${res.status})`);
      return (await res.json()) as BookData;
    })();
    p.catch(() => memCache.delete(key));
    memCache.set(key, p);
  }
  return p;
}

export async function getVerseText(
  translation: string,
  book: string,
  chapter: number,
  verse: number
): Promise<string | undefined> {
  const data = await loadBook(translation, book);
  return data.chapters[chapter - 1]?.[verse - 1];
}

/** One Catena/Haydock note (spec §4.1): Haydock carries a `src` attribution,
 *  the Catena a `father`. Keyed "chapter:verse". */
export interface CommentaryNote {
  src?: string;
  father?: string;
  text: string;
}
export type CommentaryBook = Record<string, CommentaryNote[]>;

const commentaryCache = new Map<string, Promise<CommentaryBook>>();

/** Lazy-load a book's commentary (spec §4.2), riding the same promise-deduped
 *  cache as loadBook and the service worker's /data/ handler. `corpus` is
 *  "haydock" | "catena". A 404 — an appendix book with no Haydock, a non-Gospel
 *  with no Catena — resolves to {}, never an error the Reader must handle. */
export function loadCommentary(corpus: string, book: string): Promise<CommentaryBook> {
  const key = `${corpus}/${book}`;
  let p = commentaryCache.get(key);
  if (!p) {
    p = (async () => {
      const res = await fetch(`${import.meta.env.BASE_URL}data/commentary/${corpus}/${book}.json`);
      if (res.status === 404) return {};
      if (!res.ok) throw new Error(`Could not load commentary ${corpus}/${book} (HTTP ${res.status})`);
      return (await res.json()) as CommentaryBook;
    })();
    p.catch(() => commentaryCache.delete(key));
    commentaryCache.set(key, p);
  }
  return p;
}

/** Spec §5 — the CCC citation index (facts only): verse → CCC ¶ numbers, and
 *  ¶ → its vatican.va page. The Catechism text is never bundled. */
export interface CCCData {
  index: Record<string, number[]>;
  url: Record<string, string>;
}
let cccPromise: Promise<CCCData> | null = null;
/** Load the small CCC index + url maps once, memoized like loadCommentary. A 404
 *  (the layer isn't built) yields empty maps, never an error the Reader handles. */
export function loadCCC(): Promise<CCCData> {
  cccPromise ??= (async () => {
    const base = import.meta.env.BASE_URL;
    const [index, url] = await Promise.all([
      fetch(`${base}data/ccc/index.json`).then((r) => (r.ok ? (r.json() as Promise<CCCData["index"]>) : {})),
      fetch(`${base}data/ccc/url.json`).then((r) => (r.ok ? (r.json() as Promise<CCCData["url"]>) : {}))
    ]);
    return { index, url };
  })().catch(() => ({ index: {}, url: {} }));
  return cccPromise;
}

/** Spec §5 (text tier) — the bundled PUBLIC-DOMAIN Roman Catechism (Trent),
 *  browsable by Part → section (it has no verse keys; the §5 index keeps verse
 *  precision). Each edition ships in one file, keyed by edition id, so a future
 *  Donovan edition slots in with no shape change. The modern CCC text is NEVER
 *  here. `html` is build-sealed, paragraphs-only structural HTML (<h4>/<p>). */
export interface TrentSection { id: string; title: string; html: string; }
export interface TrentPart { id: string; title: string; sections: TrentSection[]; }
export interface TrentEdition {
  edition: string;
  source: string;
  license: string;
  parts: TrentPart[];
}
export interface TrentFile {
  editions: Partial<Record<import("./catechism").TrentEditionId, TrentEdition>>;
}

let trentPromise: Promise<TrentFile | null> | null = null;
/** Load the bundled Trent corpus once, memoized like loadCCC. A 404 (the layer
 *  isn't built) yields null, never an error the sheet must handle. */
export function loadTrent(): Promise<TrentFile | null> {
  trentPromise ??= fetch(`${import.meta.env.BASE_URL}data/trent/trent.json`)
    .then((r) => (r.ok ? (r.json() as Promise<TrentFile>) : null))
    .catch(() => null);
  return trentPromise;
}

/** Save a bundled translation for offline reading (spec §2.2 Data): fetch every
 *  file the manifest lists under `${translation}/`, which the service worker's
 *  cache-first /data/ handler persists into its data cache. The manifest is
 *  the authoritative file list, so this exactly mirrors what ships. Returns the
 *  number of files fetched; `onProgress` reports as each completes. */
export async function downloadBundle(
  translation: string,
  onProgress?: (done: number, total: number) => void
): Promise<number> {
  const m = await loadManifest();
  if (!m) throw new Error("The data manifest is unavailable; cannot download offline.");
  const prefix = `${translation}/`;
  const files = Object.keys(m.files).filter((rel) => rel.startsWith(prefix));
  if (files.length === 0) throw new Error(`No bundled files found for ${translation}.`);
  let done = 0;
  let failed = 0;
  onProgress?.(0, files.length);
  for (const rel of files) {
    try {
      // fetch() rejects only on a transport failure, so a 404/500 must be
      // caught by res.ok — the service worker likewise caches only res.ok, so
      // a non-OK file is NOT saved and we must not claim the bundle is offline.
      const res = await fetch(`${import.meta.env.BASE_URL}data/${rel}`);
      if (!res.ok) failed++;
    } catch {
      failed++;
    }
    done++;
    onProgress?.(done, files.length);
  }
  if (failed > 0) {
    throw new Error(`${failed} of ${files.length} files could not be saved — please retry with a connection.`);
  }
  return done;
}
