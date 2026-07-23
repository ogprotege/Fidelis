//
//  TodaysGospelIntent.swift
//  An App Intent (Siri / Shortcuts) — "What's today's Gospel?" — that speaks or
//  prints the day's Mass Gospel citation without opening the app.
//
//  It reads the SAME versioned, multi-profile calendar.json the home-screen
//  widgets read (emitted by scripts/build-calendar-widget.ts from the web app's
//  own resolveReadings()/liturgicalDay()). The shared validator selects the
//  app's current calendar profile, verifies schema/provenance/expiry, and then
//  resolves the local Gregorian date. No engine is ported. See IOS.md §5.
//
//  AppIntents is iOS 16+, while the App target deploys to iOS 15, so everything
//  here is gated behind @available(iOS 16.0, *). On iOS 15 the shortcut is simply
//  not offered.
//

import AppIntents
import Foundation

private func loadGospelForIntent(at date: Date) -> FidelisGospelSelection? {
    guard
        WidgetSharedSettings.isAvailable,
        let url = Bundle.main.url(forResource: "calendar", withExtension: "json"),
        let data = try? Data(contentsOf: url)
    else {
        return nil
    }
    return FidelisGospelResolver.resolve(
        data,
        requestedProfile: WidgetSharedSettings.calendarProfileIdentifier,
        dayKey: intentDayKey(for: date),
        now: date,
        hasIndividualChurchProper: WidgetSharedSettings.hasIndividualChurchProper,
        localProperFingerprint: WidgetSharedSettings.localProperFingerprint,
        lectionaryPackId: WidgetSharedSettings.lectionaryPackIdentifier,
        localOverlayData: WidgetSharedSettings.localCalendarOverlayData
    )
}

/// "yyyy-MM-dd" in the device time zone on the Gregorian calendar — the exact key
/// scripts/build-calendar-widget.ts emits and CalendarWidgets.swift / the Android
/// widgets look up. en_US_POSIX so the format is locale-stable.
private func intentDayKey(for date: Date) -> String {
    let f = DateFormatter()
    f.locale = Locale(identifier: "en_US_POSIX")
    f.calendar = Calendar(identifier: .gregorian)
    f.timeZone = TimeZone.current
    f.dateFormat = "yyyy-MM-dd"
    return f.string(from: date)
}

@available(iOS 16.0, *)
struct TodaysGospelIntent: AppIntent {
    static var title: LocalizedStringResource = "Today's Gospel"
    static var description = IntentDescription("Speaks the citation of today's Mass Gospel reading.")
    // Answer in dialog; never leave the user's current context to open the app.
    static var openAppWhenRun: Bool = false

    func perform() async throws -> some IntentResult & ProvidesDialog {
        guard let gospel = loadGospelForIntent(at: Date()) else {
            return .result(dialog: "Open Fidelis to see today's Gospel.")
        }

        let lead = gospel.occasion.isEmpty ? "" : "\(gospel.occasion): "
        return .result(dialog: "\(lead)Today's Gospel is \(gospel.citation).")
    }
}

@available(iOS 16.0, *)
struct FidelisAppShortcuts: AppShortcutsProvider {
    static var appShortcuts: [AppShortcut] {
        AppShortcut(
            intent: TodaysGospelIntent(),
            phrases: [
                "Today's Gospel in \(.applicationName)",
                "What's today's Gospel in \(.applicationName)",
                "Today's Mass Gospel in \(.applicationName)"
            ],
            shortTitle: "Today's Gospel",
            systemImageName: "book.closed"
        )
    }
}
