#!/usr/bin/env node
/**
 * Emits public/data/manifest.json: a SHA-256 hash of every committed data
 * file, the pinned upstream commits they derive from, and a root hash over
 * the whole set (P1-10). Deterministic — no timestamps.
 *
 * Usage:
 *   node scripts/build-manifest.mjs            # (re)write the manifest
 *   node scripts/build-manifest.mjs --verify   # exit 1 unless data matches
 */
import { createHash } from "node:crypto";
import { realpathSync } from "node:fs";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { PINS } from "./pins.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DATA_DIR = join(ROOT, "public", "data");
const MANIFEST = "manifest.json";

async function walk(dir, prefix = "") {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    if (e.name.startsWith(".")) continue; // .DS_Store and friends are not data
    const rel = prefix ? `${prefix}/${e.name}` : e.name;
    if (e.isDirectory()) out.push(...(await walk(join(dir, e.name), rel)));
    else if (rel !== MANIFEST) out.push(rel);
  }
  return out.sort();
}

const sha256 = (buf) => createHash("sha256").update(buf).digest("hex");

/** files map (sorted keys) -> root hash over "path hash" lines. */
export function rootHashOf(files) {
  const lines = Object.keys(files)
    .sort()
    .map((p) => `${p} ${files[p]}`)
    .join("\n");
  return sha256(Buffer.from(lines, "utf8"));
}

export async function computeFiles(root = ROOT) {
  const dataDir = join(root, "public", "data");
  const files = {};
  for (const rel of await walk(dataDir)) {
    files[rel] = sha256(await readFile(join(dataDir, rel)));
  }
  return files;
}

export async function writeManifest(root = ROOT) {
  const files = await computeFiles(root);
  const manifest = {
    note: "SHA-256 per file under public/data/, derived only from the pinned sources. Regenerate: npm run manifest; verify: npm run verify-data.",
    sources: PINS,
    fileCount: Object.keys(files).length,
    rootHash: rootHashOf(files),
    files
  };
  const dest = join(root, "public", "data", MANIFEST);
  await writeFile(dest, JSON.stringify(manifest, null, 1));
  console.log(`Wrote ${dest} (${manifest.fileCount} files, root ${manifest.rootHash.slice(0, 12)}…)`);
  return manifest;
}

export async function verifyManifest(root = ROOT) {
  const problems = [];
  let manifest;
  try {
    manifest = JSON.parse(await readFile(join(root, "public", "data", MANIFEST), "utf8"));
  } catch (e) {
    return { ok: false, problems: [`manifest unreadable: ${e.message}`] };
  }
  const actual = await computeFiles(root);
  for (const [p, h] of Object.entries(manifest.files ?? {})) {
    if (!(p in actual)) problems.push(`missing file: ${p}`);
    else if (actual[p] !== h) problems.push(`hash mismatch: ${p}`);
  }
  for (const p of Object.keys(actual)) {
    if (!(p in (manifest.files ?? {}))) problems.push(`unmanifested file: ${p}`);
  }
  if (manifest.rootHash !== rootHashOf(actual)) problems.push("root hash mismatch");
  if (manifest.fileCount !== Object.keys(actual).length)
    problems.push(`fileCount mismatch: manifest says ${manifest.fileCount}, found ${Object.keys(actual).length}`);
  for (const [k, pin] of Object.entries(PINS)) {
    const m = manifest.sources?.[k];
    if (!m || m.commit !== pin.commit || m.repo !== pin.repo)
      problems.push(`source pin drift: ${k}`);
  }
  return { ok: problems.length === 0, problems };
}

// pathToFileURL + realpath, not a string-built URL: Node realpath-resolves
// the ESM entry, so a symlinked argv[1] (e.g. macOS /tmp -> /private/tmp)
// would otherwise silently skip the CLI — exit 0 with no verification.
const isMain =
  process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href;
if (isMain) {
  if (process.argv.includes("--verify")) {
    const { ok, problems } = await verifyManifest();
    for (const p of problems) console.error(`VERIFY FAIL: ${p}`);
    console.log(ok ? "manifest verified: all data files match" : `${problems.length} problem(s)`);
    process.exitCode = ok ? 0 : 1;
  } else {
    await writeManifest();
  }
}
