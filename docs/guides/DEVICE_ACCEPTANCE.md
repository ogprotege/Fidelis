# Device acceptance checklist

*For: the maintainer, running the audit's [§10 native acceptance checklist](../review/Fidelis_Full_Product_Audit_2026-07-15.md) on real hardware.*  · [← Docs index](../INDEX.md)

These are the items that **only physical hardware can prove**. A browser,
simulator, emulator, or static review cannot settle VoiceOver/TalkBack speech,
live Dynamic Type, launcher-specific widget installation, killed-process entry,
midnight/DST/reboot behavior, or signing entitlements. Run them from the
**1.24.0 TestFlight build** and the matching Android build.

**Status for 1.24.0: not completed.** Automated gates may be green, but the code
must not be called store-ready until the results below are recorded for a
physical iPhone and physical Pixel **and** Samsung device. The Android emulator
API 24, 26, 31, and 36 matrix and iOS 17/current iOS 26 builds are additional
gates, not substitutes.

Record OS version, device, build number, result, and evidence for each row. A
finding closes only after both its regression test and this independent runtime
check pass.

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

9. **Widgets — installation truth and families.** For Verse, Mass, and Quote,
   test Small/Medium/Large. Add from the Home Screen, deny/cancel, add again,
   remove, and configure duplicate instances. Open **More ▸ Widgets** after each
   change.
   *Pass:* WidgetKit reports only configurations it actually knows about and
   lists the right families. Fidelis gives manual installation instructions and
   never claims it can open or complete Apple's gallery. Parchment/ink,
   decorative gold, and readable gold labels render without clipping at every
   family, Dynamic Type setting, and appearance.

10. **Widgets — app entry in every lifecycle state.** Tap each widget while the
    app is terminated, suspended, warm on another page, already at the target,
    and showing a live sheet. Repeat with edge-swipe Back.
    *Pass:* Mass focuses Readings; Verse and Quote scroll **and move VoiceOver
    focus** to the matching Today card. A cold launch has no synthetic Back
    entry. A warm launch returns to the prior app page. Same-target taps add no
    duplicate history. Every sheet closes, Back works, and the body never
    remains pinned.

11. **Widgets — rollover and corrupt-data state.** Cross midnight and a DST
    boundary; move the time zone across a date boundary; set the clock manually;
    repeat after force-quit. Exercise all three calendar profiles.
    *Pass:* Verse/Quote/Mass match the app after refresh. An expired, corrupt,
    unknown-profile, or absent date snapshot says **Open Fidelis to update**,
    never a plausible generic feast or quotation.

12. **App Group capability.** Check **More ▸ Widgets** and switch calendar
    profile plus Day/Night/System appearance.
    *Pass when the signed group is unavailable:* the page reports that calendar
    settings cannot be shared, and the Mass and Quote widgets show **Open Fidelis
    to update** instead of a plausible jurisdiction. *Pass after provisioning
    `group.app.fidelis.bible` on both signed targets:* the matching widget changes
    after `WidgetCenter` reload. Record which state the submitted build uses.

13. **Siri — "Today's Gospel."** With the app at its default profile, invoke
    "Today's Gospel."
    *Pass:* the spoken citation matches the Gospel line on the Mass tab verbatim.
    Repeat the supported profile selections and confirm the result never implies
    a verified local proper outside the three-profile catalog.

14. **Airplane-mode offline.** Enable Airplane mode, cold launch, and open the
    Reader in DRB, CPDV, and the Clementine Vulgate, plus a Haydock note and a
    Catena Aurea note.
    *Pass:* all render with no network.

## Android — run on physical Pixel and Samsung devices

1. **Hardware Back drains overlays first.** Open any sheet or the More popover →
   Back dismisses it, not the page. Mash Back twice as fast as possible under a
   sheet → the route behind never navigates or flashes.

2. **Widget add truth.** On API 26+, use **More ▸ Widgets** for Verse, Mass, and
   Quote. Accept, deny/cancel, remove, add again, and add duplicates. Repeat on a
   launcher that does not support pin requests and on API 24/25.
   *Pass:* “prompt requested” appears before approval; “added” appears only after
   the one-shot success callback. Counts match real instances. Unsupported
   launchers and API 24/25 get manual instructions. No unlisted provider can be
   requested.

3. **Widget refresh coordinator.** Cross midnight and DST. Reboot with the app
   never opened. Install an update (`MY_PACKAGE_REPLACED`), change the date and
   clock manually, and change time zone across a date boundary.
   *Pass:* every installed provider refreshes and rearms its daily alarm after
   each event. The app need not be opened after reboot. Mass and Quote show
   **Open Fidelis to update** for expired/corrupt/unknown-profile/missing-day
   data.

4. **Widget entry and Back.** Tap each widget with the process killed,
   suspended, warm elsewhere, already at its target, and under an open sheet.
   Repeat gesture Back and hardware Back.
   *Pass:* destinations and focus are correct; overlays close before navigation;
   cold/warm/same-target history follows the iOS item above; no page remains
   frozen.

5. **TalkBack, scale, and appearance.** Swipe through every provider and picker
   entry at 100% and 200% font scale, Day/Night/System, and every supported size.
   *Pass:* provider labels are distinct, the card has a meaningful content
   description, the focused destination is announced after a tap, all readable
   labels clear contrast, and no text clips.

6. **Airplane-mode + imported text.** Airplane mode, cold launch → the bundled
   corpus reads. Import a translation, enable airplane mode, force-stop, cold
   relaunch → the imported text still renders from IndexedDB with no textless
   window (the v1.18.0 "both are preserved" atomic-import contract).

7. **Safe areas + navigation modes.** In **both** gesture nav and 3-button nav:
   the docked verse-action bar sits above the gesture pill / nav bar and is
   tappable; the sticky top tab row clears the status bar; rotate to landscape
   and confirm the side controls clear the cutout.

---

## Standing release blockers

- **Night cold-launch splash is light-pinned** (iOS item 1 above) — minor; fix is
  a dark-appearance Splash variant + a night-aware native `backgroundColor`.
- **The full matrix above is uncompleted for 1.24.0.** No automated result may
  close it or justify “release-ready.”
- **The App Group entitlement is committed but distribution provisioning is
  unverified.** Both signed profiles must grant the group and the shared-settings
  flow must be retested; otherwise this build must retain and disclose the safe
  fail-closed behavior.

---
[← Docs index](../INDEX.md) · Related: [iOS guide](IOS.md) · [Releasing](RELEASING.md) · [audit §10](../review/Fidelis_Full_Product_Audit_2026-07-15.md)
