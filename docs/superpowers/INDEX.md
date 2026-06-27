# Fidelis — specs & plans index

*For: contributors and AI assistants navigating the design history.*  · [← Docs index](../INDEX.md)

These documents are the working design artifacts: feature specs written before implementation, and the step-by-step implementation plans that followed. They are preserved verbatim as the record of intent.

## Feature design specs

- [Rosary mystery sheet design (2026-06-14)](specs/2026-06-14-rosary-mystery-sheet-design.md) — §6 card 4: the bottom-sheet view of each rosary mystery with its passage and prayers. ✓ shipped v1.4.0
- [Indulgence timer design (2026-06-14)](specs/2026-06-14-indulgence-timer-design.md) — §6.1: the 30-minute reading-time indulgence notice in the Reader. ✓ shipped v1.4.0
- [Reading plans design (2026-06-14)](specs/2026-06-14-reading-plans-design.md) — §7: whole-Bible and canonical reading plans with pace arithmetic and a plan manager. ✓ shipped v1.4.0
- [Commentary reader layer design (2026-06-15)](specs/2026-06-15-commentary-reader-layer-design.md) — §4: Haydock + Catena Aurea commentary inline in the Reader via gold dots and a side-panel Sheet. ✓ shipped v1.5.0
- [CCC citation index design (2026-06-15)](specs/2026-06-15-ccc-citation-index-design.md) — §5: Scripture-to-Catechism verse→paragraph citation index with purple underline marks and vatican.va links. ✓ shipped v1.9.0
- [CCC index local-build runbook (2026-06-15)](specs/2026-06-15-ccc-index-LOCAL-BUILD-RUNBOOK.md) — build steps for the `npm run ccc` pipeline (PDF parser + vatican.va URL crawl); run by the owner, output committed. ✓ shipped v1.9.0
- [Navigation IA design (2026-06-17)](specs/2026-06-17-navigation-ia-design.md) — §nav pass: scroll restoration, SectionNav jump bars, overlay-Back handling, Search URL state, and focus routing. ✓ shipped v1.12.0
- [Documentation revamp design (2026-06-24)](specs/2026-06-24-documentation-revamp-design.md) — this docs overhaul: the seven-task plan that produced the current `docs/` structure and all new guide/history pages. ✓ shipped v1.13.3
- [Golden Chain: chronological & beyond-Gospels design (2026-06-27)](specs/2026-06-27-commentary-chronological-and-beyond-gospels-design.md) — §4.3 commentary, third pass: order the Catena chronologically (Phase 1), keep Haydock in its own lane (Phase 2), extend the patristic chain beyond the Gospels from a PD source (Phase 3). ✓ Phases 1–2 shipped v1.14.0 (Phase 3 → v1.15.0)
- [CCC inline catechism design (2026-06-27)](specs/2026-06-27-ccc-inline-catechism-design.md) — §5 follow-on: replace the vatican.va redirect with an inline catechism sheet — bundled public-domain Trent (default) → imported personal CCC (supersedes) → vatican.va links (fallback) → future licensed CCC. ✓ shipped v1.14.0 (McHugh-Callan 1923 bundled; Donovan deferred)
- [Quote-of-the-Day intake design (2026-06-27)](specs/2026-06-27-quotes-intake-design.md) — §3 handoff contract: the `quotes.corpus.json` entry schema, the public-domain red list, the selection model, and the build/widget-resync steps for owner-authored quotes. ✓ shipped v1.14.0
- [Modern CCC import local-build runbook (2026-06-27)](specs/2026-06-27-ccc-text-LOCAL-BUILD-RUNBOOK.md) — owner-run converter (EPUB/PDF → `fidelis-ccc-1` JSON) for the §6 personal Catechism import; output gitignored, imported on-device only, never committed. ✓ shipped v1.14.0

## Implementation plans

- [Rosary mystery sheet plan (2026-06-14)](plans/2026-06-14-rosary-mystery-sheet.md) — step-by-step implementation plan for §6 card 4 (the `Sheet` primitive, `MysterySheet`, `passageText` extraction). ✓ shipped v1.4.0
- [Indulgence timer plan (2026-06-14)](plans/2026-06-14-indulgence-timer.md) — step-by-step implementation plan for §6.1 (the `reading.ts` accumulator, Page Visibility ticking, `IndulgenceNotice`). ✓ shipped v1.4.0
- [Reading plans plan (2026-06-14)](plans/2026-06-14-reading-plans.md) — step-by-step implementation plan for §7 (`plans.ts` arithmetic, `/plans` and `/plans/new` pages, Continue-Reading line). ✓ shipped v1.4.0
- [Close the quiet loops plan (2026-06-16)](plans/2026-06-16-close-the-quiet-loops.md) — step-by-step implementation plan for the v1.8.1 a11y + polish pass (Reader operability, ARIA roles, sheet improvements, Search filter chips). ✓ shipped v1.8.1
- [Documentation revamp plan (2026-06-24)](plans/2026-06-24-documentation-revamp.md) — step-by-step implementation plan for the seven-task docs overhaul (this `docs/` restructure). ✓ shipped v1.13.3
- [Commentary P1: chronological ordering (2026-06-27)](plans/2026-06-27-commentary-p1-chronological-ordering.md) — order the Gospel Catena earliest-Father-first via a render-time sort. ✓ shipped v1.14.0
- [Commentary P2: Haydock lane (2026-06-27)](plans/2026-06-27-commentary-p2-haydock-lane.md) — Haydock in its own "Church Fathers"-renamed lane, never interleaved. ✓ shipped v1.14.0
- [Commentary P3: beyond the Gospels (2026-06-27)](plans/2026-06-27-commentary-p3-beyond-gospels.md) — extend the patristic chain to the whole canon from a PD source. 📝 plan · v1.15.0
- [CCC P1: Trent inline sheet (2026-06-27)](plans/2026-06-27-ccc-p1-trent-inline-sheet.md) — bundled public-domain Trent (McHugh–Callan 1923; Donovan deferred) in an inline catechism sheet. ✓ shipped v1.14.0
- [CCC P2: personal CCC import (2026-06-27)](plans/2026-06-27-ccc-p2-personal-import.md) — import your own CCC copy (paragraph JSON + Mac converter) to supersede Trent. ✓ shipped v1.14.0
- [Quote-of-the-Day intake/build (2026-06-27)](plans/2026-06-27-quotes-intake-build.md) — validate the owner-authored corpus, build, and resync the widgets. ✓ shipped v1.14.0

---
[← Docs index](../INDEX.md) · Related: [code review](../review/Fidelis_Code_Review_V1_2026-06-11.md) · [feature design spec](../review/Fidelis_Feature_Design_Spec_V1_2026-06-11.md)
