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

## Implementation plans

- [Rosary mystery sheet plan (2026-06-14)](plans/2026-06-14-rosary-mystery-sheet.md) — step-by-step implementation plan for §6 card 4 (the `Sheet` primitive, `MysterySheet`, `passageText` extraction). ✓ shipped v1.4.0
- [Indulgence timer plan (2026-06-14)](plans/2026-06-14-indulgence-timer.md) — step-by-step implementation plan for §6.1 (the `reading.ts` accumulator, Page Visibility ticking, `IndulgenceNotice`). ✓ shipped v1.4.0
- [Reading plans plan (2026-06-14)](plans/2026-06-14-reading-plans.md) — step-by-step implementation plan for §7 (`plans.ts` arithmetic, `/plans` and `/plans/new` pages, Continue-Reading line). ✓ shipped v1.4.0
- [Close the quiet loops plan (2026-06-16)](plans/2026-06-16-close-the-quiet-loops.md) — step-by-step implementation plan for the v1.8.1 a11y + polish pass (Reader operability, ARIA roles, sheet improvements, Search filter chips). ✓ shipped v1.8.1
- [Documentation revamp plan (2026-06-24)](plans/2026-06-24-documentation-revamp.md) — step-by-step implementation plan for the seven-task docs overhaul (this `docs/` restructure). ✓ shipped v1.13.3

---
[← Docs index](../INDEX.md) · Related: [code review](../review/Fidelis_Code_Review_V1_2026-06-11.md) · [feature design spec](../review/Fidelis_Feature_Design_Spec_V1_2026-06-11.md)
