import { getTranslation } from "./translations";
import { expandCatenaSpans, isCatenaSpanDoc } from "./commentary";
import type { SaintDay } from "./saints";
import type { HistoryDay } from "./history";
import type { CccTextDoc, ImportedBook } from "./import-formats";
import {
  executeImportPlan,
  keyFor,
  parseKey,
  planImport,
  validateCorpus,
  type ImportStore
} from "./importPlan";

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
    // Don't memoize a null: an offline blip must not disable offline downloads
    // (Settings → Data) and the About integrity line until a full reload.
    void manifestPromise.then((m) => {
      if (m === null) manifestPromise = null;
    });
  }
  return manifestPromise;
}

const DB_NAME = "fidelis-imported";
const DB_VERSION = 3;
const STORE = "books";
const CCC_STORE = "ccc";
const CCC_KEY = "text";
/** v1.18.0 (audit FID-DATA-001): the tiny store holding one `active:<translation>`
 *  → generation record per import. The marker is the atomic swap — flipping it
 *  is the single write that makes a freshly staged corpus visible. No marker =
 *  generation 0 = the legacy `translation/book` keys, so pre-v1.18 imports
 *  keep reading with no migration. */
const META_STORE = "meta";
const activeKey = (translation: string) => `active:${translation}`;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      // Idempotent: covers a fresh install (oldVersion 0) and every upgrade
      // path (1→3, 2→3). Existing stores are preserved — only added if absent.
      if (!req.result.objectStoreNames.contains(STORE)) {
        req.result.createObjectStore(STORE);
      }
      if (!req.result.objectStoreNames.contains(CCC_STORE)) {
        req.result.createObjectStore(CCC_STORE);
      }
      if (!req.result.objectStoreNames.contains(META_STORE)) {
        req.result.createObjectStore(META_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** One-shot request helpers against an open db (each in its own transaction). */
function reqGet<T>(db: IDBDatabase, store: string, key: string): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    const req = db.transaction(store, "readonly").objectStore(store).get(key);
    req.onsuccess = () => resolve(req.result as T | undefined);
    req.onerror = () => reject(req.error);
  });
}

function reqPut(db: IDBDatabase, store: string, key: string, value: unknown): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readwrite");
    tx.objectStore(store).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

async function activeGenOf(db: IDBDatabase, translation: string): Promise<number> {
  const gen = await reqGet<number>(db, META_STORE, activeKey(translation));
  return typeof gen === "number" && Number.isFinite(gen) ? gen : 0;
}

/** Read a book from the translation's ACTIVE generation (staged writes from an
 *  unfinished import are invisible by construction). */
async function idbGetBook(translation: string, book: string): Promise<BookData | undefined> {
  const db = await openDb();
  try {
    const gen = await activeGenOf(db, translation);
    return await reqGet<BookData>(db, STORE, keyFor(translation, gen, book));
  } finally {
    db.close();
  }
}

async function idbListKeys(db: IDBDatabase): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE, "readonly").objectStore(STORE).getAllKeys();
    req.onsuccess = () => resolve(req.result as string[]);
    req.onerror = () => reject(req.error);
  });
}

/** Remove an imported translation entirely: every generation's keys AND the
 *  active marker, so a later import starts from a clean gen history. */
export async function idbClearTranslation(translation: string): Promise<void> {
  const db = await openDb();
  try {
    const keys = (await idbListKeys(db)).filter(
      (k) => parseKey(k).translation === translation
    );
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction([STORE, META_STORE], "readwrite");
      const store = tx.objectStore(STORE);
      for (const k of keys) store.delete(k);
      tx.objectStore(META_STORE).delete(activeKey(translation));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
  for (const k of memCache.keys()) if (k.startsWith(`${translation}/`)) memCache.delete(k);
}

/** Which non-bundled translations have imported text available — a translation
 *  counts only when its ACTIVE generation has books, so a crashed import's
 *  orphaned staging keys can never present a translation as imported. */
export async function importedTranslations(): Promise<Set<string>> {
  try {
    const db = await openDb();
    try {
      const keys = await idbListKeys(db);
      const present = new Set<string>();
      const gens = new Map<string, number>();
      for (const key of keys) {
        const { translation, gen } = parseKey(key);
        if (present.has(translation)) continue;
        let active = gens.get(translation);
        if (active === undefined) {
          active = await activeGenOf(db, translation);
          gens.set(translation, active);
        }
        if (gen === active) present.add(translation);
      }
      return present;
    } finally {
      db.close();
    }
  } catch {
    return new Set();
  }
}

/** The atomic import (v1.18.0, FID-DATA-001/FID-FUNC-009): validate the whole
 *  corpus, stage every book under a fresh generation, flip the active marker
 *  only after every write succeeded, then sweep every superseded key. The
 *  logic is the pure `importPlan` module; this supplies the IndexedDB store.
 *  On any failure the marker is unflipped, so the prior corpus — including
 *  "no corpus" — is untouched. */
export async function stageAndSwapImport(
  translation: string,
  books: ImportedBook[],
  onProgress?: (done: number, total: number) => void
): Promise<number> {
  const validated = validateCorpus(translation, books);
  const db = await openDb();
  try {
    const plan = planImport(
      translation,
      await activeGenOf(db, translation),
      await idbListKeys(db),
      validated
    );
    const store: ImportStore = {
      put: (key, data) => reqPut(db, STORE, key, data),
      setActive: (t, gen) => reqPut(db, META_STORE, activeKey(t), gen),
      deleteKeys: (keys) =>
        new Promise<void>((resolve, reject) => {
          const tx = db.transaction(STORE, "readwrite");
          for (const k of keys) tx.objectStore(STORE).delete(k);
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
          tx.onabort = () => reject(tx.error);
        })
    };
    const count = await executeImportPlan(plan, store, onProgress);
    // The swap changed what this translation's keys resolve to.
    for (const k of memCache.keys()) if (k.startsWith(`${translation}/`)) memCache.delete(k);
    return count;
  } finally {
    db.close();
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
  cccTextPromise ??= idbGetCcc().catch(() => {
    // An IDB read failure yields null for THIS call but is not memoized, so the
    // next call retries and the imported Catechism reappears. "No import yet"
    // resolves null above (never rejects) and stays cached — correct.
    cccTextPromise = null;
    return null;
  });
  return cccTextPromise;
}

export function loadBook(translation: string, book: string): Promise<BookData> {
  const key = `${translation}/${book}`;
  let p = memCache.get(key);
  if (!p) {
    p = (async () => {
      const t = getTranslation(translation);
      if (t && !t.bundled) {
        const data = await idbGetBook(translation, book);
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
      const raw: unknown = await res.json();
      // The Catena ships de-duplicated (format 2: one chain per pericope, keyed
      // by the verses it covers) and expands here to the per-verse map. Legacy
      // per-verse files (Haydock; a stale data cache) pass through unchanged.
      return isCatenaSpanDoc(raw) ? (expandCatenaSpans(raw) as CommentaryBook) : (raw as CommentaryBook);
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
  })().catch(() => {
    // A transport failure (offline blip) yields empty maps for THIS call but is
    // not memoized, so the purple CCC marks return once the network does. A 404
    // (the layer isn't built) resolves to {} above and stays cached — correct.
    cccPromise = null;
    return { index: {}, url: {} };
  });
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
    .catch(() => {
      // Transport failure: don't memoize, so the Catechism sheet recovers once
      // the network does (a built-but-unreachable layer is not a missing one).
      trentPromise = null;
      return null;
    });
  return trentPromise;
}

/** The memory of the just — Saint of the Day. One file per calendar date. A 404
 *  (no entry in the corpus) resolves to null and stays cached — genuine, calm
 *  absence. Anything else — offline blip, HTTP error, bad JSON — REJECTS and
 *  drops the key (the loadCommentary retry-after-rejection), so callers can
 *  show an honest failure state instead of a false "no saint today" (v1.21.0,
 *  audit sweep: with all 366 dates covered, a swallowed transport failure made
 *  Home's "being gathered" line a false statement). */
const saintsCache = new Map<string, Promise<SaintDay | null>>();
export function loadSaints(day: string): Promise<SaintDay | null> {
  let p = saintsCache.get(day);
  if (!p) {
    p = fetch(`${import.meta.env.BASE_URL}data/saints/${day}.json`)
      .then((r) => {
        if (r.status === 404) return null;
        if (!r.ok) throw new Error(`saints ${day}: HTTP ${r.status}`);
        return r.json() as Promise<SaintDay>;
      })
      .catch((err) => {
        saintsCache.delete(day);
        throw err;
      });
    saintsCache.set(day, p);
  }
  return p;
}

/** The memory of the just — Today in Church History. Same per-date, memoized,
 *  404-is-absence / failure-rejects contract as loadSaints. */
const historyCache = new Map<string, Promise<HistoryDay | null>>();
export function loadHistory(day: string): Promise<HistoryDay | null> {
  let p = historyCache.get(day);
  if (!p) {
    p = fetch(`${import.meta.env.BASE_URL}data/history/${day}.json`)
      .then((r) => {
        if (r.status === 404) return null;
        if (!r.ok) throw new Error(`history ${day}: HTTP ${r.status}`);
        return r.json() as Promise<HistoryDay>;
      })
      .catch((err) => {
        historyCache.delete(day);
        throw err;
      });
    historyCache.set(day, p);
  }
  return p;
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

/** The service worker's data cache. MUST equal public/sw.js's DATA_CACHE —
 *  sw.js is a plain public file the app can't import from, so the harness
 *  (§33) pins the two literals against each other instead. */
export const DATA_CACHE = "fidelis-data-v2";

export interface OfflineBundleStatus {
  present: number;
  total: number;
  complete: boolean;
}

/** Cache TRUTH for a bundle's offline availability (v1.18.0, audit
 *  FID-FUNC-008): probe Cache Storage for every file the manifest lists under
 *  the bundle before the UI may say "Saved" — the browser can evict the data
 *  cache while the lightweight localStorage record still says yes. Returns
 *  null when the truth is unknowable (no manifest, no CacheStorage), in which
 *  case the caller falls back to the record as presentation metadata only. */
export async function verifyOfflineBundle(bundle: string): Promise<OfflineBundleStatus | null> {
  const m = await loadManifest();
  if (!m || !("caches" in globalThis)) return null;
  const files = Object.keys(m.files).filter((rel) => rel.startsWith(`${bundle}/`));
  if (files.length === 0) return null;
  try {
    const cache = await caches.open(DATA_CACHE);
    let present = 0;
    for (const rel of files) {
      if (await cache.match(`${import.meta.env.BASE_URL}data/${rel}`)) present++;
    }
    return { present, total: files.length, complete: present === files.length };
  } catch {
    return null;
  }
}
