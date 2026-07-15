/** The sanctoral/calendar key "MM-DD" in local time, from calendar components
 *  (never millisecond math — see votd.dayOfYear for the DST rationale). Shared
 *  by the Saint-of-the-Day and Today-in-Church-History layers. */
export function dayKey(d: Date): string {
  return `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
