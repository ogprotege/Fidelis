# Documentation revamp — design spec

[← Docs index](../../INDEX.md)

> *"Set in order the things that are wanting."* — Titus 1:5

**Date:** 2026-06-24 · **Status:** approved (brainstorming), pending implementation plan
**Topic:** a comprehensive, navigable, drift-resistant documentation system for Fidelis

---

## 1. Goal

Bring every documentation surface into one coherent, navigable system — so a reader
always knows where they are, where to go, and never lands on a pointer to the wrong
place. This is **structure, navigability, and de-duplication**, not a rewrite of the
project's substance. The four decisions taken in brainstorming:

1. **Comprehensive overhaul** — every surface (README, in-app About, CLAUDE.md,
   CHANGELOG, the whole `docs/` tree).
2. **Preserve all history, archived** — every word of the release narrative is kept
   *verbatim*; nothing is paraphrased away. It simply moves out of the living docs into
   a dedicated archive.
3. **Keep the reverent voice everywhere** — the Scripture-tinged register and the
   named-release tradition are core identity; they are preserved across all docs,
   maintainer-facing included.
4. **Approach B + select C touches** — homes-per-reader as the backbone, plus a
   `docs/INDEX.md`, a short `CONTRIBUTING.md`, and a CI link-check. No static docs site.

## 2. Principles (the spine)

- **One source of truth per fact.** Each kind of fact has exactly one canonical home;
  everything else *points* rather than *repeats*. This is the structural cure for the
  drift this very revamp follows (README/CLAUDE/CHANGELOG had silently disagreed).
- **One click home, from anywhere.** Every doc links back to `docs/INDEX.md`; the index
  is the hub. No reader is ever more than one hop from the map.
- **No orphans, no dead ends.** Every doc is reachable from the index, and every index
  entry resolves to a real file. Enforced automatically (§7).
- **Preserve, don't paraphrase.** Extraction is verbatim; a diff proves zero words lost.
- **Don't fight the tooling.** Design specs stay where the brainstorming skill writes
  them (`docs/superpowers/specs/`); we index them rather than relocate them.

## 3. The source-of-truth map

| The fact… | …lives canonically in | Everything else |
|---|---|---|
| What shipped, and when (per release) | `CHANGELOG.md` + `docs/history/RELEASES.md` | links to it |
| How Fidelis is built *now* (architecture) | `CLAUDE.md` | links to it |
| Why it exists; the pledge; features | `README.md` (mirrored in-app by `About.tsx`) | links to it |
| How to do a thing (platform / build / release) | `docs/guides/` | links to it |
| Why a feature was designed this way | `docs/superpowers/{specs,plans}/` | indexed |
| Standing rules / §13 refusals / identity | `CLAUDE.md` (load-bearing — stays) | quoted, not forked |
| Cloud-agent / CI setup | `AGENTS.md` | links to CLAUDE.md |

## 4. Target structure

### Root (the front doors)

| File | Disposition |
|---|---|
| `README.md` | Rewrite as the **public front door**: pitch · the free-forever pledge · a condensed feature highlight reel · quick start (install / run / test / build) · a compact **Docs Map** mirroring the index. Deep internal detail moves out to CLAUDE.md / guides. |
| `CLAUDE.md` | Slim to a **living reference** (target ~150–200 lines, from 605): what Fidelis is · commands · *current-state* architecture (engines, data pipeline, the identity + standing rules, kept verbatim) · a tight **release ledger** (one line per release → anchor in `RELEASES.md` / `CHANGELOG.md`). The per-release narrative is **extracted**, not deleted. |
| `AGENTS.md` | Keep (lean Cursor-cloud entry pointer); reconcile wording to the new CLAUDE.md. |
| `CHANGELOG.md` | Unchanged role — canonical Keep-a-Changelog history. Add a small anchored TOC of releases. |
| `CONTRIBUTING.md` | **New, short** (C-touch): setup, `npm test` / `npm run build`, the standing rules + "never hand-edit `public/data/`", PR expectations, and a pointer to the docs index. |

### `docs/` (reorganized)

```
docs/
  INDEX.md                  ← NEW: the hub — reader-oriented map
  guides/
    IOS.md                  ← git mv from docs/IOS.md
    ANDROID.md              ← git mv from docs/ANDROID.md
    RELEASING.md            ← NEW: the release runbook (version bump → CHANGELOG →
                              widgets regen → cap sync → tag/push), consolidated
  history/
    RELEASES.md             ← NEW: the release narrative extracted *verbatim* from CLAUDE.md
                              (v1.3.0 … v1.13.2 + the P0/P1/P2 review record)
    PLAYBOOK_2026-06-12.md  ← git mv from docs/ (a dated, completed session playbook)
  review/                   ← kept as-is (code review, feature spec, commentary survey)
  superpowers/
    INDEX.md                ← NEW: shipped-status index of every spec & plan
    specs/  plans/          ← kept where the brainstorming skill writes them
```

### Other

| File | Disposition |
|---|---|
| `src/pages/About.tsx` | Reconcile its copy to the README pitch (content consistency only — **no behavior change**, no new cards, §2-card rule untouched). |
| `scripts/check-doc-links.mjs` | **New** link-checker (§7). |
| `.github/workflows/ci.yml` | **New step** running the link-checker (§7). |

### Micro-decisions (resolved)

1. **Move `IOS.md` / `ANDROID.md` → `docs/guides/`** — yes. ~20 references to `docs/IOS.md`
   exist; all updated in the reference pass (§6) and verified by the link-check (§7).
2. **Keep specs/plans under `docs/superpowers/`** — yes (that's where this skill writes
   them); add `docs/superpowers/INDEX.md` for shipped status instead of relocating.
3. **`docs/PLAYBOOK_2026-06-12.md`** — move to `docs/history/` (a completed playbook).

## 5. Navigation model

A **hub-and-spoke** with `docs/INDEX.md` at the center.

**`docs/INDEX.md` — organized by who you are, not by filename:**

- **Using the app?** → `README.md` · the in-app About page
- **Contributing / building?** → `CONTRIBUTING.md` · `docs/guides/` · `CLAUDE.md`
- **Want the history?** → `CHANGELOG.md` · `docs/history/RELEASES.md`
- **The design rationale?** → `docs/superpowers/` (specs & plans, with shipped status)
- **Maintainer / AI assistant?** → `CLAUDE.md` · `AGENTS.md` · `docs/guides/RELEASING.md`

**Per-doc navigation furniture** (applied to every file under `docs/`, and to the root
maintainer docs):

- **Header** (2 lines): a one-line *"who this is for"* + a `← Docs index` link home.
- **Footer**: `← Docs index · Related: X · Y`.

**README** carries a compact **Docs Map** mirroring the index — README is the door for
*arrivals*, INDEX is the hub for *navigators*; two entrances, one map.

## 6. Link integrity & migration sequence

**Measure twice, cut once.** Build new beside old, validate, then remove old.

1. **Reference inventory first.** Grep the entire repo (README, CLAUDE.md, CHANGELOG,
   AGENTS, all of `docs/`, code comments, `.github/`, `package.json`, `About.tsx`) for
   every doc-path mention (`docs/…`, `*.md`, bare `IOS.md`, etc.). This master list is
   the set of pointers that must be updated. (Baseline already measured: `docs/IOS.md`
   ~20 refs, CLAUDE.md 22, CHANGELOG 20.)
2. **Scaffold** the new tree — folders + INDEX / CONTRIBUTING / RELEASING / guides shells.
3. **Extract** CLAUDE.md's release narrative → `docs/history/RELEASES.md`, **verbatim**;
   then `diff` the extracted text against the original sections to prove zero words lost.
4. **Slim** CLAUDE.md to the living reference + release ledger (each ledger line anchored
   into `RELEASES.md` / `CHANGELOG.md`).
5. **`git mv`** the guides + PLAYBOOK (preserves history/blame); write INDEX,
   CONTRIBUTING, RELEASING, `docs/superpowers/INDEX.md`.
6. **Rewrite** README as front door + Docs Map; reconcile `About.tsx` copy.
7. **Update every reference** from the step-1 inventory to its new path — one driven pass.
8. **Validate** (§7).

## 7. Validation — "nothing lost, nothing broken"

A new `scripts/check-doc-links.mjs` (Node, no new deps) walks every Markdown file and:

- resolves every relative link and file-path mention → **fails** if any target is missing;
- checks every `#anchor` link → **fails** if the target heading doesn't exist;
- reports orphans (docs not reachable from `INDEX.md`).

**Done-criteria (all checkable):**

- [ ] **Verbatim diff:** extracted history == original CLAUDE.md sections (no words lost).
- [ ] **Link-check passes:** zero dead internal links, zero missing anchors, zero orphans.
- [ ] **CI hook:** `check-doc-links.mjs` runs in `ci.yml`, so future renames can't rot a link.
- [ ] **`npm test` + `npm run build` green** (code comments referencing moved docs updated).
- [ ] **Walk the hub:** open `INDEX.md`, follow each reader-spoke, confirm each lands well.
- [ ] **One-click-home:** every `docs/` file headers back to the index.

## 8. Skills to leverage

- **`superpowers:writing-plans`** — the mandated next step after this spec: turn it into a
  phased implementation plan.
- **`claude-md-management:claude-md-improver`** — during the CLAUDE.md slimming, to audit
  the trimmed result against the CLAUDE.md quality template (so the living reference is
  genuinely high-signal, not just shorter).
- **`superpowers:requesting-code-review`** / **`verification-before-completion`** — before
  declaring done: confirm the link-check, diffs, and `npm test`/`build` actually pass.
- **`elements-of-style:writing-clearly-and-concisely`** *(if available)* — for the README
  front-door and CONTRIBUTING prose.

## 9. Out of scope

- No static docs site / generator (explicitly declined — C overhead).
- No voice change (the reverent register is preserved everywhere).
- No rewriting of historical content — extraction is verbatim; only *current-state*
  living docs (README front-door, slimmed CLAUDE.md) are authored fresh.
- No touching the liturgical engines, bundled texts, harnesses, or app behavior. The only
  code touched is comments that reference moved doc paths, the new link-check script, and
  the `About.tsx` copy reconciliation (text only).

## 10. Risks & mitigations

| Risk | Mitigation |
|---|---|
| A moved file leaves a dangling pointer | Reference inventory (§6.1) + automated link-check gate (§7) + CI hook |
| Narrative lost during extraction | Verbatim `git mv`/copy + a `diff` proving equality (§6.3) |
| CLAUDE.md slimming drops a load-bearing rule | Standing rules + identity rules are *kept verbatim*; only the release narrative is extracted; `claude-md-improver` audit (§8) |
| The index goes stale as docs are added | CONTRIBUTING documents "add new docs to the index"; the orphan check (§7) fails CI if a doc isn't linked |
| README/About drift again | Single-source-of-truth map (§3) + the pitch authored once, About mirrors it |
