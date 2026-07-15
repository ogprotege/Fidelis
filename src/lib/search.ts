import { getBook, OT_GROUPS } from "./canon";

/** The Search filter chips: the whole canon, a testament, or just the Gospels. */
export type GroupFilter = "all" | "ot" | "nt" | "gospels";

/** Old vs New Testament, by the book's canonical group (the four Gospels,
 *  like the rest of the New Testament books, count as NT). */
export function bookGroupKind(slug: string): "ot" | "nt" {
  const b = getBook(slug);
  return b && OT_GROUPS.includes(b.group) ? "ot" : "nt";
}

/** Whether a book belongs in the chosen Search filter. */
export function inFilter(slug: string, f: GroupFilter): boolean {
  if (f === "all") return true;
  if (f === "gospels") return getBook(slug)?.group === "Gospels";
  return bookGroupKind(slug) === f;
}

/** One full-text match, exactly as the Search page renders it. */
export interface SearchHit {
  book: string;
  chapter: number;
  verse: number;
  text: string;
}

export const GROUP_FILTERS: GroupFilter[] = ["all", "ot", "nt", "gospels"];

/** Every filter chip a book's match counts toward (all + its testament,
 *  plus gospels) — derived from inFilter so the partition can never drift. */
export function groupsOf(slug: string): GroupFilter[] {
  return GROUP_FILTERS.filter((f) => inFilter(slug, f));
}

/** The Search accumulator: counts are EXACT tallies over every match in the
 *  scan; lists hold only the first `cap` matches per group (canon order), so
 *  a chip's number is always the whole truth while the rendered list stays
 *  bounded. A hit that the "All" cap excludes still enters its section's list
 *  — that is what keeps "New Testament" showable when the Old Testament
 *  alone fills the overall cap. */
export interface GroupedHits {
  counts: Record<GroupFilter, number>;
  lists: Record<GroupFilter, SearchHit[]>;
}

export function emptyGroupedHits(): GroupedHits {
  return {
    counts: { all: 0, ot: 0, nt: 0, gospels: 0 },
    lists: { all: [], ot: [], nt: [], gospels: [] }
  };
}

/** Tally a match into every group it belongs to; lists stop at cap, counts
 *  never do. Mutates acc (the scan loop owns it; React sees snapshots). */
export function addHit(acc: GroupedHits, hit: SearchHit, cap: number): void {
  for (const g of groupsOf(hit.book)) {
    acc.counts[g]++;
    if (acc.lists[g].length < cap) acc.lists[g].push(hit);
  }
}

/** Fresh top-level and list references (hit objects shared), so streaming the
 *  accumulator into React state actually re-renders. */
export function snapshotGroupedHits(acc: GroupedHits): GroupedHits {
  return {
    counts: { ...acc.counts },
    lists: {
      all: [...acc.lists.all],
      ot: [...acc.lists.ot],
      nt: [...acc.lists.nt],
      gospels: [...acc.lists.gospels]
    }
  };
}
