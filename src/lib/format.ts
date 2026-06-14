/** Small pure formatting helpers shared across the UI. Kept here (not inline)
 *  so the harness can assert them without a DOM. */

/** Human-readable byte size, e.g. 4915200 → "4.7 MB". Used by the §2.2 Data
 *  section to show each translation's real download size from the manifest. */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}
