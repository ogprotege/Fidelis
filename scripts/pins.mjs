/**
 * Pinned upstream commits (P1-10). Every text in public/data/ derives from
 * exactly these source trees — never a moving branch.
 *
 * To update deliberately: bump the commit, run `npm run data` and
 * `npm run lectionary` (fresh downloads key the cache by commit), then
 * review `git diff public/data data-report.txt` word by word before
 * committing. A diff here is a change to the sacred text and must be
 * explained, not assumed. If the diff changes the bytes of an EXISTING data
 * file, also bump DATA_CACHE in public/sw.js so installed PWAs refetch it (the
 * data cache is cache-first; the activate handler migrates the old cache
 * forward, so a bump preserves a user's downloaded offline bundles). Merely
 * adding new files or re-sealing manifest.json needs no bump — manifest.json is
 * served network-first and new files miss the cache and fetch fresh.
 */
export const PINS = {
  scrollmapper: {
    repo: "scrollmapper/bible_databases",
    commit: "a228a19a29099a41c196c2a310cd93e50a390e30"
  },
  lectionary: {
    repo: "jayarathina/Tamil-Catholic-Lectionary",
    commit: "c6c9d79d0f56721f6cc17fb8370d089f0dcd5fd2"
  },
  // Commentary layer (spec §4.1; see docs/review/Commentary_Sources_Survey.md).
  // Haydock: USFM transcription of the 1883 Dunigan edition, public domain by age.
  haydock: {
    repo: "cmahte/ENG-B-Haydock1883-pd-PSFM",
    commit: "0332c84aedf35638a0d87b0185cc01eb14a65492"
  },
  // Catena Aurea: OSIS edition of the Oxford 1841–1845 translation (Newman's
  // editorship, the Library of the Fathers), released CC0.
  catena: {
    repo: "Isidore-Guild/catena",
    commit: "aebb0f6b2b313fd3732dab9b7f28714fbe967f40"
  },
  // §5 text tier — the Roman Catechism (Catechism of the Council of Trent), in the
  // McHugh & Callan 1923 English translation: PUBLIC DOMAIN in the U.S. (published
  // 1923). Bundled (unlike the modern CCC) precisely because it is public domain.
  // Source: a clean, MIT-licensed structured-JSON digitization (the MIT license
  // covers the digitization; the underlying 1923 text is itself PD). Pinned by
  // commit like every other corpus. Donovan 1829 is a planned future 2nd edition;
  // build-trent.mjs already keys trent.json by edition so it slots in.
  trent: {
    repo: "mborders/romanus",
    commit: "c5a5ccf585384c7f06bc1888fb24052e3a31616c"
  }
};
