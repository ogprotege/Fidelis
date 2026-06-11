import { getTranslation } from "./translations";

export interface BookData {
  translation: string;
  book: string;
  /** chapters[ci][vi] = verse text (1-indexed in references, 0-indexed here) */
  chapters: string[][];
}

const memCache = new Map<string, Promise<BookData>>();

const DB_NAME = "fidelis-imported";
const DB_VERSION = 1;
const STORE = "books";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) {
        req.result.createObjectStore(STORE);
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
