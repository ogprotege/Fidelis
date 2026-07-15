/** The atomic Bible-import planner (v1.18.0, audit FID-DATA-001 / FID-FUNC-009).
 *
 *  PURE and adapter-driven: everything that decides WHAT an import does — the
 *  size bound, corpus validation, the staging keys, the active-version flip,
 *  which old keys become garbage — lives here with no IndexedDB in sight, so
 *  the harness (§33) can drive the acceptance criteria as real logic tests:
 *  an injected mid-import write failure must leave the prior corpus untouched,
 *  and a smaller re-import must retain no stale books. `src/lib/data.ts`
 *  supplies the real IndexedDB `ImportStore`; the fake in the harness supplies
 *  the failures.
 *
 *  The key grammar is the migration: generation 0 IS the legacy key shape
 *  (`translation/book`), so every existing install is already "at gen 0" and
 *  the first staged import simply writes gen 1 beside it, flips the marker,
 *  and sweeps the old keys. No data migration ever runs.
 */
import type { BookData } from "./data";
import { importedBookHasText, resolveBookSlug, type ImportedBook } from "./import-formats";

/** The documented import bound. A whole-Bible corpus is single-digit MB as
 *  JSON and a few tens as verbose OSIS; 64 MiB is far above any real file
 *  while still refusing the accidental video/PDF before `file.text()` pulls
 *  it into memory (FID-DATA-001: oversized files fail before full read). */
export const MAX_IMPORT_BYTES = 64 * 1024 * 1024;

/** Null when the file may be read; otherwise the refusal, naming the bound. */
export function checkImportSize(bytes: number): string | null {
  if (bytes <= MAX_IMPORT_BYTES) return null;
  const mb = Math.round(bytes / (1024 * 1024));
  return (
    `This file is ${mb} MB — larger than the 64 MB import bound. ` +
    `A Bible corpus (JSON, USFM, or OSIS) is far smaller; export just the Bible text and try again.`
  );
}

/** Gen 0 is the legacy `translation/book` key; staged gens are `translation@gen/book`.
 *  Slugs are lowercase kebab (never contain "@" or "/"), so the grammar is unambiguous. */
export function keyFor(translation: string, gen: number, book: string): string {
  return gen === 0 ? `${translation}/${book}` : `${translation}@${gen}/${book}`;
}

export function parseKey(key: string): { translation: string; gen: number; book: string } {
  const slash = key.indexOf("/");
  const head = slash === -1 ? key : key.slice(0, slash);
  const book = slash === -1 ? "" : key.slice(slash + 1);
  const at = head.indexOf("@");
  if (at === -1) return { translation: head, gen: 0, book };
  const gen = Number(head.slice(at + 1));
  return { translation: head.slice(0, at), gen: Number.isFinite(gen) ? gen : 0, book };
}

export interface ValidatedBook {
  slug: string;
  data: BookData;
}

/** Validate the WHOLE normalized corpus before any write (FID-DATA-001):
 *  resolve every book name to an app slug, skip textless placeholders (the
 *  v1.15.0 alias-clobber guard), verify the chapter/verse layout is really
 *  strings-in-arrays (a malformed JSON must fail here, not persist), and
 *  refuse an empty result. Later duplicates win, matching the old write-loop
 *  order, so behavior is unchanged for corpora that repeat a book. */
export function validateCorpus(translation: string, books: ImportedBook[]): ValidatedBook[] {
  const bySlug = new Map<string, ValidatedBook>();
  for (const book of books) {
    const slug = resolveBookSlug(book.name);
    if (!slug || !book.chapters.length) continue;
    // Structure FIRST: importedBookHasText assumes verse strings, so a
    // malformed layout must be named here, not surface as a bare TypeError.
    for (let ci = 0; ci < book.chapters.length; ci++) {
      const ch = book.chapters[ci];
      if (!Array.isArray(ch) || ch.some((v) => typeof v !== "string")) {
        throw new Error(
          `The book "${book.name}" is not a Bible text layout (chapter ${ci + 1} is not a list of verse strings).`
        );
      }
    }
    if (!importedBookHasText(book)) continue;
    bySlug.set(slug, { slug, data: { translation, book: slug, chapters: book.chapters } });
  }
  if (bySlug.size === 0) {
    throw new Error("No recognizable books found — expected a JSON, USFM, or OSIS Bible file.");
  }
  return [...bySlug.values()];
}

export interface ImportWrite {
  key: string;
  data: BookData;
}

export interface ImportPlan {
  translation: string;
  gen: number;
  writes: ImportWrite[];
  /** EVERY key of the translation outside the new gen — the legacy corpus,
   *  superseded gens, and any orphans a crashed import left behind. Deleted
   *  only after the flip; sweeping them is what makes a smaller re-import
   *  retain no stale books (FID-FUNC-009). */
  obsoleteKeys: string[];
}

/** Compute the whole import as data: where to stage, what to flip, what to
 *  sweep. The new gen sits ABOVE every gen visible in the store (not just the
 *  active one), so a crashed import's orphan namespace can never collide. */
export function planImport(
  translation: string,
  activeGen: number,
  existingKeys: string[],
  books: ValidatedBook[]
): ImportPlan {
  const mine = existingKeys.filter((k) => parseKey(k).translation === translation);
  const maxGen = mine.reduce((g, k) => Math.max(g, parseKey(k).gen), activeGen);
  const gen = maxGen + 1;
  return {
    translation,
    gen,
    writes: books.map((b) => ({ key: keyFor(translation, gen, b.slug), data: b.data })),
    obsoleteKeys: mine.filter((k) => parseKey(k).gen !== gen)
  };
}

/** The storage the plan runs against. `src/lib/data.ts` provides IndexedDB;
 *  the harness provides an in-memory fake with injected failures. */
export interface ImportStore {
  put(key: string, data: BookData): Promise<void>;
  setActive(translation: string, gen: number): Promise<void>;
  deleteKeys(keys: string[]): Promise<void>;
}

/** Run the plan: stage every book, then FLIP the active-version marker — the
 *  single write that makes the new corpus visible — then sweep the old keys.
 *  A failure before the flip leaves the marker (and so the visible corpus)
 *  untouched; staged orphans are invisible and the next import's plan sweeps
 *  them. A failure during the sweep is swallowed for the same reason. */
export async function executeImportPlan(
  plan: ImportPlan,
  store: ImportStore,
  onProgress?: (done: number, total: number) => void
): Promise<number> {
  let done = 0;
  onProgress?.(0, plan.writes.length);
  for (const w of plan.writes) {
    await store.put(w.key, w.data);
    onProgress?.(++done, plan.writes.length);
  }
  await store.setActive(plan.translation, plan.gen);
  try {
    await store.deleteKeys(plan.obsoleteKeys);
  } catch {
    // The swap already happened; obsolete keys are invisible either way and
    // the next import plans them into its own sweep.
  }
  return plan.writes.length;
}

/** Name the cause and the recovery (FID-DATA-001 acceptance: "quota errors
 *  name the cause and recovery"). Everything else passes its message through. */
export function describeStorageError(e: unknown): string {
  if (e instanceof DOMException && e.name === "QuotaExceededError") {
    return (
      "This device's browser storage is full, so the import could not be saved. " +
      "Free up space — remove another imported translation or an offline download, " +
      "or clear other site data — then try again. The previous text (if any) is untouched."
    );
  }
  return e instanceof Error ? e.message : String(e);
}
