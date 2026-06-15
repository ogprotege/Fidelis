/**
 * Pinned upstream commits (P1-10). Every text in public/data/ derives from
 * exactly these source trees — never a moving branch.
 *
 * To update deliberately: bump the commit, run `npm run data` and
 * `npm run lectionary` (fresh downloads key the cache by commit), then
 * review `git diff public/data data-report.txt` word by word before
 * committing. A diff here is a change to the sacred text and must be
 * explained, not assumed. Also bump DATA_CACHE in public/sw.js (the data
 * cache is cache-first forever, so installed PWAs only refetch the texts
 * and manifest when its name changes).
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
  // Catena Aurea: OSIS edition of the Oxford 1842 translation, released CC0.
  catena: {
    repo: "Isidore-Guild/catena",
    commit: "aebb0f6b2b313fd3732dab9b7f28714fbe967f40"
  }
};
