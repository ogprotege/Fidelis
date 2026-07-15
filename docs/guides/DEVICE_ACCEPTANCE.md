# Device acceptance checklist

*For: the maintainer, running the audit's [§10 native acceptance checklist](../review/Fidelis_Full_Product_Audit_2026-07-15.md) on real hardware.*  · [← Docs index](../INDEX.md)

These are the §10 items that **only physical hardware can prove** — the ones a
browser capture, the iOS Simulator, or static source review cannot settle
(VoiceOver speech, live Dynamic Type, the on-screen-keyboard geometry, the
Photos permission dialog, widget midnight/time-zone rollover, Siri). Run them
from the **current TestFlight build** (iOS) and a debug APK / device (Android).
Everything else in §10 is confirmed at build time — see the release notes for
the version you are testing.

The rest of §10 (launch/theme/safe-area code, the sheet scroll-lock, the
docked-bar reservation, the offline corpus, the archive contents, the region
policy) is confirmed by source/build inspection and does not need this pass;
this document is only the hardware residue.

---

## iOS — run from TestFlight on a physical iPhone

1. **Night cold launch — no Day-theme flash.** Put the device in Dark mode, set
   the app theme to System or Night, force-quit, then cold launch and watch the
   first ~200–500 ms.
   *Pass:* the near-black field appears with no white/parchment flash.
   **⚠ Known concern (v1.18.4):** the in-document theme is flash-free (the
   `index.html` pre-paint script sets `data-theme` before the first paint), but
   the **native** launch surfaces are light-pinned — `Splash.imageset` has no
   dark appearance variant and `capacitor.config.ts` `backgroundColor` is
   `#f4f2ee` (the Day token). A brief white→parchment flash before the WebView's
   dark first paint is possible. Not a release blocker; if seen, the fix is a
   dark-appearance Splash variant plus a night-aware native `backgroundColor`.

2. **Safe areas, portrait and landscape, exactly once.** On a notched iPhone,
   rotate Today and the Reader.
   *Pass:* one gap under the status bar, one inset off the rounded corners in
   landscape — no doubled gutter.

3. **Masthead + overscroll.** Scroll a long Today/Reader page.
   *Pass:* the gold brand row scrolls fully away; the slim tab row pins under the
   status bar; pulling past the top shows the `--bg-1` strip filling the notch,
   not a transparent/parchment gap.

4. **Sheet scroll-lock + edge-swipe Back.** Open the Commentary or Catechism
   sheet, scroll a long note (the page must be frozen behind it), and dismiss —
   it must land at the exact prior verse. Then, with a sheet open, drag from the
   very left screen edge (the iOS Back gesture).
   *Pass:* the page scrolls normally afterward; the body is never stranded
   (frozen/blank).

5. **Keyboard vs. the docked verse-action bar.** Reader → tap a verse → Note;
   raise the software keyboard. Repeat at 320 / 390 / 430 px-class devices.
   *Pass:* the textarea **and** its Save-note button sit fully above the
   keyboard, unclipped; focusing the field does not zoom or shove the bar
   off-screen.

6. **Dynamic Type — live, at the largest category.** Settings → follow system
   size ON; set Accessibility → Display & Text Size → Larger Text to the largest
   accessibility size.
   *Pass:* the Reader Scripture text jumps to the 28 px cap **live** (no
   relaunch); changing the size while backgrounded and re-opening applies it (the
   `applicationDidBecomeActive` re-push); the folio line and verse-actions stay
   operable at 28 px. *Expected:* the non-reading chrome (tabs, headings, cards)
   does **not** scale — the bridge drives reading text only.

7. **VoiceOver — names, states, order.** Enable VoiceOver and swipe through a
   chapter.
   *Pass:* each verse announces its number + text + selected state; double-tap a
   verse and the highlight swatches announce "Highlight gold/rose/sky/olive"; the
   sheets announce their title and trap focus; Close returns the cursor to the
   verse; the Today card speaks "Liturgical color: …". *Two soft points to judge
   by ear:* the verse number is a bare numeral (no "verse" word) and only if
   verse numbers are on; the selected verse uses `aria-pressed` (voiced
   "selected"/"pressed").

8. **Share + Save Image (add-only Photos).** From any share entry point, confirm
   the 1080 × 1350 card renders in EB Garamond (not a serif-fallback flash);
   Share → the native sheet carries the PNG with title "Fidelis". Then Save image
   → the first tap shows the **add-only** Photos prompt with the `Info.plist`
   copy; Don't Allow → the "allow photo access for Fidelis in Settings" status
   line; grant → the card lands in Photos and Fidelis appears under Settings →
   Privacy → Photos as **add-only**.

9. **Widgets — families, appearance, rollover.** Add the Verse, Mass, and Quote
   widgets in Small/Medium/Large and toggle system Light/Dark.
   *Pass:* parchment/ink/gold render, text not clipped. Near local midnight, the
   verse/quote/Mass flip to the next day and match the Today card. Change the
   device time zone across a day boundary → widget and app agree after refresh.
   Tap each widget → it opens the app to the right screen (Mass → Readings,
   Verse/Quote → Today).

10. **Siri — "Today's Gospel."** With the app at its default region, invoke
    "Today's Gospel."
    *Pass:* the spoken citation matches the Gospel line on the Mass tab verbatim.
    *Note:* the widget/Siri data is fixed to the USCCB calendar, so it
    intentionally diverges if the app is switched to the Universal calendar.

11. **Airplane-mode offline.** Enable Airplane mode, cold launch, and open the
    Reader in DRB, CPDV, and the Clementine Vulgate, plus a Haydock note and a
    Catena Aurea note.
    *Pass:* all render with no network.

## Android — run on a physical device or emulator

1. **Hardware Back drains overlays first.** Open any sheet or the More popover →
   Back dismisses it, not the page. Mash Back twice as fast as possible under a
   sheet → the route behind never navigates or flashes.

2. **Widgets — midnight, reboot, time zone, tap.** Cross local midnight → each
   widget re-renders the new day. **Reboot with the app never opened** → confirm
   the widgets still roll over (there is no `BOOT_COMPLETED` receiver; the alarm
   is re-armed on the next `APPWIDGET_UPDATE` — verify this actually happens).
   Change the time zone across a boundary → re-resolves. Tap each widget → opens
   the right screen.

3. **Airplane-mode + imported text.** Airplane mode, cold launch → the bundled
   corpus reads. Import a translation, enable airplane mode, force-stop, cold
   relaunch → the imported text still renders from IndexedDB with no textless
   window (the v1.18.0 "both are preserved" atomic-import contract).

4. **Safe areas + navigation modes.** In **both** gesture nav and 3-button nav:
   the docked verse-action bar sits above the gesture pill / nav bar and is
   tappable; the sticky top tab row clears the status bar; rotate to landscape
   and confirm the side controls clear the cutout.

---

## Standing concerns to fold into a future pass

- **Night cold-launch splash is light-pinned** (iOS item 1 above) — minor; fix is
  a dark-appearance Splash variant + a night-aware native `backgroundColor`.
- **The Universal-region widget policy is explicit but not harness-pinned.**
  `scripts/build-calendar-widget.ts` fixes `REGION = "usa"` in code and documents
  it (and `CalendarWidgets.swift` / `TodaysGospelIntent.swift` / [IOS.md](IOS.md)
  restate it), but no harness assertion guards it — flipping the constant would
  not turn `npm test` red. Consider adding a check that pins `REGION` to `"usa"`
  so the policy itself, not just the artifact's freshness/parity, is guarded.

---
[← Docs index](../INDEX.md) · Related: [iOS guide](IOS.md) · [Releasing](RELEASING.md) · [audit §10](../review/Fidelis_Full_Product_Audit_2026-07-15.md)
