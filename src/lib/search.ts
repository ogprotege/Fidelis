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
