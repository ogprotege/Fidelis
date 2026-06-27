//
//  FidelisWidget.swift
//  Verse of the Day home-screen widget for Fidelis.
//
//  Add this file and votd.json to a Widget Extension target in Xcode
//  (File ▸ New ▸ Target ▸ Widget Extension, name it "FidelisWidget",
//  untick "Include Configuration App Intent"). See docs/IOS.md.
//
//  The selection algorithm matches src/lib/votd.ts so the widget and the
//  app always show the same verse: index = (dayOfYear + year) mod count.
//

import SwiftUI
import WidgetKit

struct VotdItem: Decodable {
    let reference: String
    let text: String
}

struct VotdEntry: TimelineEntry {
    let date: Date
    let reference: String
    let text: String
}

private func loadCycle() -> [VotdItem] {
    guard
        let url = Bundle.main.url(forResource: "votd", withExtension: "json"),
        let data = try? Data(contentsOf: url),
        let items = try? JSONDecoder().decode([VotdItem].self, from: data),
        !items.isEmpty
    else {
        return [VotdItem(
            reference: "John 8:12",
            text: "I am the light of the world: he that followeth me, walketh not in darkness, but shall have the light of life."
        )]
    }
    return items
}

private func entry(for date: Date, cycle: [VotdItem]) -> VotdEntry {
    // Pin Gregorian so dayOfYear/year match the web app's JS Date components
    // even when the device calendar is Japanese, Buddhist, etc. The time
    // zone stays the device's current one, as on the web.
    let cal = Calendar(identifier: .gregorian)
    let dayOfYear = cal.ordinality(of: .day, in: .year, for: date) ?? 1
    let year = cal.component(.year, from: date)
    let item = cycle[(dayOfYear + year) % cycle.count]
    return VotdEntry(date: date, reference: item.reference, text: item.text)
}

struct VotdProvider: TimelineProvider {
    func placeholder(in context: Context) -> VotdEntry {
        entry(for: Date(), cycle: loadCycle())
    }

    func getSnapshot(in context: Context, completion: @escaping (VotdEntry) -> Void) {
        completion(entry(for: Date(), cycle: loadCycle()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<VotdEntry>) -> Void) {
        let cycle = loadCycle()
        let cal = Calendar(identifier: .gregorian)
        var entries: [VotdEntry] = []
        // one entry per midnight for the next week
        for offset in 0..<7 {
            if let day = cal.date(byAdding: .day, value: offset, to: cal.startOfDay(for: Date())) {
                entries.append(entry(for: day, cycle: cycle))
            }
        }
        completion(Timeline(entries: entries, policy: .atEnd))
    }
}

/// The Fidelis cross, drawn to match the web app's six-piece icon set
/// (src/components/Icon.tsx, spec §1.5) — a single 1.6 stroke on a 24×24 grid —
/// so the home-screen widget shows the same mark as every web surface instead of
/// a system-emoji cross glyph (which §1.5 set out to retire for rendering
/// inconsistently across platforms).
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

struct FidelisWidgetView: View {
    var entry: VotdEntry
    @Environment(\.widgetFamily) var family
    @Environment(\.colorScheme) private var scheme

    // Day + night theme tokens from src/styles.css, resolved at render time via the
    // colorScheme environment so the widget follows the system appearance like the
    // app (which defaults to System) — pure SwiftUI, no UIKit / App Group / entitlement:
    //   --bg-0 #F4F2EE/#1B1B1E · --text #26241F/#ECEAE4 · --text-muted #6E6A61/#A19D94
    //   · --gold #A8862C/#D4B254. No off-token red — the two-accent grammar (gold
    //   honors) holds on the native surface in both appearances.
    private var dark: Bool { scheme == .dark }
    private var parchment: Color { dark ? Color(red: 0.106, green: 0.106, blue: 0.118) : Color(red: 0.957, green: 0.949, blue: 0.933) }
    private var ink: Color { dark ? Color(red: 0.925, green: 0.918, blue: 0.894) : Color(red: 0.149, green: 0.141, blue: 0.122) }
    private var muted: Color { dark ? Color(red: 0.631, green: 0.616, blue: 0.580) : Color(red: 0.431, green: 0.416, blue: 0.380) }
    private var gold: Color { dark ? Color(red: 0.831, green: 0.698, blue: 0.329) : Color(red: 0.659, green: 0.525, blue: 0.173) }

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(spacing: 4) {
                CrossIcon(color: gold)
                Text("VERSE OF THE DAY")
                    .font(.system(size: 10, weight: .semibold))
                    .tracking(1.2)
                    .foregroundColor(gold)
            }
            Text("“\(entry.text)”")
                .font(.system(family == .systemSmall ? .caption : .body, design: .serif))
                .italic()
                .foregroundColor(ink)
                .lineLimit(family == .systemSmall ? 5 : 8)
                .minimumScaleFactor(0.7)
            Spacer(minLength: 0)
            Text(entry.reference)
                .font(.system(.caption2, design: .serif).weight(.semibold))
                .foregroundColor(muted)
        }
        .padding(2)
        .containerBackground(parchment, for: .widget)
    }
}

struct FidelisWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "FidelisVotdWidget", provider: VotdProvider()) { entry in
            FidelisWidgetView(entry: entry)
        }
        .configurationDisplayName("Verse of the Day")
        .description("The day's verse from the Douay-Rheims Bible — unaltered, every day.")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
    }
}

@main
struct FidelisWidgetBundle: WidgetBundle {
    var body: some Widget {
        FidelisWidget()  // Verse of the Day (this file)
        MassWidget()     // Today at Mass (CalendarWidgets.swift)
        QuoteWidget()    // Quote of the Day (CalendarWidgets.swift)
    }
}
