#!/usr/bin/env node
/**
 * Builds the bundled Roman Catechism (Catechism of the Council of Trent) layer
 * (design spec §5, text tier) into a single sealed public/data/trent/trent.json,
 * keyed by edition:
 *
 *   { "editions": {
 *       "mchughCallan": { "edition", "source", "license", "parts": [ { id, title,
 *                          sections: [ { id, title, html } ] } ] } } }
 *
 * The bundled edition is the McHugh & Callan 1923 English translation — PUBLIC
 * DOMAIN in the U.S. (published 1923) — so, unlike the modern CCC, Trent may be
 * bundled. The source is a clean, MIT-licensed structured-JSON digitization
 * (mborders/romanus); the MIT license covers the digitization, the 1923 text is
 * itself PD. It is fetched from a FIXED commit (scripts/pins.mjs), never a moving
 * branch, exactly like every other corpus; the per-commit cache makes a stale
 * fetch impossible.
 *
 * The upstream shape is Part → (part introduction) + Article → Section →
 * Paragraph. We flatten each *Article* (and the part introduction) into one
 * browsable "section" whose `html` is paragraphs-only structural HTML (an <h4>
 * per upstream sub-section title, a <p> per paragraph, every text node escaped) —
 * built once and sealed, so the sheet renders it as trusted-because-build-sealed
 * text. Trent has no verse keys; the §5 ccc/index.json keeps verse precision.
 *
 * The file is keyed by EDITION so a future Donovan 1829 edition slots in with no
 * shape change. Usage: node scripts/build-trent.mjs [--cache-dir <dir>]
 */
import { mkdir, readFile, writeFile, access } from "node:fs/promises";
import { gunzipSync } from "node:zlib";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { realpathSync } from "node:fs";
import { PINS } from "./pins.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PIN = PINS.trent; // pinned commit, never a moving branch (P1-10)
const ARCHIVE = "catechism.tar.gz"; // the single-file tarball in the pinned repo

const cacheArg = process.argv.indexOf("--cache-dir");
const CACHE = cacheArg !== -1 ? process.argv[cacheArg + 1] : join(ROOT, ".cache");
const exists = (p) => access(p).then(() => true, () => false);

// The four Parts of the Roman Catechism, in order — the upstream array index maps
// straight onto this; the titles are Fidelis's display titles.
const PART_META = [
  { id: "creed", title: "Part I — The Creed" },
  { id: "sacraments", title: "Part II — The Sacraments" },
  { id: "commandments", title: "Part III — The Ten Commandments" },
  { id: "lords-prayer", title: "Part IV — The Lord's Prayer" }
];

/** Fetch the pinned tarball (cached by commit), gunzip it, return the bytes. */
async function fetchArchive() {
  const cached = join(CACHE, `trent-${PIN.commit}.tar.gz`);
  if (await exists(cached)) return readFile(cached);
  const url = `https://raw.githubusercontent.com/${PIN.repo}/${PIN.commit}/${ARCHIVE}`;
  console.log(`  fetching ${PIN.repo}@${PIN.commit.slice(0, 7)}/${ARCHIVE}`);
  const res = await fetch(url, { headers: { "user-agent": "Fidelis-Trent/1.0" } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await mkdir(CACHE, { recursive: true });
  await writeFile(cached, buf);
  return buf;
}

/** Extract one file (matched by name suffix) from a gzipped tar — no deps. */
function extractFromTarGz(gzBuf, wantSuffix) {
  const tar = gunzipSync(gzBuf);
  let off = 0;
  while (off + 512 <= tar.length) {
    const name = tar.toString("utf8", off, off + 100).replace(/\0.*$/, "");
    if (!name) break; // the two trailing zero blocks → end of archive
    const size = parseInt(tar.toString("ascii", off + 124, off + 136).replace(/[\0 ]/g, "") || "0", 8);
    const type = tar.toString("ascii", off + 156, off + 157);
    const dataStart = off + 512;
    if ((type === "0" || type === "\0" || type === "") && name.endsWith(wantSuffix)) {
      return tar.slice(dataStart, dataStart + size);
    }
    off = dataStart + Math.ceil(size / 512) * 512; // skip this entry's content
  }
  throw new Error(`tar entry *${wantSuffix} not found`);
}

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Upstream sections[] → paragraphs-only structural HTML (an <h4> per sub-section
 *  title, a <p> per paragraph; every text node escaped). */
function sectionsToHtml(sections) {
  const out = [];
  for (const s of sections ?? []) {
    const title = (s.title ?? "").trim();
    if (title) out.push(`<h4>${esc(title)}</h4>`);
    for (const p of s.paragraphs ?? []) {
      const t = (p.text ?? "").trim();
      if (t) out.push(`<p>${esc(t)}</p>`);
    }
  }
  return out.join("");
}

/** The upstream 4-part catechism → Fidelis's parts[] (each Article + the part
 *  introduction becomes one browsable section). */
function transform(catechism) {
  if (!Array.isArray(catechism) || catechism.length !== 4) {
    throw new Error(`expected 4 upstream parts, got ${catechism?.length}`);
  }
  return PART_META.map((meta, i) => {
    const src = catechism[i];
    const sections = [];
    const introHtml = sectionsToHtml(src.introduction?.sections);
    if (introHtml) sections.push({ id: `${meta.id}-intro`, title: "Introduction", html: introHtml });
    for (const a of src.articles ?? []) {
      const html = sectionsToHtml(a.sections);
      if (!html) throw new Error(`${meta.id} article ${a.articleNumber}: empty html`);
      const num = String(a.articleNumber).padStart(2, "0");
      sections.push({ id: `${meta.id}-art-${num}`, title: a.title, html });
    }
    if (sections.length < 2) throw new Error(`${meta.id}: too few sections (${sections.length})`);
    return { id: meta.id, title: meta.title, sections };
  });
}

async function main() {
  console.log(`building Trent (McHugh-Callan 1923) from ${PIN.repo} …`);
  const gz = await fetchArchive();
  const catechism = JSON.parse(extractFromTarGz(gz, "catechism.json").toString("utf8"));
  const parts = transform(catechism);

  const editions = {
    mchughCallan: {
      edition: "Catechism of the Council of Trent (McHugh & Callan, 1923)",
      source: `github.com/${PIN.repo}`,
      license: "public-domain-US",
      parts
    }
  };

  const outDir = join(ROOT, "public", "data", "trent");
  await mkdir(outDir, { recursive: true });
  await writeFile(join(outDir, "trent.json"), JSON.stringify({ editions }));

  // counts + incipit report (Trent IS public domain, so sampling text is fine)
  for (const [id, ed] of Object.entries(editions)) {
    const secs = ed.parts.reduce((n, p) => n + p.sections.length, 0);
    console.log(`  ${id}: 4 parts, ${secs} sections`);
    for (const p of ed.parts) {
      const incipit = p.sections[0].html.replace(/<[^>]+>/g, " ").trim().slice(0, 64);
      console.log(`    ${p.id}: ${p.sections.length} secs · "${incipit}…"`);
    }
  }

  // Re-seal the integrity manifest over everything under public/data (P1-10).
  const { writeManifest } = await import("./build-manifest.mjs");
  await writeManifest(ROOT);
}

const isMain =
  process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href;
if (isMain) await main();
