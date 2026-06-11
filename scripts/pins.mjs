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
  }
};
