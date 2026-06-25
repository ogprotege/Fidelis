//
//  TodaysGospelIntent.swift
//  An App Intent (Siri / Shortcuts) — "What's today's Gospel?" — that speaks or
//  prints the day's Mass Gospel citation without opening the app.
//
//  It reads the SAME pre-resolved calendar.json the home-screen widgets read
//  (emitted by scripts/build-calendar-widget.ts from the web app's own
//  resolveReadings()/liturgicalDay()), keyed by local ISO date on the Gregorian
//  calendar in the device time zone — the exact key the widgets and the Android
//  app look up — so Siri, the widgets, Android, and the web app can never
//  disagree. No engine is ported. See docs/guides/IOS.md §5.
//
//  AppIntents is iOS 16+, while the App target deploys to iOS 15, so everything
//  here is gated behind @available(iOS 16.0, *). On iOS 15 the shortcut is simply
//  not offered.
//

import AppIntents
import Foundation

// ── The slice of one calendar.json day the Intent needs ───────────────────────
private struct IntentReadingCite: Decodable {
    let label: String
    let cite: String
}

private struct IntentCalendarDay: Decodable {
    let celebration: String?
    let seasonLabel: String?
    let readings: [IntentReadingCite]?
}

private func loadCalendarForIntent() -> [String: IntentCalendarDay] {
    guard
        let url = Bundle.main.url(forResource: "calendar", withExtension: "json"),
        let data = try? Data(contentsOf: url),
        let map = try? JSONDecoder().decode([String: IntentCalendarDay].self, from: data)
    else {
        return [:]
    }
    return map
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
        let days = loadCalendarForIntent()
        let day = days[intentDayKey(for: Date())]
        let gospel = day?.readings?.first { $0.label.caseInsensitiveCompare("Gospel") == .orderedSame }

        guard let cite = gospel?.cite, !cite.isEmpty else {
            return .result(dialog: "Open Fidelis to see today's Gospel.")
        }

        let celeb = day?.celebration ?? ""
        let season = day?.seasonLabel ?? ""
        let occasion = !celeb.isEmpty ? celeb : season
        let lead = occasion.isEmpty ? "" : "\(occasion): "
        return .result(dialog: "\(lead)Today's Gospel is \(cite).")
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
