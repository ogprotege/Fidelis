#!/usr/bin/env node
/**
 * Modern CCC (a copy you OWN) → fidelis-ccc-1 import JSON, for the §6 personal
 * import. PARSING LOGIC ONLY — this script contains no Catechism text. It reads a
 * file you supply (EPUB-derived .txt, recommended; or a PDF), extracts a single
 * monotonic paragraph sequence ¶1→¶2865, and writes ccc.local.json (gitignored,
 * never bundled or committed). It then prints COUNTS plus a few short incipits to
 * eyeball — never the full body.
 *
 * Usage:
 *   # EPUB (cleanest — resolves footnote anchors):
 *   ebook-convert "/path/to/ccc.epub" ccc.txt --enable-heuristics --txt-output-formatting plain
 *   node scripts/build-ccc-text.mjs ccc.txt
 *   # PDF (fallback — needs the body-column crop; tune CCC_CROP_* per edition):
 *   node scripts/build-ccc-text.mjs "/path/to/Catechism_2nd-ED.pdf" [ccc.local.json]
 *   #   or:  CCC_TEXT_PDF="/path/to.pdf" node scripts/build-ccc-text.mjs
 *
 * Poppler `pdftotext` is at /opt/homebrew/bin/pdftotext. Calibre is NOT installed —
 * the EPUB path needs `brew install --cask calibre` first (see the runbook).
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const input = process.argv[2] || process.env.CCC_TEXT_PDF;
const out = process.argv[3] || "ccc.local.json";
const edition = process.env.CCC_EDITION || "Catechism of the Catholic Church, 2nd Edition";
if (!input) {
  console.error('Usage: node scripts/build-ccc-text.mjs <ccc.txt|Catechism.pdf> [out.json]  (or set CCC_TEXT_PDF=)');
  process.exit(1);
}
if (!/\.local\.json$/.test(out)) {
  // The modern CCC text must NEVER be committed. .gitignore only ignores *.local.json,
  // so any other name could be accidentally staged — refuse rather than risk it.
  console.error(`Refusing to write "${out}": the output MUST end in .local.json (the only gitignored name), so the copyrighted text can never be committed.`);
  process.exit(1);
}

// ── 1. raw text ─────────────────────────────────────────────────────────────
let raw;
if (/\.txt$/i.test(input)) {
  raw = readFileSync(input, "utf8");
} else {
  // PDF: crop to the body column (drop marginal cross-ref numbers via -x/-W) and
  // the page-foot footnote band (via -H), the same region-crop build-ccc.mjs uses.
  // Tune these to YOUR edition (see the runbook) — the defaults are a starting box.
  const X = +(process.env.CCC_CROP_X || 0);
  const W = +(process.env.CCC_CROP_W || 430);
  const H = +(process.env.CCC_CROP_H || 660);
  const FIRST = +(process.env.CCC_FIRST_PAGE || 0); // Part One ¶1; 0 = from start
  const LAST = +(process.env.CCC_LAST_PAGE || 0);   // before the Index of Citations; 0 = to end
  const args = ["-layout", "-nopgbrk", "-x", String(X), "-y", "0", "-W", String(W), "-H", String(H)];
  if (FIRST) args.push("-f", String(FIRST));
  if (LAST) args.push("-l", String(LAST));
  args.push(input, "-");
  try {
    raw = execFileSync("pdftotext", args, { maxBuffer: 1 << 30 }).toString("utf8");
  } catch (e) {
    console.error("pdftotext failed (brew install poppler):", e.message);
    process.exit(1);
  }
}

// ── 2. footnote-apparatus + whitespace normalization (per assembled ¶) ───────
function deApparatus(s) {
  return s
    .replace(/[⁰¹²³⁴-⁹]+/g, "")          // superscript footnote digits
    .replace(/([\p{L}.,;:!?"'”’)])\d{1,3}(?=\s|$)/gu, "$1")  // glued footnote run "life.45" — the HARD PDF case (flagged)
    .replace(/\s+/g, " ")
    .trim();
}

// ── 3. the monotonic ¶ walker (1→2865), lifted from build-nabre's verse splitter ─
const lines = raw.split(/\r?\n/);
const paragraphs = {};
let expected = 1;   // the next ¶ number a line must begin with to open a new ¶
let openNum = 0;    // the ¶ currently accumulating into buf
let buf = [];
const flush = () => {
  if (openNum >= 1 && buf.length) {
    const text = deApparatus(buf.join(" "));
    if (text) paragraphs[String(openNum)] = text;
  }
  buf = [];
};
for (const rawLine of lines) {
  const t = rawLine.replace(/\f/g, "").trim();
  if (!t) continue;
  const m = t.match(/^(\d{1,4})\b\s*(.*)$/);
  if (m && +m[1] === expected) {
    flush();                 // close the previous ¶
    openNum = expected;
    expected++;
    if (m[2]) buf.push(m[2]);
    continue;
  }
  // anything else — stray marginal numbers, headings, in-¶ lists (a), 1°), banners —
  // is body of the OPEN ¶. Lines before ¶1 (openNum 0) are dropped (front matter).
  if (openNum >= 1) buf.push(t);
}
flush();

// ── 4. emit (compact, gitignored) ───────────────────────────────────────────
writeFileSync(out, JSON.stringify({ format: "fidelis-ccc-1", edition, language: "en", paragraphs }, null, 0));

// ── 5. validation — COUNTS ONLY, against the committed url.json (the cited facts) ─
const url = JSON.parse(readFileSync(join(ROOT, "public/data/ccc/url.json"), "utf8"));
const cited = Object.keys(url);
const present = cited.filter((n) => paragraphs[n]);
const missing = cited.filter((n) => !paragraphs[n]);
console.error(`\nWrote ${out} — ${Object.keys(paragraphs).length} of 2865 ¶ parsed.`);
console.error(`cited-¶ coverage (url.json oracle): ${present.length}/${cited.length} present`);
if (missing.length) console.error(`  missing cited ¶ (first 20): ${missing.slice(0, 20).join(", ")}`);
let pf = 0;
for (let n = 2558; n <= 2865; n++) if (paragraphs[String(n)]) pf++;
console.error(`Part Four "Christian Prayer" (¶2558–2865): ${pf}/308 present`);
for (const n of ["1", "1817", "2558", "2865"]) {
  console.error(`  ¶${n} incipit: ${(paragraphs[n] || "(missing)").slice(0, 60)}`);
}
console.error("\nIf coverage is short or a section count is wrong, re-tune the crop box (CCC_CROP_*)");
console.error("and re-run, exactly as build-nabre's 'review the printed counts' gate. Then import");
console.error("the file via Settings → Magisterium → Import the Catechism. It stays on your device.");
