//
//  WidgetContracts.swift
//  Pure, shared contracts used by the containing app, Widget Extension, and
//  native regression tests. Keep this file free of UIKit, SwiftUI, WidgetKit,
//  and Capacitor so snapshot validation can run without rendering a widget.
//

import Foundation

enum FidelisWidgetTheme: String, CaseIterable {
    case system
    case day
    case night
}

enum FidelisCalendarProfile: String, CaseIterable {
    case general = "roman.general"
    case unitedStatesAscensionSunday = "roman.us.ascension-sunday"
    case unitedStatesAscensionThursday = "roman.us.ascension-thursday"

    static func normalized(_ value: String) -> FidelisCalendarProfile? {
        switch value {
        case "universal": return .general
        case "usa": return .unitedStatesAscensionSunday
        default: return FidelisCalendarProfile(rawValue: value)
        }
    }
}

struct FidelisNormalizedWidgetSettings: Equatable {
    let theme: FidelisWidgetTheme
    let calendarProfile: FidelisCalendarProfile
    let translation: String
}

enum FidelisWidgetSettingsContract {
    static func normalize(
        theme: String,
        calendarProfile: String,
        translation: String
    ) -> FidelisNormalizedWidgetSettings? {
        guard
            let theme = FidelisWidgetTheme(rawValue: theme),
            let profile = FidelisCalendarProfile.normalized(calendarProfile),
            isSafeIdentifier(translation)
        else {
            return nil
        }
        return FidelisNormalizedWidgetSettings(
            theme: theme,
            calendarProfile: profile,
            translation: translation
        )
    }

    private static func isSafeIdentifier(_ value: String) -> Bool {
        guard !value.isEmpty, value.count <= 64 else { return false }
        let allowed = CharacterSet(charactersIn: "abcdefghijklmnopqrstuvwxyz0123456789-")
        return value.unicodeScalars.allSatisfy(allowed.contains)
    }
}

enum FidelisWidgetDescriptor: String, CaseIterable {
    case verse
    case mass
    case quote

    var kind: String {
        switch self {
        case .verse: return "FidelisVotdWidget"
        case .mass: return "FidelisMassWidget"
        case .quote: return "FidelisQuoteWidget"
        }
    }

    var destinationURL: URL {
        // Every case is a compile-time constant under the app-owned scheme.
        URL(string: "fidelis://\(rawValue)")!
    }
}

enum FidelisWidgetContract {
    static let appGroupIdentifier = "group.app.fidelis.bible"
    static let updateMessage = "Open Fidelis to update"
    static let properReadingsMessage = "Open Fidelis for proper readings"
    static let calendarSchemaVersion = 1
    static let localOverlaySchemaVersion = 1
    static let maximumLocalOverlayDays = 24
    static let exactCatalogFrom = "2024-01-01"
    static let exactCatalogThrough = "2031-12-31"
    static let derivedRomanLectionary = "roman.ordinary.derived-citation-table"
    static let derivedRomanLectionaryFingerprint =
        "roman.ordinary.derived-citation-table@tamil-catholic-lectionary-c6c9d79+fidelis-supplement-2026.1:sha256:6f7cd44d64ab72780aab09b132e24eefa98732f8df1e3d93b3c1e68e82b65973"

    /// Must match src/lib/calendarProfile.ts. A pack change without a matching
    /// native snapshot fails closed rather than presenting another jurisdiction.
    static let expectedProfileFingerprints = [
        "roman.general":
            "roman.general.pack@2026.02:sha256:07cfa5d519b7a345a6bff4d141300486fcb32a777d465ff77ea9367f5e516d4e",
        "roman.us.ascension-sunday":
            "roman.general.pack@2026.02:sha256:07cfa5d519b7a345a6bff4d141300486fcb32a777d465ff77ea9367f5e516d4e+roman.us.pack@2026.1:sha256:15b44bda7b1180ac996bfb8a0704378a9791036a1d387055c8a9477498395ef7+roman.us.ascension-sunday.pack@2026.1:sha256:88299b27261647d01d3e00a3ef11ab3f473f8b75798aed9e0cbf23220511f78d",
        "roman.us.ascension-thursday":
            "roman.general.pack@2026.02:sha256:07cfa5d519b7a345a6bff4d141300486fcb32a777d465ff77ea9367f5e516d4e+roman.us.pack@2026.1:sha256:15b44bda7b1180ac996bfb8a0704378a9791036a1d387055c8a9477498395ef7+roman.us.ascension-thursday.pack@2026.1:sha256:82acb7ea84068f729a5fde6f4d44cbd7c72c300694643dea8fb5d57f4a372382"
    ]
}

enum FidelisWidgetBridgeContract {
    static let identifier = "WidgetStatusPlugin"
    static let javascriptName = "WidgetStatus"
    static let methodNames = ["getCurrentConfigurations", "syncSettings"]
}

struct ReadingCite: Decodable {
    let label: String
    let cite: String
}

struct FidelisReadingOption: Decodable {
    let label: String
    let readings: [ReadingCite]
}

struct QuoteItem: Decodable {
    let text: String
    let author: String
}

struct FidelisMissingFormularyState: Decodable {
    let kind: String
    let celebrationId: String
    let celebrationName: String
    let formularyId: String?
    let calendarPackId: String
    let fallback: String
    let lectionaryPackId: String
}

struct CalendarDay: Decodable {
    let season: String
    let seasonLabel: String
    let colorHex: String
    let celebration: String
    let readings: [ReadingCite]
    let readingOptions: [FidelisReadingOption]?
    let formularyState: FidelisMissingFormularyState?
    let quote: QuoteItem?

    var hasAuthoritativeProperReadings: Bool {
        formularyState == nil
    }
}

struct FidelisCalendarWindow: Decodable, Equatable {
    let from: String
    let through: String
}

private struct FidelisLectionaryPackHeader: Decodable {
    let id: String
    let version: String
    let fingerprint: String
}

private struct CalendarProfileHeader: Decodable {
    let id: String
    let label: String
    let fingerprint: String
    let sourceCheckedAt: String
}

struct FidelisCalendarProfileSnapshot: Decodable {
    let id: String
    let label: String
    let fingerprint: String
    let sourceCheckedAt: String
    let days: [String: CalendarDay]
}

private struct ProfileKey: CodingKey {
    let stringValue: String
    let intValue: Int? = nil

    init?(stringValue: String) {
        self.stringValue = stringValue
    }

    init?(intValue: Int) {
        return nil
    }
}

private let calendarProfileSelectionKey = CodingUserInfoKey(
    rawValue: "app.fidelis.bible.calendarProfileSelection"
)!

/// Decodes headers for every supported profile but materializes the large day
/// table only for the selected profile. That preserves WidgetKit memory while
/// still proving the entire supported-profile catalog and its fingerprints.
private struct CalendarWidgetSnapshot: Decodable {
    let generatedAt: String
    let expiresAt: String
    let window: FidelisCalendarWindow
    let exactCatalogWindow: FidelisCalendarWindow
    let lectionaryPack: FidelisLectionaryPackHeader
    let selectedProfile: FidelisCalendarProfileSnapshot

    private enum CodingKeys: String, CodingKey {
        case schemaVersion
        case generatedAt
        case expiresAt
        case window
        case exactCatalogWindow
        case lectionaryPack
        case defaultProfileId
        case profiles
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        let schemaVersion = try container.decode(Int.self, forKey: .schemaVersion)
        guard schemaVersion == FidelisWidgetContract.calendarSchemaVersion else {
            throw DecodingError.dataCorruptedError(
                forKey: .schemaVersion,
                in: container,
                debugDescription: "Unsupported calendar widget schema"
            )
        }

        generatedAt = try container.decode(String.self, forKey: .generatedAt)
        expiresAt = try container.decode(String.self, forKey: .expiresAt)
        window = try container.decode(FidelisCalendarWindow.self, forKey: .window)
        exactCatalogWindow = try container.decode(
            FidelisCalendarWindow.self,
            forKey: .exactCatalogWindow
        )
        lectionaryPack = try container.decode(
            FidelisLectionaryPackHeader.self,
            forKey: .lectionaryPack
        )
        guard
            lectionaryPack.id == FidelisWidgetContract.derivedRomanLectionary,
            !lectionaryPack.version.isEmpty,
            lectionaryPack.fingerprint == FidelisWidgetContract.derivedRomanLectionaryFingerprint
        else {
            throw DecodingError.dataCorruptedError(
                forKey: .lectionaryPack,
                in: container,
                debugDescription: "Calendar snapshot lectionary provenance does not match"
            )
        }
        let defaultProfileId = try container.decode(String.self, forKey: .defaultProfileId)

        let profiles = try container.nestedContainer(keyedBy: ProfileKey.self, forKey: .profiles)
        for (identifier, fingerprint) in FidelisWidgetContract.expectedProfileFingerprints {
            guard let key = ProfileKey(stringValue: identifier), profiles.contains(key) else {
                throw DecodingError.dataCorruptedError(
                    forKey: .profiles,
                    in: container,
                    debugDescription: "Missing supported calendar profile"
                )
            }
            let header = try profiles.decode(CalendarProfileHeader.self, forKey: key)
            guard
                header.id == identifier,
                header.fingerprint == fingerprint,
                !header.label.isEmpty,
                FidelisCalendarSnapshotValidator.isValidDayKey(header.sourceCheckedAt)
            else {
                throw DecodingError.dataCorruptedError(
                    forKey: key,
                    in: profiles,
                    debugDescription: "Calendar profile provenance does not match"
                )
            }
        }

        guard FidelisWidgetContract.expectedProfileFingerprints[defaultProfileId] != nil else {
            throw DecodingError.dataCorruptedError(
                forKey: .defaultProfileId,
                in: container,
                debugDescription: "Unknown default calendar profile"
            )
        }
        let requestedProfile = decoder.userInfo[calendarProfileSelectionKey] as? String
            ?? defaultProfileId
        guard
            let expectedFingerprint = FidelisWidgetContract.expectedProfileFingerprints[requestedProfile],
            let selectedKey = ProfileKey(stringValue: requestedProfile),
            profiles.contains(selectedKey)
        else {
            throw DecodingError.dataCorruptedError(
                forKey: .profiles,
                in: container,
                debugDescription: "Selected calendar profile is unavailable"
            )
        }

        selectedProfile = try profiles.decode(FidelisCalendarProfileSnapshot.self, forKey: selectedKey)
        guard
            selectedProfile.id == requestedProfile,
            selectedProfile.fingerprint == expectedFingerprint,
            !selectedProfile.label.isEmpty,
            FidelisCalendarSnapshotValidator.isValidDayKey(selectedProfile.sourceCheckedAt)
        else {
            throw DecodingError.dataCorruptedError(
                forKey: selectedKey,
                in: profiles,
                debugDescription: "Selected calendar profile is invalid"
            )
        }
    }
}

struct FidelisLoadedCalendar {
    let generatedAt: Date
    let expiresAt: Date
    let window: FidelisCalendarWindow
    let exactCatalogWindow: FidelisCalendarWindow
    let profile: FidelisCalendarProfileSnapshot
    let localDays: [String: CalendarDay]
}

enum FidelisCalendarSnapshotValidator {
    private static let maximumGeneratedClockSkew: TimeInterval = 5 * 60

    static func decode(
        _ data: Data,
        requestedProfile: String?,
        now: Date = Date()
    ) -> FidelisLoadedCalendar? {
        guard !data.isEmpty else { return nil }

        let decoder = JSONDecoder()
        if let requestedProfile {
            decoder.userInfo[calendarProfileSelectionKey] = requestedProfile
        }
        guard
            let snapshot = try? decoder.decode(CalendarWidgetSnapshot.self, from: data),
            let generatedAt = parseISOInstant(snapshot.generatedAt),
            let expiresAt = parseISOInstant(snapshot.expiresAt),
            isChronologicallyValid(generatedAt: generatedAt, expiresAt: expiresAt, now: now),
            isValidDayKey(snapshot.window.from),
            isValidDayKey(snapshot.window.through),
            snapshot.window.from <= snapshot.window.through,
            snapshot.exactCatalogWindow.from == FidelisWidgetContract.exactCatalogFrom,
            snapshot.exactCatalogWindow.through == FidelisWidgetContract.exactCatalogThrough,
            !snapshot.selectedProfile.days.isEmpty
        else {
            return nil
        }

        return FidelisLoadedCalendar(
            generatedAt: generatedAt,
            expiresAt: expiresAt,
            window: snapshot.window,
            exactCatalogWindow: snapshot.exactCatalogWindow,
            profile: snapshot.selectedProfile,
            localDays: [:]
        )
    }

    static func isChronologicallyValid(
        generatedAt: Date,
        expiresAt: Date,
        now: Date = Date()
    ) -> Bool {
        generatedAt < expiresAt
            && generatedAt.timeIntervalSince(now) <= maximumGeneratedClockSkew
            && now < expiresAt
    }

    static func isValidDayKey(_ value: String) -> Bool {
        guard value.count == 10 else { return false }
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.timeZone = TimeZone(secondsFromGMT: 0)
        formatter.dateFormat = "yyyy-MM-dd"
        formatter.isLenient = false
        guard let date = formatter.date(from: value) else { return false }
        return formatter.string(from: date) == value
    }

    static func parseISOInstant(_ value: String) -> Date? {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter.date(from: value)
    }
}

struct FidelisGospelSelection: Equatable {
    let occasion: String
    let citation: String
}

/**
 * Pure App-Intent boundary over the same validated, profile-selected snapshot
 * used by WidgetKit. Keeping this beside the decoder prevents Siri from
 * silently drifting back to the pre-v1.24 flat calendar.json shape.
 */
enum FidelisGospelResolver {
    static func resolve(
        _ data: Data,
        requestedProfile: String?,
        dayKey: String,
        now: Date = Date(),
        hasIndividualChurchProper: Bool = false,
        localProperFingerprint: String? = nil,
        lectionaryPackId: String = FidelisWidgetContract.derivedRomanLectionary,
        localOverlayData: Data? = nil
    ) -> FidelisGospelSelection? {
        guard
            lectionaryPackId == FidelisWidgetContract.derivedRomanLectionary,
            FidelisCalendarSnapshotValidator.isValidDayKey(dayKey),
            let calendar = FidelisCalendarSnapshotValidator.decode(
                data,
                requestedProfile: requestedProfile,
                now: now
            ),
            calendar.window.from <= dayKey,
            dayKey <= calendar.window.through,
            dayKey >= calendar.exactCatalogWindow.from,
            dayKey <= calendar.exactCatalogWindow.through
        else {
            return nil
        }
        let localDays: [String: CalendarDay]
        if hasIndividualChurchProper {
            guard
                let localProperFingerprint,
                let localOverlayData,
                let overlay = FidelisLocalCalendarOverlayValidator.decode(
                    localOverlayData,
                    expectedProfileId: calendar.profile.id,
                    expectedBaseFingerprint: calendar.profile.fingerprint,
                    expectedLocalFingerprint: localProperFingerprint,
                    expectedLectionaryPackId: lectionaryPackId,
                    expectedWindow: calendar.window,
                    now: now
                )
            else {
                return nil
            }
            localDays = overlay.days
        } else {
            localDays = [:]
        }
        guard
            let day = localDays[dayKey] ?? calendar.profile.days[dayKey],
            day.hasAuthoritativeProperReadings,
            let gospel = day.readings.first(where: {
                $0.label.caseInsensitiveCompare("Gospel") == .orderedSame
            }),
            !gospel.cite.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
        else {
            return nil
        }

        let celebration = day.celebration.trimmingCharacters(in: .whitespacesAndNewlines)
        let season = day.seasonLabel.trimmingCharacters(in: .whitespacesAndNewlines)
        return FidelisGospelSelection(
            occasion: celebration.isEmpty ? season : celebration,
            citation: gospel.cite
        )
    }
}

private struct FidelisLocalCalendarLayer: Decodable {
    let id: String
    let version: String
    let fingerprint: String
    let authority: String
    let provenance: String
}

private struct FidelisLocalCalendarOverlay: Decodable {
    let schemaVersion: Int
    let generatedAt: String
    let expiresAt: String
    let window: FidelisCalendarWindow
    let exactCatalogWindow: FidelisCalendarWindow
    let baseProfileId: String
    let baseProfileFingerprint: String
    let lectionaryPackId: String
    let localLayer: FidelisLocalCalendarLayer
    let days: [String: CalendarDay]
}

struct FidelisLoadedLocalCalendarOverlay {
    let days: [String: CalendarDay]
}

enum FidelisLocalCalendarOverlayValidator {
    static func decode(
        _ data: Data,
        expectedProfileId: String,
        expectedBaseFingerprint: String,
        expectedLocalFingerprint: String,
        expectedLectionaryPackId: String,
        expectedWindow: FidelisCalendarWindow,
        now: Date = Date()
    ) -> FidelisLoadedLocalCalendarOverlay? {
        guard
            let overlay = try? JSONDecoder().decode(FidelisLocalCalendarOverlay.self, from: data),
            overlay.schemaVersion == FidelisWidgetContract.localOverlaySchemaVersion,
            overlay.baseProfileId == expectedProfileId,
            overlay.baseProfileFingerprint == expectedBaseFingerprint,
            overlay.lectionaryPackId == expectedLectionaryPackId,
            overlay.window == expectedWindow,
            overlay.localLayer.id == "local.individual-church",
            overlay.localLayer.version == "1",
            overlay.localLayer.fingerprint == expectedLocalFingerprint,
            !overlay.localLayer.authority.isEmpty,
            !overlay.localLayer.provenance.isEmpty,
            overlay.days.count <= FidelisWidgetContract.maximumLocalOverlayDays,
            let generatedAt = FidelisCalendarSnapshotValidator.parseISOInstant(overlay.generatedAt),
            let expiresAt = FidelisCalendarSnapshotValidator.parseISOInstant(overlay.expiresAt),
            generatedAt < expiresAt,
            generatedAt.timeIntervalSince(now) <= 5 * 60,
            now < expiresAt,
            FidelisCalendarSnapshotValidator.isValidDayKey(overlay.window.from),
            FidelisCalendarSnapshotValidator.isValidDayKey(overlay.window.through),
            overlay.window.from <= overlay.window.through,
            overlay.exactCatalogWindow.from == FidelisWidgetContract.exactCatalogFrom,
            overlay.exactCatalogWindow.through == FidelisWidgetContract.exactCatalogThrough,
            overlay.days.allSatisfy({ key, _ in
                FidelisCalendarSnapshotValidator.isValidDayKey(key)
                    && key >= overlay.window.from
                    && key <= overlay.window.through
            })
        else {
            return nil
        }
        return FidelisLoadedLocalCalendarOverlay(days: overlay.days)
    }
}
