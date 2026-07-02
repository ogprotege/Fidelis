#!/usr/bin/env node
/**
 * External-source health check (run monthly by .github/workflows/sources.yml,
 * or by hand). Two failure modes the harness can't see:
 *
 *  1. UPSTREAM PIN ROT — every text in public/data/ rebuilds from the pinned
 *     commits in scripts/pins.mjs. The committed outputs survive an upstream
 *     deletion, but the pipeline stops being reproducible from source the day
 *     a pinned repo is deleted, made private, or GC'd after a force-push.
 *     Checked via the GitHub commits API (one request per pin).
 *
 *  2. VATICAN.VA LINK ROT — the §5 CCC layer links every cited verse to its
 *     paragraph's page on vatican.va (public/data/ccc/url.json). A site
 *     restructure would 404 every link silently. Checked with a capped,
 *     polite sweep of the unique URLs (HEAD, falling back to GET when a
 *     server rejects HEAD).
 *
 * Exits 1 on any hard failure so the scheduled workflow goes red. Network
 * timeouts on vatican.va are retried once, then reported as failures — a
 * monthly false alarm is cheaper than a year of dead links.
 */
import { readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { PINS } from "./pins.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];

async function checkPin(name, { repo, commit }) {
  const url = `https://api.github.com/repos/${repo}/commits/${commit}`;
  // GITHUB_TOKEN (provided by Actions) lifts the unauthenticated 60-req/h cap,
  // which shared runner IPs routinely exhaust — without it this check flakes.
  const auth = process.env.GITHUB_TOKEN ? { authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {};
  try {
    const res = await fetch(url, {
      headers: { accept: "application/vnd.github+json", "user-agent": "fidelis-sources-check", ...auth }
    });
    if (res.ok) {
      console.log(`pin ok: ${name} (${repo}@${commit.slice(0, 12)})`);
    } else {
      failures.push(`pin ${name}: ${repo}@${commit.slice(0, 12)} → HTTP ${res.status} (repo deleted/private, or commit GC'd — mirror the source NOW while any fork survives)`);
    }
  } catch (e) {
    failures.push(`pin ${name}: ${url} unreachable (${e.message ?? e})`);
  }
}

async function probe(url) {
  for (const method of ["HEAD", "GET"]) {
    try {
      const res = await fetch(url, { method, redirect: "follow", signal: AbortSignal.timeout(20_000) });
      if (res.ok) return null;
      if (method === "HEAD" && (res.status === 405 || res.status === 403)) continue; // server dislikes HEAD; try GET
      return `HTTP ${res.status}`;
    } catch (e) {
      if (method === "GET") return e.name === "TimeoutError" ? "timeout" : (e.message ?? String(e));
    }
  }
  return "unreachable";
}

async function checkCccUrls() {
  const urlMap = JSON.parse(await readFile(join(ROOT, "public", "data", "ccc", "url.json"), "utf8"));
  const urls = [...new Set(Object.values(urlMap))];
  console.log(`checking ${urls.length} unique vatican.va pages…`);
  let bad = 0;
  const CONCURRENCY = 6;
  for (let i = 0; i < urls.length; i += CONCURRENCY) {
    const batch = urls.slice(i, i + CONCURRENCY);
    const results = await Promise.all(
      batch.map(async (u) => {
        let err = await probe(u);
        if (err) err = await probe(u); // one retry — vatican.va can be slow
        return err ? `${u} → ${err}` : null;
      })
    );
    for (const r of results) {
      if (r) {
        bad++;
        failures.push(`ccc url: ${r}`);
      }
    }
  }
  console.log(bad === 0 ? "vatican.va: all CCC pages resolve" : `vatican.va: ${bad} broken page(s)`);
}

for (const [name, pin] of Object.entries(PINS)) await checkPin(name, pin);
await checkCccUrls();

if (failures.length) {
  console.error(`\n${failures.length} FAILURE(S):`);
  for (const f of failures) console.error(`  ${f}`);
  process.exit(1);
}
console.log("\nall external sources healthy");
