//
//  CalendarWidgets.swift
//  The "Today at Mass" and "Quote of the Day" home-screen widgets for Fidelis —
//  the iOS counterparts of the Android CalendarWidget / QuoteWidget.
//
//  The committed FidelisWidgetExtension target compiles this file alongside
//  FidelisWidget.swift and bundles calendar.json through
//  scripts/add-ios-widget-target.rb. See docs/guides/IOS.md.
//
//  No engine is ported. scripts/build-calendar-widget.ts pre-resolves the web
//  app's calendar, readings, and quote engines into a versioned multi-profile
//  snapshot. Native code validates its schema, provenance fingerprint, expiry,
//  selected jurisdiction, and requested date before rendering. Any invalid or
//  stale state says exactly "Open Fidelis to update"; it never invents a
//  plausible celebration, reading, or quotation.
//

import Foundation
import SwiftUI
import WidgetKit

private let calendarUpdateMessage = FidelisWidgetContract.updateMessage
private let properReadingsMessage = FidelisWidgetContract.properReadingsMessage

private struct CalendarCacheEntry {
    let requestedProfile: String?
    let lectionaryPack: String
    let hasIndividualChurchProper: Bool
    let localProperFingerprint: String?
    let localOverlayData: Data?
    let calendar: FidelisLoadedCalendar
}

// FID-PERF-004: memoize the selected-profile decode across placeholder,
// snapshot, and timeline calls. The cache key includes shared profile selection,
// so a settings sync plus WidgetCenter reload cannot reuse the old jurisdiction.
private let calendarCacheLock = NSLock()
private var calendarCache: CalendarCacheEntry?

private func loadCalendar() -> FidelisLoadedCalendar? {
    // A missing App Group means the extension cannot know the containing
    // app's selected jurisdiction. Showing the bundled default would look
    // authoritative but could be wrong, so calendar-derived widgets fail
    // closed until the signed targets share their configured container.
    guard WidgetSharedSettings.isAvailable else { return nil }
    let requestedProfile = WidgetSharedSettings.calendarProfileIdentifier
    let lectionaryPack = WidgetSharedSettings.lectionaryPackIdentifier
    guard lectionaryPack == FidelisWidgetContract.derivedRomanLectionary else { return nil }
    let hasIndividualChurchProper = WidgetSharedSettings.hasIndividualChurchProper
    let localProperFingerprint = WidgetSharedSettings.localProperFingerprint
    let localOverlayData = WidgetSharedSettings.localCalendarOverlayData
    calendarCacheLock.lock()
    defer { calendarCacheLock.unlock() }

    if let cached = calendarCache,
       cached.requestedProfile == requestedProfile,
       cached.lectionaryPack == lectionaryPack,
       cached.hasIndividualChurchProper == hasIndividualChurchProper,
       cached.localProperFingerprint == localProperFingerprint,
       cached.localOverlayData == localOverlayData {
        return FidelisCalendarSnapshotValidator.isChronologicallyValid(
            generatedAt: cached.calendar.generatedAt,
            expiresAt: cached.calendar.expiresAt
        ) ? cached.calendar : nil
    }

    guard
        let url = Bundle.main.url(forResource: "calendar", withExtension: "json"),
        let data = try? Data(contentsOf: url),
        !data.isEmpty
    else {
        // Never cache validation failures. Snapshot validity depends on the
        // wall clock, so a corrected manual clock must be able to recover on
        // the next WidgetKit reload without waiting for process termination.
        return nil
    }

    guard
        let baseCalendar = FidelisCalendarSnapshotValidator.decode(
            data,
            requestedProfile: requestedProfile
        )
    else {
        return nil
    }

    let loaded: FidelisLoadedCalendar
    if hasIndividualChurchProper {
        guard
            let localProperFingerprint,
            !localProperFingerprint.isEmpty,
            let overlayData = localOverlayData,
            let overlay = FidelisLocalCalendarOverlayValidator.decode(
                overlayData,
                expectedProfileId: baseCalendar.profile.id,
                expectedBaseFingerprint: baseCalendar.profile.fingerprint,
                expectedLocalFingerprint: localProperFingerprint,
                expectedLectionaryPackId: lectionaryPack,
                expectedLectionaryPackFingerprint: baseCalendar.lectionaryPackFingerprint,
                expectedWindow: baseCalendar.window
            )
        else {
            return nil
        }
        loaded = FidelisLoadedCalendar(
            generatedAt: baseCalendar.generatedAt,
            expiresAt: baseCalendar.expiresAt,
            window: baseCalendar.window,
            exactCatalogWindow: baseCalendar.exactCatalogWindow,
            lectionaryPackFingerprint: baseCalendar.lectionaryPackFingerprint,
            profile: baseCalendar.profile,
            localDays: overlay.days
        )
    } else {
        loaded = baseCalendar
    }

    calendarCache = CalendarCacheEntry(
        requestedProfile: requestedProfile,
        lectionaryPack: lectionaryPack,
        hasIndividualChurchProper: hasIndividualChurchProper,
        localProperFingerprint: localProperFingerprint,
        localOverlayData: localOverlayData,
        calendar: loaded
    )
    return loaded
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

private func calendarDay(for date: Date, in calendar: FidelisLoadedCalendar?) -> CalendarDay? {
    guard let calendar, date < calendar.expiresAt else { return nil }
    let key = dayKey(for: date)
    guard
        key >= calendar.window.from,
        key <= calendar.window.through,
        key >= calendar.exactCatalogWindow.from,
        key <= calendar.exactCatalogWindow.through
    else {
        return nil
    }
    return calendar.localDays[key] ?? calendar.profile.days[key]
}

/// One entry per midnight for the next week, like the VOTD provider — fully
/// offline, refreshed at each local midnight.
private func weekTimelineDates() -> [Date] {
    let cal = Calendar(identifier: .gregorian)
    let startOfToday = cal.startOfDay(for: Date())
    return (0..<7).compactMap { cal.date(byAdding: .day, value: $0, to: startOfToday) }
}

// ── Day + night theme tokens from src/styles.css (same as FidelisWidget.swift).
//    WidgetSharedSettings safely falls back to the system colorScheme until its
//    App Group is provisioned. Decorative --gold remains #A8862C/#D4B254; small
//    running labels use accessible --gold-text #7C621C/#D4B254. Gold honors; no
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
        .accessibilityHidden(true)
    }
}

// ── "Today at Mass" ───────────────────────────────────────────────────────────
struct MassEntry: TimelineEntry {
    let date: Date
    let title: String
    let readings: [ReadingCite]
    let requiresUpdate: Bool
}

private func massEntry(for date: Date, calendar: FidelisLoadedCalendar?) -> MassEntry {
    guard let day = calendarDay(for: date, in: calendar) else {
        return MassEntry(
            date: date,
            title: calendarUpdateMessage,
            readings: [],
            requiresUpdate: true
        )
    }
    guard day.hasAuthoritativeProperReadings else {
        return MassEntry(
            date: date,
            title: properReadingsMessage,
            readings: [],
            requiresUpdate: true
        )
    }
    guard !day.readings.isEmpty else {
        return MassEntry(
            date: date,
            title: calendarUpdateMessage,
            readings: [],
            requiresUpdate: true
        )
    }
    let title = !day.celebration.isEmpty ? day.celebration : day.seasonLabel
    guard !title.isEmpty else {
        return MassEntry(
            date: date,
            title: calendarUpdateMessage,
            readings: [],
            requiresUpdate: true
        )
    }
    return MassEntry(date: date, title: title, readings: day.readings, requiresUpdate: false)
}

struct MassProvider: TimelineProvider {
    func placeholder(in context: Context) -> MassEntry {
        massEntry(for: Date(), calendar: loadCalendar())
    }

    func getSnapshot(in context: Context, completion: @escaping (MassEntry) -> Void) {
        completion(massEntry(for: Date(), calendar: loadCalendar()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<MassEntry>) -> Void) {
        let calendar = loadCalendar()
        let entries = weekTimelineDates().map { massEntry(for: $0, calendar: calendar) }
        completion(Timeline(entries: entries, policy: .atEnd))
    }
}

struct MassWidgetView: View {
    var entry: MassEntry
    @Environment(\.widgetFamily) var family
    @Environment(\.colorScheme) private var scheme
    private var dark: Bool {
        switch WidgetSharedSettings.theme {
        case .system: return scheme == .dark
        case .day: return false
        case .night: return true
        }
    }
    private var kParchment: Color { dark ? Color(red: 0.106, green: 0.106, blue: 0.118) : Color(red: 0.957, green: 0.949, blue: 0.933) }
    private var kInk: Color { dark ? Color(red: 0.925, green: 0.918, blue: 0.894) : Color(red: 0.149, green: 0.141, blue: 0.122) }
    private var kMuted: Color { dark ? Color(red: 0.631, green: 0.616, blue: 0.580) : Color(red: 0.431, green: 0.416, blue: 0.380) }
    private var kGoldMark: Color { dark ? Color(red: 0.831, green: 0.698, blue: 0.329) : Color(red: 0.659, green: 0.525, blue: 0.173) }
    private var kGoldText: Color { dark ? Color(red: 0.831, green: 0.698, blue: 0.329) : Color(red: 0.486, green: 0.384, blue: 0.110) }

    private var maxReadings: Int {
        switch family {
        case .systemSmall: return 2
        case .systemMedium: return 3
        default: return 5
        }
    }

    private var accessibilitySummary: String {
        if entry.requiresUpdate {
            return "Today at Mass. \(entry.title)."
        }
        let citations = entry.readings.prefix(maxReadings).map { reading in
            reading.label.isEmpty ? reading.cite : "\(reading.label), \(reading.cite)"
        }
        let detail = citations.joined(separator: ". ") + "."
        return "Today at Mass. \(entry.title). \(detail)"
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 5) {
            HStack(spacing: 4) {
                CrossIcon(color: kGoldMark)
                Text("TODAY AT MASS")
                    .font(.system(size: 10, weight: .semibold))
                    .tracking(1.2)
                    .foregroundColor(kGoldText)
            }
            if entry.requiresUpdate {
                Spacer(minLength: 0)
                Text(entry.title)
                    .font(.system(.subheadline, design: .serif).weight(.semibold))
                    .foregroundColor(kMuted)
                    .lineLimit(2)
                Spacer(minLength: 0)
            } else {
                Text(entry.title)
                    .font(.system(family == .systemSmall ? .caption : .subheadline, design: .serif).weight(.semibold))
                    .foregroundColor(kInk)
                    .lineLimit(2)
                    .minimumScaleFactor(0.8)
                Spacer(minLength: 0)
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
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(accessibilitySummary)
        .accessibilityHint("Opens Fidelis to today's Mass readings.")
        .accessibilityAddTraits(.isButton)
        // FID-NATIVE-002: the Mass widget opens the Mass readings (spec §9), routed
        // by src/App.tsx from the Capacitor appUrlOpen URL.
        .widgetURL(FidelisWidgetDescriptor.mass.destinationURL)
    }
}

struct MassWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: FidelisWidgetDescriptor.mass.kind, provider: MassProvider()) { entry in
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
    let requiresUpdate: Bool
}

private func quoteEntry(for date: Date, calendar: FidelisLoadedCalendar?) -> QuoteEntry {
    guard
        let quote = calendarDay(for: date, in: calendar)?.quote,
        !quote.text.isEmpty,
        !quote.author.isEmpty
    else {
        return QuoteEntry(
            date: date,
            text: calendarUpdateMessage,
            author: "",
            requiresUpdate: true
        )
    }
    return QuoteEntry(date: date, text: quote.text, author: quote.author, requiresUpdate: false)
}

struct QuoteProvider: TimelineProvider {
    func placeholder(in context: Context) -> QuoteEntry {
        quoteEntry(for: Date(), calendar: loadCalendar())
    }

    func getSnapshot(in context: Context, completion: @escaping (QuoteEntry) -> Void) {
        completion(quoteEntry(for: Date(), calendar: loadCalendar()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<QuoteEntry>) -> Void) {
        let calendar = loadCalendar()
        let entries = weekTimelineDates().map { quoteEntry(for: $0, calendar: calendar) }
        completion(Timeline(entries: entries, policy: .atEnd))
    }
}

struct QuoteWidgetView: View {
    var entry: QuoteEntry
    @Environment(\.widgetFamily) var family
    @Environment(\.colorScheme) private var scheme
    private var dark: Bool {
        switch WidgetSharedSettings.theme {
        case .system: return scheme == .dark
        case .day: return false
        case .night: return true
        }
    }
    private var kParchment: Color { dark ? Color(red: 0.106, green: 0.106, blue: 0.118) : Color(red: 0.957, green: 0.949, blue: 0.933) }
    private var kInk: Color { dark ? Color(red: 0.925, green: 0.918, blue: 0.894) : Color(red: 0.149, green: 0.141, blue: 0.122) }
    private var kMuted: Color { dark ? Color(red: 0.631, green: 0.616, blue: 0.580) : Color(red: 0.431, green: 0.416, blue: 0.380) }
    private var kGoldMark: Color { dark ? Color(red: 0.831, green: 0.698, blue: 0.329) : Color(red: 0.659, green: 0.525, blue: 0.173) }
    private var kGoldText: Color { dark ? Color(red: 0.831, green: 0.698, blue: 0.329) : Color(red: 0.486, green: 0.384, blue: 0.110) }

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(spacing: 4) {
                CrossIcon(color: kGoldMark)
                Text("QUOTE OF THE DAY")
                    .font(.system(size: 10, weight: .semibold))
                    .tracking(1.2)
                    .foregroundColor(kGoldText)
            }
            if entry.requiresUpdate {
                Spacer(minLength: 0)
                Text(calendarUpdateMessage)
                    .font(.system(.subheadline, design: .serif).weight(.semibold))
                    .foregroundColor(kMuted)
                    .lineLimit(2)
                Spacer(minLength: 0)
            } else {
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
        }
        .padding(2)
        .containerBackground(kParchment, for: .widget)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(
            entry.requiresUpdate
                ? "Quote of the Day. \(calendarUpdateMessage)."
                : "Quote of the Day. \(entry.text). \(entry.author)."
        )
        .accessibilityHint("Opens Fidelis at the Quote of the Day.")
        .accessibilityAddTraits(.isButton)
        // FID-NATIVE-002: the Quote card lives on Today; open it there, scrolled
        // to the card.
        .widgetURL(FidelisWidgetDescriptor.quote.destinationURL)
    }
}

struct QuoteWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: FidelisWidgetDescriptor.quote.kind, provider: QuoteProvider()) { entry in
            QuoteWidgetView(entry: entry)
        }
        .configurationDisplayName("Quote of the Day")
        .description("A daily saying from the Fathers, Doctors, and saints.")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
    }
}
