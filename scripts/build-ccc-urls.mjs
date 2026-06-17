/**
 * §5 — resolve every CCC paragraph used in public/data/ccc/index.json to its
 * page on the official Vatican CCC (ENG0015), emitting public/data/ccc/url.json
 * = { "219": "https://www.vatican.va/archive/ENG0015/__P..HTM" }.
 *
 * Vatican structure: the CCC is split across ~374 __P*.HTM pages; each numbered
 * paragraph begins with `<p class=MsoNormal>N`. There is no per-paragraph
 * anchor, so the page URL is the link target (the spec allows the page URL when
 * the archive exposes no intra-page anchor). FACTS ONLY — paragraph text is
 * never stored, only the public URL.
 *
 * Network step; run after build-ccc.mjs. Run: node scripts/build-ccc-urls.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const BASE = "https://www.vatican.va/archive/ENG0015/";
const dir = join(ROOT, "public", "data", "ccc");

const index = JSON.parse(readFileSync(join(dir, "index.json"), "utf8"));
const needed = new Set();
for (const arr of Object.values(index)) for (const p of arr) needed.add(p);
console.log(`paragraphs to resolve: ${needed.size}`);

async function get(url) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const r = await fetch(url, { headers: { "user-agent": "Fidelis-CCC-index/1.0" } });
      if (r.ok) return await r.text();
      if (r.status === 404) return null;
    } catch {
      /* retry */
    }
    await new Promise((res) => setTimeout(res, 400 * (attempt + 1)));
  }
  return null;
}

// 1. page list from the table of contents
const idxHtml = (await get(BASE + "_INDEX.HTM")) ?? "";
const pages = [...new Set([...idxHtml.matchAll(/__P[0-9A-Z]+\.HTM/gi)].map((m) => m[0].toUpperCase()))];
console.log(`__P pages listed: ${pages.length}`);
if (pages.length < 100) throw new Error("Vatican index page list looks wrong; aborting.");

// 2. crawl with a small concurrency pool, mapping ¶ -> page
const paraToUrl = {};
let firstParaPerPage = [];
let done = 0;
const POOL = 6;
async function worker(queue) {
  while (queue.length) {
    const page = queue.pop();
    const html = await get(BASE + page);
    done++;
    if (done % 50 === 0) console.log(`  fetched ${done}/${pages.length}`);
    if (!html) continue;
    // each numbered paragraph begins `<p class=MsoNormal>N` (N at the block start)
    const nums = [...html.matchAll(/<p\s+class=MsoNormal>\s*(\d{1,4})\b/gi)].map((m) => +m[1]);
    if (!nums.length) continue;
    firstParaPerPage.push([Math.min(...nums), page]);
    for (const n of nums) {
      if (n >= 1 && n <= 2865 && !paraToUrl[n]) paraToUrl[n] = BASE + page;
    }
  }
}
const queue = [...pages];
await Promise.all(Array.from({ length: POOL }, () => worker(queue)));

// 3. fallback for any needed ¶ not directly found: nearest page whose first ¶ ≤ n
firstParaPerPage.sort((a, b) => a[0] - b[0]);
function nearestPage(n) {
  let best = null;
  for (const [first, page] of firstParaPerPage) {
    if (first <= n) best = page;
    else break;
  }
  return best ? BASE + best : null;
}

const url = {};
const missing = [];
for (const p of [...needed].sort((a, b) => a - b)) {
  const u = paraToUrl[p] ?? nearestPage(p);
  if (u) url[String(p)] = u;
  else missing.push(p);
}

mkdirSync(dir, { recursive: true });
writeFileSync(join(dir, "url.json"), JSON.stringify(url));
console.log(`url.json: ${Object.keys(url).length} paragraphs mapped; ${missing.length} unmapped`);
if (missing.length) console.log("  unmapped: " + missing.slice(0, 20).join(", "));
// sample liveness
for (const p of ["219", "444", "1", "2865"]) console.log(`  ¶${p} -> ${url[p] ?? "(none)"}`);
