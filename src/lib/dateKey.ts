/** The sanctoral/calendar key "MM-DD" in local time, from calendar components
 *  (never millisecond math — see votd.dayOfYear for the DST rationale). Shared
 *  by the Saint-of-the-Day and Today-in-Church-History layers. */
export function dayKey(d: Date): string {
  return `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Parse a strict Gregorian `YYYY-MM-DD` as a local civil date.
 *
 * `new Date(year, month, day)` silently normalizes impossible input such as
 * February 30 into March. Route input must not do that because it could show a
 * different day's calendar and readings while leaving the requested date in
 * the address bar. The component round-trip keeps the check timezone-safe.
 */
export function parseLocalISODate(value: string | null | undefined): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (year < 1 || month < 1 || month > 12 || day < 1 || day > 31) return null;
  const parsed = new Date(year, month - 1, day);
  if (year < 100) parsed.setFullYear(year);
  return parsed.getFullYear() === year &&
    parsed.getMonth() === month - 1 &&
    parsed.getDate() === day
    ? parsed
    : null;
}
