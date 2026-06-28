//
//  CalendarWidgets.swift
//  The "Today at Mass" and "Quote of the Day" home-screen widgets for Fidelis —
//  the iOS counterparts of the Android CalendarWidget / QuoteWidget.
//
//  Add this file and calendar.json to the SAME "FidelisWidget" Widget Extension
//  target as FidelisWidget.swift in Xcode (drag in with Target membership:
//  FidelisWidget; calendar.json into Copy Bundle Resources). See docs/IOS.md §5.
//
//  No engine is ported. scripts/build-calendar-widget.ts pre-resolves — from the
//  web app's own resolveReadings() / liturgicalDay() / quoteOfTheDay() — a rolling
//  ~2-year window into calendar.json, an object keyed by local ISO date
//  ("YYYY-MM-DD"). The widget reads the device's local date, looks up that key,
//  and renders it (falling back calmly past the window's end). The date key is
//  built with Calendar(identifier: .gregorian) + TimeZone.current to match the
//  Android GregorianCalendar key exactly, so the two platforms never disagree.
//

import SwiftUI
import WidgetKit

// ── The shape of one day in calendar.json ────────────────────────────────────
struct ReadingCite: Decodable {
    let label: String
    let cite: String
}

struct QuoteItem: Decodable {
    let text: String
    let author: String
}

struct CalendarDay: Decodable {
    let season: String?
    let seasonLabel: String?
    let colorHex: String?
    let celebration: String?
    let readings: [ReadingCite]?
    let quote: QuoteItem?
}

// ── Shared loading + the date key (matches Android + the web app) ─────────────
private func loadCalendar() -> [String: CalendarDay] {
    guard
        let url = Bundle.main.url(forResource: "calendar", withExtension: "json"),
        let data = try? Data(contentsOf: url),
        let map = try? JSONDecoder().decode([String: CalendarDay].self, from: data)
    else {
        return [:]
    }
    return map
}

/// "YYYY-MM-DD" in the device's time zone, on the Gregorian calendar — the exact
/// key scripts/build-calendar-widget.ts emits (isoLocal) and the Android widgets
/// look up (GregorianCalendar). en_US_POSIX so the format is locale-stable.
private func dayKey(for date: Date) -> String {
    let f = DateFormatter()
    f.locale = Locale(identifier: "en_US_POSIX")
    f.calendar = Calendar(identifier: .gregorian)
    f.timeZone = TimeZone.current
    f.dateFormat = "yyyy-MM-dd"
    return f.string(from: date)
}

/// One entry per midnight for the next week, like the VOTD provider — fully
/// offline, refreshed at each local midnight.
private func weekTimelineDates() -> [Date] {
    let cal = Calendar(identifier: .gregorian)
    let startOfToday = cal.startOfDay(for: Date())
    return (0..<7).compactMap { cal.date(byAdding: .day, value: $0, to: startOfToday) }
}

// ── Day + night theme tokens from src/styles.css (same as FidelisWidget.swift),
//    resolved at render time via @Environment(\.colorScheme) so the widgets follow
//    the system appearance like the app — pure SwiftUI, no UIKit / App Group /
//    entitlement. Each widget view below carries the four computed tokens
//    (kParchment/kInk/kMuted/kGold): --bg-0 #F4F2EE/#1B1B1E · --text #26241F/#ECEAE4
//    · --text-muted #6E6A61/#A19D94 · --gold #A8862C/#D4B254. Gold honors; no
//    off-token red, in either appearance. ───────────────────────────────────────

/// The Fidelis cross (spec §1.5) — a single 1.6 stroke on a 24×24 grid, drawn
/// natively so the widget shows the same mark as every web surface, never a
/// system-emoji cross. (File-private; FidelisWidget.swift carries its own copy.)
private struct CrossIcon: View {
    var color: Color
    var size: CGFloat = 11

    var body: some View {
        Path { p in
            let s = size / 24
            p.move(to: CGPoint(x: 12 * s, y: 3 * s))
            p.addLine(to: CGPoint(x: 12 * s, y: 21 * s))
            p.move(to: CGPoint(x: 6.5 * s, y: 8.5 * s))
            p.addLine(to: CGPoint(x: 17.5 * s, y: 8.5 * s))
        }
        .stroke(color, style: StrokeStyle(lineWidth: 1.6 * (size / 24), lineCap: .round, lineJoin: .round))
        .frame(width: size, height: size)
    }
}

// ── "Today at Mass" ───────────────────────────────────────────────────────────
struct MassEntry: TimelineEntry {
    let date: Date
    let title: String
    let readings: [ReadingCite]
}

private func massEntry(for date: Date, days: [String: CalendarDay]) -> MassEntry {
    let d = days[dayKey(for: date)]
    let celeb = d?.celebration ?? ""
    let season = d?.seasonLabel ?? ""
    let title = !celeb.isEmpty ? celeb : (!season.isEmpty ? season : "Today at Mass")
    return MassEntry(date: date, title: title, readings: d?.readings ?? [])
}

struct MassProvider: TimelineProvider {
    func placeholder(in context: Context) -> MassEntry {
        massEntry(for: Date(), days: loadCalendar())
    }

    func getSnapshot(in context: Context, completion: @escaping (MassEntry) -> Void) {
        completion(massEntry(for: Date(), days: loadCalendar()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<MassEntry>) -> Void) {
        let days = loadCalendar()
        let entries = weekTimelineDates().map { massEntry(for: $0, days: days) }
        completion(Timeline(entries: entries, policy: .atEnd))
    }
}

struct MassWidgetView: View {
    var entry: MassEntry
    @Environment(\.widgetFamily) var family
    @Environment(\.colorScheme) private var scheme
    private var dark: Bool { scheme == .dark }
    private var kParchment: Color { dark ? Color(red: 0.106, green: 0.106, blue: 0.118) : Color(red: 0.957, green: 0.949, blue: 0.933) }
    private var kInk: Color { dark ? Color(red: 0.925, green: 0.918, blue: 0.894) : Color(red: 0.149, green: 0.141, blue: 0.122) }
    private var kMuted: Color { dark ? Color(red: 0.631, green: 0.616, blue: 0.580) : Color(red: 0.431, green: 0.416, blue: 0.380) }
    private var kGold: Color { dark ? Color(red: 0.831, green: 0.698, blue: 0.329) : Color(red: 0.659, green: 0.525, blue: 0.173) }

    private var maxReadings: Int {
        switch family {
        case .systemSmall: return 2
        case .systemMedium: return 3
        default: return 5
        }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 5) {
            HStack(spacing: 4) {
                CrossIcon(color: kGold)
                Text("TODAY AT MASS")
                    .font(.system(size: 10, weight: .semibold))
                    .tracking(1.2)
                    .foregroundColor(kGold)
            }
            Text(entry.title)
                .font(.system(family == .systemSmall ? .caption : .subheadline, design: .serif).weight(.semibold))
                .foregroundColor(kInk)
                .lineLimit(2)
                .minimumScaleFactor(0.8)
            Spacer(minLength: 0)
            if entry.readings.isEmpty {
                Text("Open Fidelis for today's readings.")
                    .font(.system(.caption2, design: .serif))
                    .foregroundColor(kMuted)
                    .lineLimit(2)
            } else {
                VStack(alignment: .leading, spacing: 3) {
                    ForEach(Array(entry.readings.prefix(maxReadings).enumerated()), id: \.offset) { _, r in
                        VStack(alignment: .leading, spacing: 0) {
                            if !r.label.isEmpty {
                                Text(r.label.uppercased())
                                    .font(.system(size: 8, weight: .semibold))
                                    .tracking(0.8)
                                    .foregroundColor(kMuted)
                            }
                            Text(r.cite)
                                .font(.system(.caption2, design: .serif))
                                .foregroundColor(kInk)
                                .lineLimit(1)
                                .minimumScaleFactor(0.7)
                        }
                    }
                }
            }
        }
        .padding(2)
        .containerBackground(kParchment, for: .widget)
    }
}

struct MassWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "FidelisMassWidget", provider: MassProvider()) { entry in
            MassWidgetView(entry: entry)
        }
        .configurationDisplayName("Today at Mass")
        .description("The day's liturgical celebration and the Mass reading citations.")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
    }
}

// ── "Quote of the Day" ─────────────────────────────────────────────────────────
struct QuoteEntry: TimelineEntry {
    let date: Date
    let text: String
    let author: String
}

private func quoteEntry(for date: Date, days: [String: CalendarDay]) -> QuoteEntry {
    let q = days[dayKey(for: date)]?.quote
    return QuoteEntry(
        date: date,
        text: q?.text ?? "Be still, and see that I am God.",
        author: q?.author ?? "Psalm 45:11"
    )
}

struct QuoteProvider: TimelineProvider {
    func placeholder(in context: Context) -> QuoteEntry {
        quoteEntry(for: Date(), days: loadCalendar())
    }

    func getSnapshot(in context: Context, completion: @escaping (QuoteEntry) -> Void) {
        completion(quoteEntry(for: Date(), days: loadCalendar()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<QuoteEntry>) -> Void) {
        let days = loadCalendar()
        let entries = weekTimelineDates().map { quoteEntry(for: $0, days: days) }
        completion(Timeline(entries: entries, policy: .atEnd))
    }
}

struct QuoteWidgetView: View {
    var entry: QuoteEntry
    @Environment(\.widgetFamily) var family
    @Environment(\.colorScheme) private var scheme
    private var dark: Bool { scheme == .dark }
    private var kParchment: Color { dark ? Color(red: 0.106, green: 0.106, blue: 0.118) : Color(red: 0.957, green: 0.949, blue: 0.933) }
    private var kInk: Color { dark ? Color(red: 0.925, green: 0.918, blue: 0.894) : Color(red: 0.149, green: 0.141, blue: 0.122) }
    private var kMuted: Color { dark ? Color(red: 0.631, green: 0.616, blue: 0.580) : Color(red: 0.431, green: 0.416, blue: 0.380) }
    private var kGold: Color { dark ? Color(red: 0.831, green: 0.698, blue: 0.329) : Color(red: 0.659, green: 0.525, blue: 0.173) }

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(spacing: 4) {
                CrossIcon(color: kGold)
                Text("QUOTE OF THE DAY")
                    .font(.system(size: 10, weight: .semibold))
                    .tracking(1.2)
                    .foregroundColor(kGold)
            }
            Text("\u{201C}\(entry.text)\u{201D}")
                .font(.system(family == .systemSmall ? .caption : .body, design: .serif))
                .italic()
                .foregroundColor(kInk)
                .lineLimit(family == .systemSmall ? 5 : 8)
                .minimumScaleFactor(0.7)
            Spacer(minLength: 0)
            Text(entry.author)
                .font(.system(.caption2, design: .serif).weight(.semibold))
                .foregroundColor(kMuted)
        }
        .padding(2)
        .containerBackground(kParchment, for: .widget)
    }
}

struct QuoteWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "FidelisQuoteWidget", provider: QuoteProvider()) { entry in
            QuoteWidgetView(entry: entry)
        }
        .configurationDisplayName("Quote of the Day")
        .description("A daily saying from the Fathers, Doctors, and saints.")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
    }
}
