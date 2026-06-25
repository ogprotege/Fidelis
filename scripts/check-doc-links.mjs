#!/usr/bin/env node
// Validates every relative Markdown link + #anchor across the repo's docs, and
// (once docs/INDEX.md exists) flags any docs/** Markdown file unreachable from it.
// No external dependencies. Exit 1 on any failure. Run: npm run check-docs
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, dirname, resolve, relative, extname } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const SKIP_DIRS = new Set(["node_modules", ".git", "dist", "android", "ios", "public"]);

function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) walk(p, acc);
    else if (extname(p) === ".md") acc.push(p);
  }
  return acc;
}

// GitHub-style heading slug. Mirrors github-slugger: strip special chars, then
// replace each space with a hyphen individually — runs of whitespace are NOT
// collapsed (so an em-dash flanked by spaces, once stripped, yields "--").
function slug(text) {
  return text.trim().toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/ /g, "-");
}

function headingSlugs(file) {
  const set = new Set();
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const m = /^#{1,6}\s+(.*)$/.exec(line);
    if (m) set.add(slug(m[1]));
  }
  return set;
}

const LINK_RE = /\[[^\]]*\]\(([^)]+)\)/g;
const files = walk(ROOT);
const errors = [];

// Strip fenced code blocks and inline code spans so links inside examples or
// code aren't checked.
//
// Fenced blocks: a fence of N backticks (N≥3) at line start closes on the
// next line-start run of ≥N backticks — so a 4-backtick fence wrapping an
// embedded ``` example is not prematurely closed by the inner ```.
//
// Inline spans: `x`, ``x``, etc. — closing run must match opening length.
// A span may not cross a line boundary.
function stripCode(text) {
  const lines = text.split("\n");
  const out = [];
  let i = 0;

  while (i < lines.length) {
    const fenceM = /^(`{3,})/.exec(lines[i]);
    if (fenceM) {
      const openLen = fenceM[1].length;
      // consume until a closing fence of ≥openLen backticks at line start
      i++;
      while (i < lines.length) {
        const closeM = /^(`+)/.exec(lines[i]);
        if (closeM && closeM[1].length >= openLen) { i++; break; }
        i++;
      }
    } else {
      // Strip inline code spans (multi-backtick, no line crossing)
      out.push(lines[i].replace(/(`+)([^\n]*?)\1/g, (_, ticks, _inner) => " ".repeat(ticks.length * 2 + _inner.length)));
      i++;
    }
  }

  return out.join("\n");
}

// 1. Validate every relative link target + anchor.
for (const file of files) {
  const text = stripCode(readFileSync(file, "utf8"));
  let m;
  while ((m = LINK_RE.exec(text))) {
    let target = m[1].trim().split(/\s+/)[0]; // strip optional "title"
    if (/^(https?:|mailto:|tel:|#)/.test(target)) continue; // external or same-page
    const [path, anchor] = target.split("#");
    const abs = resolve(dirname(file), path);
    if (!existsSync(abs)) {
      errors.push(`${relative(ROOT, file)}: dead link -> ${target}`);
      continue;
    }
    if (anchor && extname(abs) === ".md" && !headingSlugs(abs).has(anchor)) {
      errors.push(`${relative(ROOT, file)}: missing anchor -> ${target}`);
    }
  }
}

// 2. Orphan check (only once the hub exists).
const indexPath = resolve(ROOT, "docs/INDEX.md");
if (existsSync(indexPath)) {
  const reachable = new Set([indexPath]);
  const queue = [indexPath];
  while (queue.length) {
    const cur = queue.shift();
    const text = stripCode(readFileSync(cur, "utf8"));
    let m;
    while ((m = LINK_RE.exec(text))) {
      const target = m[1].trim().split(/\s+/)[0].split("#")[0];
      if (/^(https?:|mailto:|tel:)/.test(target) || !target) continue;
      const abs = resolve(dirname(cur), target);
      if (extname(abs) === ".md" && existsSync(abs) && !reachable.has(abs)) {
        reachable.add(abs);
        queue.push(abs);
      }
    }
  }
  for (const file of files) {
    if (!file.startsWith(resolve(ROOT, "docs"))) continue; // only docs/** must be reachable
    if (!reachable.has(file)) errors.push(`${relative(ROOT, file)}: orphan (unreachable from docs/INDEX.md)`);
  }
}

if (errors.length) {
  console.error(`check-docs: ${errors.length} problem(s):`);
  for (const e of errors) console.error("  " + e);
  process.exit(1);
}
console.log(`check-docs: OK (${files.length} markdown files, all links/anchors resolve)`);
