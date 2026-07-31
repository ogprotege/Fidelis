import Foundation
import WebKit
import XCTest
@testable import App

final class WidgetContractsTests: XCTestCase {
    private let now = ISO8601DateFormatter().date(from: "2026-07-23T12:00:00Z")!

    func testLegacyAndModernCalendarProfilesNormalizeExactly() {
        XCTAssertEqual(FidelisCalendarProfile.normalized("universal"), .general)
        XCTAssertEqual(FidelisCalendarProfile.normalized("usa"), .unitedStatesAscensionSunday)
        XCTAssertEqual(
            FidelisCalendarProfile.normalized("roman.us.ascension-thursday"),
            .unitedStatesAscensionThursday
        )
        XCTAssertNil(FidelisCalendarProfile.normalized("roman.unsupported"))
    }

    func testWidgetSettingsValidationSeparatesInvalidInputFromStorageAvailability() {
        XCTAssertEqual(
            FidelisWidgetSettingsContract.normalize(
                theme: "night",
                calendarProfile: "usa",
                translation: "drc"
            ),
            FidelisNormalizedWidgetSettings(
                theme: .night,
                calendarProfile: .unitedStatesAscensionSunday,
                translation: "drc"
            )
        )
        XCTAssertNil(
            FidelisWidgetSettingsContract.normalize(
                theme: "sepia",
                calendarProfile: "roman.general",
                translation: "drc"
            )
        )
        XCTAssertNil(
            FidelisWidgetSettingsContract.normalize(
                theme: "system",
                calendarProfile: "roman.unsupported",
                translation: "drc"
            )
        )
        XCTAssertNil(
            FidelisWidgetSettingsContract.normalize(
                theme: "day",
                calendarProfile: "roman.general",
                translation: "../../private"
            )
        )
    }

    func testWidgetKindsAndDestinationsStayOneToOne() {
        let contracts = FidelisWidgetDescriptor.allCases.map {
            ($0.rawValue, $0.kind, $0.destinationURL.absoluteString)
        }
        XCTAssertEqual(contracts.count, 3)
        XCTAssertEqual(contracts[0].0, "verse")
        XCTAssertEqual(contracts[0].1, "FidelisVotdWidget")
        XCTAssertEqual(contracts[0].2, "fidelis://verse")
        XCTAssertEqual(contracts[1].0, "mass")
        XCTAssertEqual(contracts[1].1, "FidelisMassWidget")
        XCTAssertEqual(contracts[1].2, "fidelis://mass")
        XCTAssertEqual(contracts[2].0, "quote")
        XCTAssertEqual(contracts[2].1, "FidelisQuoteWidget")
        XCTAssertEqual(contracts[2].2, "fidelis://quote")
        XCTAssertEqual(Set(contracts.map(\.1)).count, contracts.count)
        XCTAssertEqual(Set(contracts.map(\.2)).count, contracts.count)
    }

    func testWidgetBridgeExposesOnlyTheRegisteredSurface() {
        let plugin = WidgetStatusPlugin()
        XCTAssertEqual(plugin.identifier, FidelisWidgetBridgeContract.identifier)
        XCTAssertEqual(plugin.jsName, FidelisWidgetBridgeContract.javascriptName)
        XCTAssertEqual(
            plugin.pluginMethods.map(\.name),
            FidelisWidgetBridgeContract.methodNames
        )

        let registered = MainViewController.makeFidelisPlugins()
        XCTAssertEqual(registered.count, 2)
        XCTAssertTrue(registered.contains { $0 is SaveImagePlugin })
        XCTAssertTrue(registered.contains { $0 is WidgetStatusPlugin })
    }

    func testShellBuildsAnExplicitInteractiveEdgeBackGesture() {
        let controller = MainViewController()
        let gesture = MainViewController.makeEdgeBackGesture(
            target: nil,
            action: nil,
            delegate: controller
        )
        XCTAssertEqual(gesture.edges, .left)
        XCTAssertTrue(gesture.delegate === controller)
        XCTAssertFalse(gesture.cancelsTouchesInView)
        XCTAssertEqual(MainViewController.edgeBackEventName, "fidelis-native-edge-back")
        XCTAssertTrue(
            MainViewController.shouldBeginEdgeBack(
                translationX: 0,
                translationY: 0,
                velocityX: 500,
                velocityY: 100
            )
        )
        XCTAssertFalse(
            MainViewController.shouldBeginEdgeBack(
                translationX: 0,
                translationY: 0,
                velocityX: -500,
                velocityY: 0
            )
        )
        XCTAssertFalse(
            MainViewController.shouldBeginEdgeBack(
                translationX: 0,
                translationY: 0,
                velocityX: 100,
                velocityY: 500
            )
        )
        XCTAssertFalse(
            MainViewController.shouldBeginEdgeBack(
                translationX: 0,
                translationY: 0,
                velocityX: 500,
                velocityY: 500
            )
        )
        XCTAssertTrue(
            MainViewController.shouldBeginEdgeBack(
                translationX: 12,
                translationY: 3,
                velocityX: 0,
                velocityY: 0
            )
        )
        XCTAssertTrue(
            controller.gestureRecognizer(
                gesture,
                shouldRecognizeSimultaneouslyWith: UIPanGestureRecognizer()
            )
        )
        XCTAssertFalse(MainViewController.shouldCommitEdgeBack(translationX: 40, velocityX: 100))
        XCTAssertTrue(MainViewController.shouldCommitEdgeBack(translationX: 72, velocityX: 100))
        XCTAssertTrue(MainViewController.shouldCommitEdgeBack(translationX: 20, velocityX: 500))
    }

    func testValidSnapshotSelectsTheRequestedProfile() throws {
        let data = try snapshotData()
        let loaded = try XCTUnwrap(
            FidelisCalendarSnapshotValidator.decode(
                data,
                requestedProfile: "roman.us.ascension-thursday",
                now: now
            )
        )
        XCTAssertEqual(loaded.profile.id, "roman.us.ascension-thursday")
        XCTAssertEqual(loaded.window, FidelisCalendarWindow(from: "2026-01-01", through: "2026-12-31"))
        XCTAssertEqual(loaded.profile.days["2026-07-23"]?.celebration, "St. Bridget")
    }

    // ── v1.24.2: a missing App Group must not blank the calendar widgets ──────
    // v1.24.0 refused to render at all when the extension could not read the
    // app's selected jurisdiction. That entitlement had never shipped, so the
    // refusal was permanent on device. The rule is now per DAY: stand the
    // snapshot's default profile in, and speak only for days on which every
    // supported profile resolves the surface identically.

    func testUnknownJurisdictionSpeaksOnlyForDaysEveryProfileAgreesOn() throws {
        let loaded = try XCTUnwrap(
            FidelisCalendarSnapshotValidator.decode(
                try snapshotData(),
                requestedProfile: nil,
                now: now
            )
        )
        XCTAssertFalse(loaded.jurisdictionIsKnown)
        // Stands in with the snapshot's own default rather than refusing.
        XCTAssertEqual(loaded.profile.id, "roman.us.ascension-sunday")
        // 2026-07-23 resolves a different Gospel per profile — withheld.
        XCTAssertFalse(loaded.speaksFor("2026-07-23", on: .mass))
        // 2026-08-15 is identical across all three — safe to speak for.
        XCTAssertTrue(loaded.speaksFor("2026-08-15", on: .mass))
        // The quote agrees on all three days, so the Quote widget still draws
        // on a day the Mass widget must withhold.
        XCTAssertTrue(loaded.speaksFor("2026-07-23", on: .quote))
        // A day outside the table is never invented.
        XCTAssertFalse(loaded.speaksFor("2026-03-04", on: .mass))
    }

    func testKnownJurisdictionSpeaksForEveryDayInTheWindow() throws {
        let loaded = try XCTUnwrap(
            FidelisCalendarSnapshotValidator.decode(
                try snapshotData(),
                requestedProfile: "roman.general",
                now: now
            )
        )
        XCTAssertTrue(loaded.jurisdictionIsKnown)
        // The profile IS the app's selection, so the unanimity table is moot.
        XCTAssertTrue(loaded.speaksFor("2026-07-23", on: .mass))
        XCTAssertTrue(loaded.speaksFor("2026-03-04", on: .quote))
    }

    func testSnapshotWithoutAUnanimityTableStaysFailClosedButStillDecodes() throws {
        let data = try snapshotData(unanimity: nil)
        // It must still decode — an older snapshot may not carry the table, and
        // refusing to decode would blank a widget that had been working.
        let unknown = try XCTUnwrap(
            FidelisCalendarSnapshotValidator.decode(data, requestedProfile: nil, now: now)
        )
        XCTAssertFalse(unknown.speaksFor("2026-07-23", on: .mass))
        XCTAssertFalse(unknown.speaksFor("2026-08-15", on: .mass))
        XCTAssertFalse(unknown.speaksFor("2026-08-15", on: .quote))
        // With a known jurisdiction the absent table changes nothing at all.
        let known = try XCTUnwrap(
            FidelisCalendarSnapshotValidator.decode(
                data,
                requestedProfile: "roman.general",
                now: now
            )
        )
        XCTAssertTrue(known.speaksFor("2026-07-23", on: .mass))
    }

    func testSiriWithoutAKnownJurisdictionAnswersOnlyUnanimousDays() throws {
        let data = try snapshotData()
        // Divergent day, no jurisdiction: Siri says nothing rather than picking.
        XCTAssertNil(
            FidelisGospelResolver.resolve(
                data,
                requestedProfile: nil,
                dayKey: "2026-07-23",
                now: now
            )
        )
        // Unanimous day: the answer is the same under every profile, so it is
        // safe to speak, and it must be the agreed citation.
        let unanimous = try XCTUnwrap(
            FidelisGospelResolver.resolve(
                data,
                requestedProfile: nil,
                dayKey: "2026-08-15",
                now: now
            )
        )
        XCTAssertEqual(unanimous.citation, "Luke 1:39-56")
        // A known jurisdiction still answers on a divergent day, from its own
        // profile — the general calendar's Gospel, not the default profile's.
        let known = try XCTUnwrap(
            FidelisGospelResolver.resolve(
                data,
                requestedProfile: "roman.general",
                dayKey: "2026-07-23",
                now: now
            )
        )
        XCTAssertEqual(known.citation, "Luke 9:1-6")
    }

    func testBundledSnapshotServesTodayWithoutAnyJurisdiction() throws {
        // The regression the user saw: with no App Group, every calendar widget
        // was empty. The bundled snapshot must be able to answer for today on
        // both surfaces with nothing shared at all.
        let url = try XCTUnwrap(Bundle.main.url(forResource: "calendar", withExtension: "json"))
        let loaded = try XCTUnwrap(
            FidelisCalendarSnapshotValidator.decode(
                try Data(contentsOf: url),
                requestedProfile: nil,
                now: Date()
            )
        )
        XCTAssertFalse(loaded.jurisdictionIsKnown)
        XCTAssertFalse(loaded.unanimousMassDays.isEmpty)
        XCTAssertFalse(loaded.unanimousQuoteDays.isEmpty)
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.timeZone = TimeZone.current
        formatter.dateFormat = "yyyy-MM-dd"
        let today = formatter.string(from: Date())
        XCTAssertTrue(
            loaded.speaksFor(today, on: .mass),
            "the Mass widget cannot speak for \(today) without a jurisdiction"
        )
        XCTAssertNotNil(loaded.profile.days[today])
    }

    func testSnapshotRejectsExpiredOrChronologicallyInvalidEnvelopes() throws {
        XCTAssertTrue(
            FidelisCalendarSnapshotValidator.isChronologicallyValid(
                generatedAt: ISO8601DateFormatter().date(from: "2026-07-23T12:04:00Z")!,
                expiresAt: ISO8601DateFormatter().date(from: "2027-01-01T00:00:00Z")!,
                now: now
            )
        )
        XCTAssertFalse(
            FidelisCalendarSnapshotValidator.isChronologicallyValid(
                generatedAt: ISO8601DateFormatter().date(from: "2026-07-23T12:06:00Z")!,
                expiresAt: ISO8601DateFormatter().date(from: "2027-01-01T00:00:00Z")!,
                now: now
            )
        )
        let acceptedClockSkew = try snapshotData(
            generatedAt: "2026-07-23T12:04:00.000Z"
        )
        XCTAssertNotNil(
            FidelisCalendarSnapshotValidator.decode(
                acceptedClockSkew,
                requestedProfile: "roman.general",
                now: now
            )
        )

        let futureGenerated = try snapshotData(
            generatedAt: "2026-07-23T12:06:00.001Z"
        )
        XCTAssertNil(
            FidelisCalendarSnapshotValidator.decode(
                futureGenerated,
                requestedProfile: "roman.general",
                now: now
            )
        )

        let expired = try snapshotData(expiresAt: "2026-07-23T11:59:59.000Z")
        XCTAssertNil(
            FidelisCalendarSnapshotValidator.decode(
                expired,
                requestedProfile: "roman.general",
                now: now
            )
        )

        let inverted = try snapshotData(
            generatedAt: "2027-01-01T00:00:00.000Z",
            expiresAt: "2026-12-31T00:00:00.000Z"
        )
        XCTAssertNil(
            FidelisCalendarSnapshotValidator.decode(
                inverted,
                requestedProfile: "roman.general",
                now: now
            )
        )
    }

    func testSnapshotRejectsSchemaFingerprintProfileAndDateCorruption() throws {
        XCTAssertNil(
            FidelisCalendarSnapshotValidator.decode(
                try snapshotData(schemaVersion: 2),
                requestedProfile: "roman.general",
                now: now
            )
        )
        XCTAssertNil(
            FidelisCalendarSnapshotValidator.decode(
                try snapshotData(corruptFingerprintFor: "roman.us.ascension-sunday"),
                requestedProfile: "roman.general",
                now: now
            )
        )
        XCTAssertNil(
            FidelisCalendarSnapshotValidator.decode(
                try snapshotData(),
                requestedProfile: "roman.unsupported",
                now: now
            )
        )
        XCTAssertNil(
            FidelisCalendarSnapshotValidator.decode(
                try snapshotData(sourceCheckedAt: "2026-02-30"),
                requestedProfile: "roman.general",
                now: now
            )
        )
        XCTAssertNil(
            FidelisCalendarSnapshotValidator.decode(
                try snapshotData(lectionaryFingerprint: "sha256:corrupt"),
                requestedProfile: "roman.general",
                now: now
            )
        )
        XCTAssertEqual(FidelisWidgetContract.updateMessage, "Open Fidelis to update")
    }

    func testBundledAtomicSnapshotValidatesForEverySupportedProfile() throws {
        let url = try XCTUnwrap(Bundle.main.url(forResource: "calendar", withExtension: "json"))
        let data = try Data(contentsOf: url)
        XCTAssertGreaterThan(data.count, 1_000_000)

        for profile in FidelisCalendarProfile.allCases {
            let loaded = FidelisCalendarSnapshotValidator.decode(
                data,
                requestedProfile: profile.rawValue,
                // The committed artifact records its real generation instant.
                // Synthetic clock-skew cases above remain pinned to `now`.
                now: Date()
            )
            XCTAssertEqual(loaded?.profile.id, profile.rawValue)
            XCTAssertNotNil(loaded?.profile.days["2026-07-23"])
        }
    }

    func testTodaysGospelUsesTheVersionedSelectedProfileAndRejectsTheLegacyShape() throws {
        let data = try snapshotData()
        XCTAssertEqual(
            FidelisGospelResolver.resolve(
                data,
                requestedProfile: "roman.us.ascension-thursday",
                dayKey: "2026-07-23",
                now: now
            ),
            FidelisGospelSelection(
                occasion: "St. Bridget",
                citation: "Matthew 13:10-17"
            )
        )
        XCTAssertEqual(
            FidelisGospelResolver.resolve(
                data,
                requestedProfile: "roman.general",
                dayKey: "2026-07-23",
                now: now
            )?.citation,
            "Luke 9:1-6"
        )
        XCTAssertNil(
            FidelisGospelResolver.resolve(
                try JSONSerialization.data(withJSONObject: [
                    "2026-07-23": [
                        "celebration": "St. Bridget",
                        "readings": [["label": "Gospel", "cite": "Matthew 13:10-17"]]
                    ]
                ]),
                requestedProfile: "roman.general",
                dayKey: "2026-07-23",
                now: now
            )
        )
        XCTAssertNil(
            FidelisGospelResolver.resolve(
                data,
                requestedProfile: "roman.general",
                dayKey: "2026-07-23",
                now: now,
                lectionaryPackId: "roman.unsupported"
            )
        )
    }

    func testGuadalupeMissingProperFailsClosedForWidgetAndSiri() throws {
        let data = try snapshotData()
        let loaded = try XCTUnwrap(
            FidelisCalendarSnapshotValidator.decode(
                data,
                requestedProfile: "roman.us.ascension-sunday",
                now: now
            )
        )
        let guadalupe = try XCTUnwrap(loaded.profile.days["2026-12-12"])
        XCTAssertFalse(guadalupe.hasAuthoritativeProperReadings)
        XCTAssertEqual(
            guadalupe.formularyState?.celebrationId,
            "grc.our-lady-guadalupe"
        )
        XCTAssertNil(
            FidelisGospelResolver.resolve(
                data,
                requestedProfile: "roman.us.ascension-sunday",
                dayKey: "2026-12-12",
                now: now
            )
        )
        XCTAssertEqual(
            FidelisWidgetContract.properReadingsMessage,
            "Open Fidelis for proper readings"
        )
    }

    func testIndividualChurchOverlayMustMatchProfileProperAndLectionary() throws {
        let snapshot = try snapshotData()
        let fingerprint = "local.individual-church@1:fnv1a32:test"
        let overlay = try localOverlayData(
            localFingerprint: fingerprint,
            generatedAt: "2026-07-23T00:00:00.000Z"
        )

        XCTAssertEqual(
            FidelisGospelResolver.resolve(
                snapshot,
                requestedProfile: "roman.general",
                dayKey: "2026-07-23",
                now: now,
                hasIndividualChurchProper: true,
                localProperFingerprint: fingerprint,
                localOverlayData: overlay
            ),
            FidelisGospelSelection(
                occasion: "Dedication of St. Test Church",
                citation: "John 10:22-30"
            )
        )
        XCTAssertNil(
            FidelisGospelResolver.resolve(
                snapshot,
                requestedProfile: "roman.general",
                dayKey: "2026-07-23",
                now: now,
                hasIndividualChurchProper: true,
                localProperFingerprint: "local.individual-church@1:fnv1a32:stale",
                localOverlayData: overlay
            )
        )
        XCTAssertNil(
            FidelisGospelResolver.resolve(
                snapshot,
                requestedProfile: "roman.general",
                dayKey: "2026-07-23",
                now: now,
                hasIndividualChurchProper: true,
                localProperFingerprint: fingerprint,
                localOverlayData: try localOverlayData(
                    localFingerprint: fingerprint,
                    generatedAt: "2026-07-23T00:00:00.000Z",
                    lectionaryFingerprint:
                        "roman.ordinary.derived-citation-table@stale:sha256:stale"
                )
            )
        )
        XCTAssertNil(
            FidelisGospelResolver.resolve(
                snapshot,
                requestedProfile: "roman.general",
                dayKey: "2026-07-23",
                now: now,
                hasIndividualChurchProper: true,
                localProperFingerprint: fingerprint,
                localOverlayData: try localOverlayData(
                    localFingerprint: fingerprint,
                    generatedAt: "2026-07-23T00:00:00.000Z",
                    lectionaryFingerprint: nil
                )
            )
        )
        XCTAssertNil(
            FidelisGospelResolver.resolve(
                snapshot,
                requestedProfile: "roman.general",
                dayKey: "2026-07-23",
                now: now,
                hasIndividualChurchProper: true,
                localProperFingerprint: fingerprint,
                lectionaryPackId: "roman.unsupported",
                localOverlayData: overlay
            )
        )
        XCTAssertNil(
            FidelisGospelResolver.resolve(
                snapshot,
                requestedProfile: "roman.general",
                dayKey: "2026-07-23",
                now: now,
                hasIndividualChurchProper: true,
                localProperFingerprint: fingerprint,
                localOverlayData: try localOverlayData(
                    localFingerprint: fingerprint,
                    generatedAt: "2026-07-23T12:06:00.001Z"
                )
            )
        )
    }

    func testIndividualChurchSelectionFailsClosedWithoutAnOverlay() throws {
        XCTAssertNil(
            FidelisGospelResolver.resolve(
                try snapshotData(),
                requestedProfile: "roman.general",
                dayKey: "2026-07-23",
                now: now,
                hasIndividualChurchProper: true,
                localProperFingerprint: "local.individual-church@1:fnv1a32:test"
            )
        )
    }

    private func snapshotData(
        schemaVersion: Int = FidelisWidgetContract.calendarSchemaVersion,
        generatedAt: String = "2026-07-23T00:00:00.000Z",
        expiresAt: String = "2027-01-01T00:00:00.000Z",
        sourceCheckedAt: String = "2026-07-23",
        corruptFingerprintFor corruptIdentifier: String? = nil,
        lectionaryFingerprint: String = FidelisWidgetContract.derivedRomanLectionaryFingerprint,
        // "2026-07-23" deliberately resolves a DIFFERENT Gospel per profile, so
        // it is jurisdiction-dependent; "2026-08-15" and "2026-12-12" are
        // identical across all three. nil omits the table entirely, standing in
        // for a snapshot built before it existed.
        unanimity: [String: [String]]? = [
            "mass": ["2026-08-15", "2026-12-12"],
            "quote": ["2026-07-23", "2026-08-15", "2026-12-12"]
        ]
    ) throws -> Data {
        var profiles: [String: Any] = [:]
        for profile in FidelisCalendarProfile.allCases {
            let expected = FidelisWidgetContract.expectedProfileFingerprints[profile.rawValue]!
            let gospel = profile == .general
                ? "Luke 9:1-6"
                : profile == .unitedStatesAscensionSunday
                    ? "Mark 6:7-13"
                    : "Matthew 13:10-17"
            profiles[profile.rawValue] = [
                "id": profile.rawValue,
                "label": "Verified \(profile.rawValue)",
                "fingerprint": profile.rawValue == corruptIdentifier ? "sha256:corrupt" : expected,
                "sourceCheckedAt": sourceCheckedAt,
                "days": [
                    "2026-07-23": [
                        "season": "Ordinary Time",
                        "seasonLabel": "Thursday of the Sixteenth Week in Ordinary Time",
                        "colorHex": "#2e7d32",
                        "celebration": "St. Bridget",
                        "readings": [["label": "Gospel", "cite": gospel]],
                        "quote": ["text": "Test quote", "author": "Test author"]
                    ],
                    // Identical under every profile — the unanimous case.
                    "2026-08-15": [
                        "season": "Ordinary Time",
                        "seasonLabel": "The Assumption of the Blessed Virgin Mary",
                        "colorHex": "#ffffff",
                        "celebration": "The Assumption",
                        "readings": [["label": "Gospel", "cite": "Luke 1:39-56"]],
                        "quote": ["text": "Test quote", "author": "Test author"]
                    ],
                    "2026-12-12": [
                        "season": "Advent",
                        "seasonLabel": "Saturday of the Second Week of Advent",
                        "colorHex": "#c9a227",
                        "celebration": "Our Lady of Guadalupe",
                        "readings": [["label": "Gospel", "cite": "Matthew 17:9-13"]],
                        "formularyState": [
                            "kind": "missing-local-formulary",
                            "celebrationId": "grc.our-lady-guadalupe",
                            "celebrationName": "Our Lady of Guadalupe",
                            "formularyId": "grc.our-lady-guadalupe",
                            "calendarPackId": "roman.us.pack",
                            "fallback": "seasonal-readings",
                            "lectionaryPackId": "roman.ordinary.derived-citation-table"
                        ],
                        "quote": ["text": "Test quote", "author": "Test author"]
                    ]
                ]
            ]
        }

        var envelope: [String: Any] = [
            "schemaVersion": schemaVersion,
            "generatedAt": generatedAt,
            "expiresAt": expiresAt,
            "window": ["from": "2026-01-01", "through": "2026-12-31"],
            "exactCatalogWindow": [
                "from": FidelisWidgetContract.exactCatalogFrom,
                "through": FidelisWidgetContract.exactCatalogThrough
            ],
            "lectionaryPack": [
                "id": FidelisWidgetContract.derivedRomanLectionary,
                "version": "tamil-catholic-lectionary-c6c9d79+fidelis-supplement-2026.2",
                "fingerprint": lectionaryFingerprint
            ],
            "defaultProfileId": "roman.us.ascension-sunday",
            "profiles": profiles
        ]
        if let unanimity {
            envelope["unanimity"] = unanimity
        }
        return try JSONSerialization.data(withJSONObject: envelope, options: [.sortedKeys])
    }

    private func localOverlayData(
        localFingerprint: String,
        generatedAt: String,
        lectionaryFingerprint: String? = FidelisWidgetContract.derivedRomanLectionaryFingerprint
    ) throws -> Data {
        let baseFingerprint = FidelisWidgetContract.expectedProfileFingerprints["roman.general"]!
        var overlay: [String: Any] = [
            "schemaVersion": FidelisWidgetContract.localOverlaySchemaVersion,
            "generatedAt": generatedAt,
            "expiresAt": "2027-01-01T00:00:00.000Z",
            "window": ["from": "2026-01-01", "through": "2026-12-31"],
            "exactCatalogWindow": [
                "from": FidelisWidgetContract.exactCatalogFrom,
                "through": FidelisWidgetContract.exactCatalogThrough
            ],
            "baseProfileId": "roman.general",
            "baseProfileFingerprint": baseFingerprint,
            "lectionaryPackId": FidelisWidgetContract.derivedRomanLectionary,
            "localLayer": [
                "id": "local.individual-church",
                "version": "1",
                "fingerprint": localFingerprint,
                "authority": "User-supplied on this device",
                "provenance": "Fidelis constrained individual-church proper schema"
            ],
            "days": [
                "2026-07-23": [
                    "season": "Ordinary Time",
                    "seasonLabel": "Thursday of the Sixteenth Week in Ordinary Time",
                    "colorHex": "#f4f0e8",
                    "celebration": "Dedication of St. Test Church",
                    "readings": [["label": "Gospel", "cite": "John 10:22-30"]]
                ]
            ]
        ]
        if let lectionaryFingerprint {
            overlay["lectionaryPackFingerprint"] = lectionaryFingerprint
        }
        return try JSONSerialization.data(withJSONObject: overlay, options: [.sortedKeys])
    }
}
