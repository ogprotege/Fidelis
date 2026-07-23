//
//  WidgetSharedSettings.swift
//  A versioned, fail-safe seam for preferences shared by the containing app and
//  the Widget Extension.
//
//  Both committed targets request `group.app.fidelis.bible`. Distribution still
//  requires that group to be registered for both identifiers in Apple Developer
//  and present in their provisioning profiles. If it is unavailable at runtime,
//  `containerURL(...)` is nil. Appearance may use its harmless system default,
//  while calendar-derived widgets and intents fail closed because no default
//  jurisdiction can truthfully stand in for the app's selection. No setting is
//  reported as shared unless the signed targets can actually share it.
//

import Foundation

enum WidgetSharedSettings {
    enum WriteResult {
        case written
        case unavailable
        case invalid
    }

    static let appGroupIdentifier = FidelisWidgetContract.appGroupIdentifier

    private enum Key {
        static let schemaVersion = "widgetSettingsSchemaVersion"
        static let theme = "widgetTheme"
        static let calendarProfile = "widgetCalendarProfile"
        static let legacyCalendarRegion = "widgetCalendarRegion"
        static let translation = "widgetTranslation"
        static let lectionaryPack = "widgetLectionaryPack"
        static let hasIndividualChurchProper = "widgetHasIndividualChurchProper"
        static let localProperFingerprint = "widgetLocalProperFingerprint"
        static let localCalendarOverlay = "widgetLocalCalendarOverlay"
    }

    static var isAvailable: Bool {
        FileManager.default.containerURL(
            forSecurityApplicationGroupIdentifier: appGroupIdentifier
        ) != nil
    }

    private static var defaults: UserDefaults? {
        guard isAvailable else { return nil }
        return UserDefaults(suiteName: appGroupIdentifier)
    }

    static var theme: FidelisWidgetTheme {
        guard
            let raw = defaults?.string(forKey: Key.theme),
            let theme = FidelisWidgetTheme(rawValue: raw)
        else {
            return .system
        }
        return theme
    }

    /// The modern calendar profile selected by the app. Legacy region values
    /// are normalized at the read boundary. An unknown stored value is returned
    /// unchanged so the calendar decoder fails closed instead of silently
    /// substituting a plausible jurisdiction.
    static var calendarProfileIdentifier: String? {
        guard let defaults else { return nil }
        let stored = defaults.string(forKey: Key.calendarProfile)
            ?? defaults.string(forKey: Key.legacyCalendarRegion)
        guard let stored else { return nil }
        return FidelisCalendarProfile.normalized(stored)?.rawValue ?? stored
    }

    static var lectionaryPackIdentifier: String {
        defaults?.string(forKey: Key.lectionaryPack)
            ?? FidelisWidgetContract.derivedRomanLectionary
    }

    static var hasIndividualChurchProper: Bool {
        defaults?.bool(forKey: Key.hasIndividualChurchProper) ?? false
    }

    static var localProperFingerprint: String? {
        defaults?.string(forKey: Key.localProperFingerprint)
    }

    static var localCalendarOverlayData: Data? {
        guard let raw = defaults?.string(forKey: Key.localCalendarOverlay) else { return nil }
        return raw.data(using: .utf8)
    }

    /// Store the app's current preferences only when the signed targets have a
    /// real shared container. Legacy region names are accepted only at this
    /// migration boundary and are always persisted as a modern profile ID.
    @discardableResult
    static func write(
        theme: String,
        calendarProfile: String,
        translation: String,
        lectionaryPackId: String,
        hasIndividualChurchProper: Bool,
        localProperFingerprint: String,
        localCalendarOverlayJSON: String?
    ) -> WriteResult {
        guard let normalized = FidelisWidgetSettingsContract.normalize(
            theme: theme,
            calendarProfile: calendarProfile,
            translation: translation
        ),
        lectionaryPackId == FidelisWidgetContract.derivedRomanLectionary,
        !localProperFingerprint.isEmpty,
        localProperFingerprint.count <= 256
        else {
            return .invalid
        }
        guard let defaults else { return .unavailable }

        defaults.set(3, forKey: Key.schemaVersion)
        defaults.set(normalized.theme.rawValue, forKey: Key.theme)
        defaults.set(normalized.calendarProfile.rawValue, forKey: Key.calendarProfile)
        defaults.removeObject(forKey: Key.legacyCalendarRegion)
        defaults.set(normalized.translation, forKey: Key.translation)
        defaults.set(lectionaryPackId, forKey: Key.lectionaryPack)
        defaults.set(hasIndividualChurchProper, forKey: Key.hasIndividualChurchProper)
        defaults.set(localProperFingerprint, forKey: Key.localProperFingerprint)
        if let localCalendarOverlayJSON {
            defaults.set(localCalendarOverlayJSON, forKey: Key.localCalendarOverlay)
        } else {
            defaults.removeObject(forKey: Key.localCalendarOverlay)
        }
        return .written
    }
}
