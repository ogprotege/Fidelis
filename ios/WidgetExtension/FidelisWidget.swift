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

    private let parchment = Color(red: 0.965, green: 0.937, blue: 0.882)
    private let ink = Color(red: 0.17, green: 0.13, blue: 0.09)
    private let cardinal = Color(red: 0.54, green: 0.12, blue: 0.18)
    private let gold = Color(red: 0.66, green: 0.52, blue: 0.17)

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
                .foregroundColor(cardinal)
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
        FidelisWidget()
    }
}
