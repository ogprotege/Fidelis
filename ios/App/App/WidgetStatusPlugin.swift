//
//  WidgetStatusPlugin.swift
//  Read-only WidgetKit configuration status for the Capacitor web layer, plus
//  the optional shared-settings seam defined in WidgetSharedSettings.swift.
//
//  WidgetKit exposes no public API to install a widget or open the widget gallery.
//  This plugin intentionally does not manufacture one: placement remains a user
//  action on the Home Screen. It only reports configurations WidgetKit already
//  knows about and writes preferences when a provisioned App Group exists.
//

import Capacitor
import Foundation
import WidgetKit

@objc(WidgetStatusPlugin)
public final class WidgetStatusPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = FidelisWidgetBridgeContract.identifier
    public let jsName = FidelisWidgetBridgeContract.javascriptName
    public let pluginMethods: [CAPPluginMethod] = FidelisWidgetBridgeContract.methodNames.map {
        CAPPluginMethod(name: $0, returnType: CAPPluginReturnPromise)
    }

    @objc func getCurrentConfigurations(_ call: CAPPluginCall) {
        // The API itself dates to iOS 14, but Fidelis's Widget Extension uses
        // containerBackground(for:) and therefore ships only on iOS 17+.
        guard #available(iOS 17.0, *) else {
            call.resolve([
                "supported": false,
                "sharedSettingsAvailable": false,
                "configurations": []
            ])
            return
        }

        WidgetCenter.shared.getCurrentConfigurations { result in
            DispatchQueue.main.async {
                switch result {
                case .success(let widgets):
                    let configurations = widgets
                        .map { widget in
                            [
                                "kind": widget.kind,
                                "family": Self.familyName(widget.family)
                            ]
                        }
                        .sorted {
                            let left = ($0["kind"] ?? "") + ($0["family"] ?? "")
                            let right = ($1["kind"] ?? "") + ($1["family"] ?? "")
                            return left < right
                        }
                    call.resolve([
                        "supported": true,
                        "sharedSettingsAvailable": WidgetSharedSettings.isAvailable,
                        "configurations": configurations
                    ])
                case .failure(let error):
                    // Reject instead of returning an empty array. The web UI can
                    // then say status is unavailable, never the false "not added".
                    call.reject("Could not read the current widget configurations.", nil, error)
                }
            }
        }
    }

    @objc func syncSettings(_ call: CAPPluginCall) {
        guard
            let theme = call.getString("theme"),
            // calendarRegion is a temporary migration alias for pre-v1.24 web
            // bundles. New callers always send the authoritative profile ID.
            let calendarProfile = call.getString("calendarProfile")
                ?? call.getString("calendarRegion"),
            let translation = call.getString("translation"),
            let lectionaryPackId = call.getString("lectionaryPackId"),
            let hasIndividualChurchProper = call.getBool("hasIndividualChurchProper"),
            let localProperFingerprint = call.getString("localProperFingerprint")
        else {
            call.reject("Widget settings are incomplete.")
            return
        }

        let localCalendarOverlayJSON: String?
        if let overlay = call.getObject("localCalendarOverlay") {
            guard
                JSONSerialization.isValidJSONObject(overlay),
                let data = try? JSONSerialization.data(withJSONObject: overlay, options: [.sortedKeys]),
                let encoded = String(data: data, encoding: .utf8)
            else {
                call.reject("The local calendar overlay is invalid.")
                return
            }
            localCalendarOverlayJSON = encoded
        } else {
            localCalendarOverlayJSON = nil
        }

        switch WidgetSharedSettings.write(
            theme: theme,
            calendarProfile: calendarProfile,
            translation: translation,
            lectionaryPackId: lectionaryPackId,
            hasIndividualChurchProper: hasIndividualChurchProper,
            localProperFingerprint: localProperFingerprint,
            localCalendarOverlayJSON: localCalendarOverlayJSON
        ) {
        case .written:
            // A settings write changes presentation, so ask WidgetKit for fresh
            // snapshots. Status reads above never spend the reload budget.
            WidgetCenter.shared.reloadAllTimelines()
            call.resolve(["sharedSettingsAvailable": true])
        case .unavailable:
            call.resolve(["sharedSettingsAvailable": false])
        case .invalid:
            // Invalid input is a caller error, not an unavailable entitlement.
            // Rejecting keeps those two states distinguishable in the web UI.
            call.reject("Widget settings contain an unsupported value.")
        }
    }

    private static func familyName(_ family: WidgetFamily) -> String {
        switch family {
        case .systemSmall: return "small"
        case .systemMedium: return "medium"
        case .systemLarge: return "large"
        default: return "unknown"
        }
    }
}
