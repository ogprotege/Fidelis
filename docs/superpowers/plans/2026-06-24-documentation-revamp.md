# Documentation Revamp Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorganize every Fidelis documentation surface into one navigable, drift-resistant system — homes-per-reader, history archived verbatim, the reverent voice kept — with an automated link-check that makes broken pointers impossible.

**Architecture:** A hub-and-spoke docs tree centered on `docs/INDEX.md`. The release narrative is *extracted verbatim* from `CLAUDE.md` into `docs/history/RELEASES.md`; CLAUDE.md slims to a living reference + a one-line-per-release ledger. Guides move to `docs/guides/`. A new `scripts/check-doc-links.mjs` (Node built-ins only) validates every relative link, anchor, and orphan, and runs in CI — so the very drift this revamp follows can't recur. Each task leaves the repo green (link-check + `npm test` + `npm run build`).

**Tech Stack:** Markdown; Node 22 ESM (the link-checker, matching existing `scripts/*.mjs`); GitHub Actions (`.github/workflows/ci.yml`); React/TS only for the text-only `About.tsx` copy reconciliation.

**Spec:** `docs/superpowers/specs/2026-06-24-documentation-revamp-design.md`

## Global Constraints

These apply to **every** task (copied verbatim from the spec):

- **Reverent voice preserved everywhere** — the Scripture-tinged register and named-release tradition stay; this is structure, not a voice change.
- **One source of truth per fact** — release detail → `CHANGELOG.md` + `docs/history/RELEASES.md`; current architecture → `CLAUDE.md`; the pitch/features → `README.md` (mirrored in `About.tsx`); how-to → `docs/guides/`; design rationale → `docs/superpowers/`; standing rules + §13 refusals + identity → `CLAUDE.md` (load-bearing, kept verbatim). Everything else **points**, never repeats.
- **Verbatim extraction** — moved/extracted narrative loses zero words; proven by `diff`.
- **One click home** — every file under `docs/` (and the root maintainer docs) links back to `docs/INDEX.md`.
- **No dead links, no orphans** — `npm run check-docs` must pass at every commit.
- **No new runtime dependencies** — the link-checker uses Node built-ins only.
- **Do not touch** the liturgical engines, bundled texts (`public/data/`), harnesses, or app behavior. The only code touched: the new link-check script, doc-path references in comments/CI, and `About.tsx` **text only** (no new cards — the five-card Today rule and §13 are untouched; the `.tsx` emoji guard still applies).
- **Green at every commit** — `npm run check-docs`, `npm test`, and `npm run build` all pass before each task's final commit.
- Node 22 (what CI provides).

---

## File Structure

**New files**
- `scripts/check-doc-links.mjs` — the link/anchor/orphan validator (Node built-ins).
- `docs/INDEX.md` — the hub: reader-oriented map.
- `docs/history/RELEASES.md` — the release narrative, extracted verbatim from CLAUDE.md.
- `docs/guides/RELEASING.md` — the release runbook.
- `docs/superpowers/INDEX.md` — shipped-status index of specs & plans.
- `CONTRIBUTING.md` — short contributor guide.

**Moved (`git mv`, history preserved)**
- `docs/IOS.md` → `docs/guides/IOS.md`
- `docs/ANDROID.md` → `docs/guides/ANDROID.md`
- `docs/PLAYBOOK_2026-06-12.md` → `docs/history/PLAYBOOK_2026-06-12.md`

**Rewritten / modified**
- `CLAUDE.md` — slimmed to living reference + release ledger (narrative extracted).
- `README.md` — public front door + Docs Map.
- `AGENTS.md` — reconciled wording; nav pointer.
- `CHANGELOG.md` — add an anchored release TOC (content otherwise untouched).
- `src/pages/About.tsx` — copy reconciled to README pitch (text only).
- `.github/workflows/ci.yml` — add a `check-docs` step.
- `package.json` — add `"check-docs"` script.
- Every file in the reference inventory — doc-path references updated to new paths.

**Each file's responsibility:** `INDEX.md` = navigation hub; `RELEASES.md` = archived history; `CLAUDE.md` = how it's built now; `README.md` = why it exists + how to start; `CONTRIBUTING.md` = how to work on it; `RELEASING.md` = how to cut a release; `check-doc-links.mjs` = the integrity gate.

---

## Task 1: Link-checker tool + CI gate (the safety net, built first)

Build the validator before moving anything, so every later task is verifiable. Orphan-checking stays dormant until `docs/INDEX.md` exists (Task 4 enables it by creating the hub).

**Files:**
- Create: `scripts/check-doc-links.mjs`
- Modify: `package.json` (scripts block)
- Modify: `.github/workflows/ci.yml` (add a step)

**Interfaces:**
- Produces: `npm run check-docs` → exit 0 when all relative Markdown links/anchors resolve and (once `docs/INDEX.md` exists) no `docs/**` Markdown file is unreachable from it; exit 1 with a per-file report otherwise.

- [ ] **Step 1: Write the link-checker**

Create `scripts/check-doc-links.mjs`:

```js
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

// GitHub-style heading slug.
function slug(text) {
  return text.trim().toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-");
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

// 1. Validate every relative link target + anchor.
for (const file of files) {
  const text = readFileSync(file, "utf8");
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
    const text = readFileSync(cur, "utf8");
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
```

- [ ] **Step 2: Add the npm script**

In `package.json`, add to the `"scripts"` block:

```json
"check-docs": "node scripts/check-doc-links.mjs",
```

- [ ] **Step 3: Run it on the current repo**

Run: `npm run check-docs`
Expected: either `check-docs: OK (...)`, or a list of pre-existing dead links/anchors in the current docs.

- [ ] **Step 4: Fix any pre-existing dead links it reports**

For each reported `dead link` / `missing anchor`, open the offending file and correct the target (or the heading) so it resolves. Re-run until green.
Run: `npm run check-docs`
Expected: `check-docs: OK (...)`

- [ ] **Step 5: Wire it into CI**

In `.github/workflows/ci.yml`, add a step after the existing `npm test` / build steps (match the surrounding YAML indentation):

```yaml
      - name: Check documentation links
        run: npm run check-docs
```

- [ ] **Step 6: Verify nothing else broke, then commit**

Run: `npm test && npm run build && npm run check-docs`
Expected: all pass.

```bash
git add scripts/check-doc-links.mjs package.json .github/workflows/ci.yml
git commit -m "Add docs link-checker (scripts/check-doc-links.mjs) + CI gate"
```

---

## Task 2: Archive the release history (verbatim) and slim CLAUDE.md

Extract the per-release narrative out of `CLAUDE.md` into `docs/history/RELEASES.md` **without changing a word**, leaving CLAUDE.md as the living reference + a release ledger. The standing rules, identity rules, and current-architecture sections stay in CLAUDE.md verbatim.

**Files:**
- Create: `docs/history/RELEASES.md`
- Modify: `CLAUDE.md`

**Interfaces:**
- Produces: `docs/history/RELEASES.md` with one `##` heading per release (stable anchors); CLAUDE.md's ledger links to those anchors.

- [ ] **Step 1: Identify the narrative sections to extract**

In `CLAUDE.md`, the extractable narrative is every release-specific section — the blocks headed by lines like `## Identity release — design spec §1–§2 (v1.3.0)`, `## The daily soul release …`, `## The formation release …`, … through `## The unbound page — iOS shell fixes — v1.13.2`, **plus** the `## Review items — all fixed in v1.1.0` block (the P0/P1/P2 record).
Run: `grep -n '^## ' CLAUDE.md`
Expected: a list of the section headers; note the start line of the first narrative section and confirm the trailing `## Standing rules` section is the part that STAYS.

- [ ] **Step 2: Create `docs/history/RELEASES.md` with the nav header**

Create the file with this exact top, then paste the extracted sections beneath it **verbatim**:

```markdown
# Release narrative — the faithful record

*For: anyone tracing how Fidelis grew, release by release.* · [← Docs index](../INDEX.md)

> Preserved verbatim from CLAUDE.md. The terse one-line ledger lives in
> [CLAUDE.md](../../CLAUDE.md#release-ledger); the canonical changelog is
> [CHANGELOG.md](../../CHANGELOG.md). This is the unabridged story.

---

<!-- BEGIN extracted narrative (verbatim) -->
```

…then the extracted `##` sections, then:

```markdown
<!-- END extracted narrative -->

---
[← Docs index](../INDEX.md) · Related: [CHANGELOG](../../CHANGELOG.md) · [CLAUDE.md](../../CLAUDE.md)
```

- [ ] **Step 3: Prove the extraction is verbatim**

Save the original for comparison and diff the moved text:
```bash
git show HEAD:CLAUDE.md > /tmp/claude-before.md
# Extract just the narrative span from both and diff; expect zero differences in the moved lines.
```
Manually confirm: every line that left CLAUDE.md appears identically (byte-for-byte) inside the `BEGIN/END extracted narrative` markers in `docs/history/RELEASES.md`.
Expected: no wording differences — only the surrounding nav header/footer is new.

- [ ] **Step 4: Replace the narrative in CLAUDE.md with a release ledger**

Delete the extracted sections from `CLAUDE.md`. In their place add one section:

```markdown
## Release ledger

One line per release. The unabridged narrative is
[docs/history/RELEASES.md](docs/history/RELEASES.md); the changelog is [CHANGELOG.md](CHANGELOG.md).

- **v1.13.2 — the unbound page** — iOS-shell fixes (reference-counted scroll-lock, startup font preloader, scripted Widget Extension target), the Chi-Rho native icon, the four-face Scripture lineup, sw cache v4→v5. → [detail](docs/history/RELEASES.md#the-unbound-page--ios-shell-fixes--v1132)
- **v1.13.1 — the second lampstand** — iOS Mass/Quote widgets + macOS CI. → [detail](docs/history/RELEASES.md#…)
- … (one line per release, newest first, each linking to its RELEASES.md anchor) …
```

Author one ledger line per release already present in the narrative, newest-first, each ending in a `→ [detail](docs/history/RELEASES.md#<anchor>)` link whose anchor matches the slug of that section's heading in RELEASES.md.

- [ ] **Step 5: Confirm CLAUDE.md kept the load-bearing parts**

Verify by grep that the standing rules and identity rules are still present verbatim:
Run: `grep -n 'Standing rules\|never exceeds five cards\|Section 13 of the design spec\|Never hand-edit' CLAUDE.md`
Expected: all still present (these are NOT extracted — they live in CLAUDE.md).

- [ ] **Step 6: Validate and commit**

Run: `npm run check-docs && npm test && npm run build`
Expected: all pass (the ledger→RELEASES anchors resolve).

```bash
git add CLAUDE.md docs/history/RELEASES.md
git commit -m "Archive release narrative to docs/history/RELEASES.md; slim CLAUDE.md to a living reference + ledger"
```

---

## Task 3: Move the guides + PLAYBOOK and update every reference

Move files **and** update all references in the **same commit**, so the link-check never sees a broken state.

**Files:**
- Move: `docs/IOS.md` → `docs/guides/IOS.md`; `docs/ANDROID.md` → `docs/guides/ANDROID.md`; `docs/PLAYBOOK_2026-06-12.md` → `docs/history/PLAYBOOK_2026-06-12.md`
- Modify: every file referencing those paths (inventory below)

- [ ] **Step 1: Build the reference inventory**

Run:
```bash
grep -rn "docs/IOS\.md\|docs/ANDROID\.md\|docs/PLAYBOOK_2026-06-12\.md\|\bIOS\.md\|\bANDROID\.md" \
  README.md CLAUDE.md CHANGELOG.md AGENTS.md docs/ .github/ src/ scripts/ package.json
```
Expected: the master list of pointers (baseline: ~20 hits for `docs/IOS.md`, plus ANDROID/PLAYBOOK). Keep this output as the checklist for Step 3.

- [ ] **Step 2: Move the files with git mv**

```bash
mkdir -p docs/guides
git mv docs/IOS.md docs/guides/IOS.md
git mv docs/ANDROID.md docs/guides/ANDROID.md
git mv docs/PLAYBOOK_2026-06-12.md docs/history/PLAYBOOK_2026-06-12.md
```

- [ ] **Step 3: Update every reference from the inventory**

For each hit in Step 1, rewrite the path: `docs/IOS.md` → `docs/guides/IOS.md`, `docs/ANDROID.md` → `docs/guides/ANDROID.md`, `docs/PLAYBOOK_2026-06-12.md` → `docs/history/PLAYBOOK_2026-06-12.md`. **Also fix intra-file relative links** inside the moved files themselves (they are now one directory deeper — e.g. a link from `guides/IOS.md` to `../CHANGELOG.md`-style siblings must gain the right number of `../`). Re-run the Step 1 grep; expect zero remaining old paths.
Run: `grep -rn "docs/IOS\.md\|docs/ANDROID\.md\|docs/PLAYBOOK" README.md CLAUDE.md docs/ .github/ src/ scripts/`
Expected: only the NEW paths (`docs/guides/…`, `docs/history/…`) appear.

- [ ] **Step 4: Validate and commit**

Run: `npm run check-docs && npm test && npm run build`
Expected: all pass.

```bash
git add -A
git commit -m "Move platform guides to docs/guides/ and PLAYBOOK to docs/history/; update all references"
```

---

## Task 4: The hub — docs/INDEX.md + per-doc nav furniture (enables orphan-check)

Create the navigation hub and give every `docs/**` file the one-click-home furniture. Creating `docs/INDEX.md` automatically arms the orphan check in Task 1's script.

**Files:**
- Create: `docs/INDEX.md`
- Modify: every Markdown file under `docs/` (add header + footer nav furniture); `CLAUDE.md`, `README.md`, `AGENTS.md`, `CHANGELOG.md` (add a `← Docs index` pointer)

- [ ] **Step 1: Write `docs/INDEX.md` (the hub)**

Create with exactly these reader spokes (the five agreed in the spec), each link resolving to a real file:

```markdown
# Fidelis documentation — index

*The map. Start here; you're one click from home on every page.*

**Using the app?** → [README](../README.md) · the in-app **About** page.

**Contributing or building?** → [CONTRIBUTING](../CONTRIBUTING.md) · [guides](guides/) ([iOS](guides/IOS.md) · [Android](guides/ANDROID.md) · [Releasing](guides/RELEASING.md)) · [CLAUDE.md](../CLAUDE.md).

**Want the history?** → [CHANGELOG](../CHANGELOG.md) · [the release narrative](history/RELEASES.md) · [the 2026-06-12 playbook](history/PLAYBOOK_2026-06-12.md).

**The design rationale?** → [specs & plans](superpowers/INDEX.md) · [the reviews](review/).

**Maintainer / AI assistant?** → [CLAUDE.md](../CLAUDE.md) · [AGENTS.md](../AGENTS.md) · [Releasing](guides/RELEASING.md).
```

(The INDEX links to `guides/RELEASING.md`, `CONTRIBUTING.md`, and `superpowers/INDEX.md`, which Task 5 fills out. To keep this task's commit green, create those three files as one-line stubs at the END of this task — e.g. `# Releasing\n\n*Stub — see Task 5.*` — so every link resolves now; Task 5 replaces the stub bodies.)

- [ ] **Step 2: Define the nav-furniture template**

Apply to each Markdown file under `docs/` (adjust `../` depth to reach `docs/INDEX.md`). Header goes right after the H1; footer at end of file:

Header (a guide, depth `docs/guides/`):
```markdown
*For: <one-line who-this-is-for>.* · [← Docs index](../INDEX.md)
```
Footer:
```markdown
---
[← Docs index](../INDEX.md) · Related: [<X>](<path>) · [<Y>](<path>)
```
For `docs/review/*` and `docs/superpowers/**` use `../INDEX.md` / `../../INDEX.md` as depth requires. For root docs (`CLAUDE.md`, `README.md`, `AGENTS.md`, `CHANGELOG.md`) the home link is `docs/INDEX.md`.

- [ ] **Step 3: Apply the furniture to every docs/** file and root maintainer docs**

Add the header + footer to: `docs/guides/IOS.md`, `docs/guides/ANDROID.md`, `docs/guides/RELEASING.md` (stub), `docs/history/RELEASES.md` (already has it from Task 2 — verify), `docs/history/PLAYBOOK_2026-06-12.md`, `docs/review/*.md`, `docs/superpowers/INDEX.md` (stub), each `docs/superpowers/specs/*.md` and `docs/superpowers/plans/*.md` (header line + `← Docs index` is enough for these many files — footer optional), and a single `← [Docs index](docs/INDEX.md)` line near the top of `README.md`, `CLAUDE.md`, `AGENTS.md`, `CHANGELOG.md`.

- [ ] **Step 4: Validate (orphan-check now live) and commit**

Run: `npm run check-docs`
Expected: `OK` — every `docs/**` file is now reachable from `docs/INDEX.md` and all links resolve. (If an orphan is reported, add it to the right INDEX spoke or link it from a parent doc.)
Then: `npm test && npm run build`

```bash
git add -A
git commit -m "Add docs/INDEX.md hub + one-click-home nav furniture across docs/"
```

---

## Task 5: CONTRIBUTING.md, RELEASING.md, superpowers/INDEX.md

Flesh out the three docs stubbed in Task 4.

**Files:**
- Modify (fill stub): `CONTRIBUTING.md`, `docs/guides/RELEASING.md`, `docs/superpowers/INDEX.md`

- [ ] **Step 1: Write `CONTRIBUTING.md`**

Required elements (reverent voice, concise): a one-line welcome; **Setup** (`npm install`, Node 22); **Verify** (`npm test`, `npm run build`, `npm run check-docs` — and what each does); the **standing rules** quoted by pointer to `CLAUDE.md` (five-card Today page; never hand-edit `public/data/`; the §13 refusal list is binding; bump `package.json` + CHANGELOG together); **PR expectations** (CI green, including the docs link-check); and a closing `← Docs index` pointer. Do **not** restate the rules' full text — link to CLAUDE.md (single source of truth).

- [ ] **Step 2: Write `docs/guides/RELEASING.md`**

Required elements: the ordered release runbook consolidated from current practice — (1) bump `package.json` version + add a `CHANGELOG.md` entry together; (2) regenerate widget data (`npm run widgets`) if calendar/quote/lectionary changed; (3) `npm test && npm run build && npm run check-docs`; (4) native version strings (`android/app/build.gradle` versionName/Code, iOS `MARKETING_VERSION`) reconciled; (5) `npx cap sync` for native shells; (6) tag + push. Add the nav header/footer. Cross-check the exact commands against `package.json` scripts and the CLAUDE.md "Commands" section so they match reality.

- [ ] **Step 3: Write `docs/superpowers/INDEX.md`**

Required elements: a table of every file under `docs/superpowers/specs/` and `docs/superpowers/plans/`, each with a one-line summary and a **shipped status** (✓ shipped in vX.Y.Z / ▢ open), derived from the CLAUDE.md ledger + CHANGELOG. Add the nav header/footer.

- [ ] **Step 4: Validate and commit**

Run: `npm run check-docs && npm test && npm run build`
Expected: all pass.

```bash
git add CONTRIBUTING.md docs/guides/RELEASING.md docs/superpowers/INDEX.md
git commit -m "Write CONTRIBUTING, the releasing runbook, and the specs/plans status index"
```

---

## Task 6: README front door + About.tsx reconciliation

Rewrite `README.md` as the public front door with a Docs Map, and reconcile the in-app About copy to the same pitch (text only).

**Files:**
- Modify: `README.md`
- Modify: `src/pages/About.tsx` (copy only)

- [ ] **Step 1: Rewrite README as the front door**

Keep/refresh: the masthead (`✠ FIDELIS`, tagline), the free-forever pledge, the version badges (currently 1.13.2 — keep current), a **condensed** feature highlight reel (link deeper detail to CLAUDE.md/guides rather than restating it), and **Quick start** (`npm install` · `npm run dev` · `npm test` · `npm run build`). Add a **Docs Map** section mirroring `docs/INDEX.md`'s five spokes, each linking to the canonical doc. Move deep internal detail (architecture, per-release prose) OUT — link to CLAUDE.md / RELEASES.md instead. Preserve the reverent voice and the §13 refusal list (it's part of the public identity).

- [ ] **Step 2: Reconcile About.tsx copy to the README pitch**

Open `src/pages/About.tsx`. Align its prose (the pitch, the pledge, the translations/canon claims) with the README so the two never disagree. **Text only** — no new cards, no structural/behavior change, no emoji (the `.tsx` emoji guard runs in `npm test`). If a fact (e.g., translations list) is stated in both, ensure they match exactly.

- [ ] **Step 3: Validate and commit**

Run: `npm run check-docs && npm test && npm run build`
Expected: all pass (the README Docs Map links resolve; About.tsx compiles and passes the emoji/lang guards).

```bash
git add README.md src/pages/About.tsx
git commit -m "Rewrite README as the front door + Docs Map; reconcile About copy"
```

---

## Task 7: Final validation + reconcile AGENTS.md + done-criteria walk

Tie off: reconcile AGENTS.md wording, then run the full done-criteria from the spec and audit the slimmed CLAUDE.md.

**Files:**
- Modify: `AGENTS.md` (reconcile wording to the new CLAUDE.md + add the index pointer if not already)

- [ ] **Step 1: Reconcile AGENTS.md**

Ensure AGENTS.md still points to `CLAUDE.md` as authoritative, references the correct (moved) guide paths, and mentions `npm run check-docs` alongside `npm test`/`build`. Keep it lean.

- [ ] **Step 2: Run the full done-criteria**

Run:
```bash
npm run check-docs && npm test && npm run build
```
Expected: all green. Then re-confirm the **verbatim** guarantee: diff the `BEGIN/END extracted narrative` block in `docs/history/RELEASES.md` against `git show <pre-Task-2-commit>:CLAUDE.md`'s narrative span — zero wording differences.

- [ ] **Step 3: Audit the slimmed CLAUDE.md**

Invoke **`claude-md-management:claude-md-improver`** to check the trimmed CLAUDE.md against the quality template (high-signal, no stale claims, rules intact). Apply any high-value suggestions; re-run `npm run check-docs`.

- [ ] **Step 4: Walk the hub**

Open `docs/INDEX.md`; follow each of the five reader spokes; confirm each lands on the right, current doc, and that each landed doc links back home. Fix any awkward path.

- [ ] **Step 5: Final review + commit**

Invoke **`superpowers:requesting-code-review`** on the full diff (focus: no lost narrative, no dead links, voice consistent, rules intact). Address findings.

```bash
git add -A
git commit -m "Reconcile AGENTS.md; final docs-revamp validation pass"
```

---

## Self-Review

**Spec coverage:**
- §3 source-of-truth map → enforced by Tasks 2 (history out of CLAUDE), 6 (pitch in README/About), 3 (how-to in guides). ✓
- §4 target structure → Tasks 2–6 create/move every listed file. ✓
- §5 navigation model (hub, furniture, README map, 5 spokes) → Task 4 (hub + furniture) + Task 6 (README map). ✓
- §6 link integrity & migration sequence → Task 3 (inventory→mv→update) + Task 1 (checker). ✓
- §7 validation (link-check, CI hook, verbatim diff, orphan check, test/build) → Task 1 (checker+CI), Task 2 (diff), Task 4 (orphan), Task 7 (full walk). ✓
- §8 skills → Task 7 (claude-md-improver, requesting-code-review). ✓
- Micro-decisions (guides move / specs stay / PLAYBOOK→history) → Task 3. ✓

**Placeholder scan:** The link-checker is complete runnable code. Prose-doc steps enumerate exact required elements + a concrete verification (`check-docs`/`diff`/`grep`) rather than "write docs" — the authored prose is the deliverable, the elements and gates are specified. No "TODO/TBD."

**Type/name consistency:** `npm run check-docs` and `scripts/check-doc-links.mjs` used consistently across all tasks; the ledger anchors in Task 2 must match `RELEASES.md` heading slugs (Task 2 Step 4 states this explicitly); moved paths (`docs/guides/`, `docs/history/`) consistent across Tasks 3–6.

**Note on green-at-every-commit:** Task 4 links to files Task 5 creates; Task 4 Step 1 resolves this by creating one-line stubs for `CONTRIBUTING.md`, `docs/guides/RELEASING.md`, `docs/superpowers/INDEX.md` at the end of Task 4 so its commit is green, with Task 5 fleshing them out.
