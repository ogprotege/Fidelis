/**
 * Read-only iOS WidgetKit configuration status, plus the narrow settings seam
 * backed by the shared App Group when both signed profiles grant it. iOS does
 * not expose a public API for opening the widget gallery
 * or installing a widget, so this bridge deliberately offers neither.
 */
import { Capacitor, registerPlugin } from "@capacitor/core";
import type { CalendarProfileId, LegacyCalendarRegion } from "./calendarProfile";
import type { LocalWidgetCalendarOverlay } from "./widgetCalendarOverlay";

export type IOSWidgetFamily = "small" | "medium" | "large" | "unknown";

export interface IOSWidgetConfiguration {
  kind: string;
  family: IOSWidgetFamily;
}

export interface IOSWidgetStatus {
  /** Fidelis's Widget Extension requires iOS 17 or later. */
  supported: boolean;
  /** True only after the App Group capability is present in both signed targets. */
  sharedSettingsAvailable: boolean;
  configurations: IOSWidgetConfiguration[];
}

export interface IOSWidgetSettings {
  theme: "system" | "day" | "night";
  calendarProfile: CalendarProfileId;
  /** @deprecated Accepted only while migrating pre-v1.24 callers. */
  calendarRegion?: LegacyCalendarRegion;
  translation: string;
  lectionaryPackId: "roman.ordinary.derived-citation-table";
  hasIndividualChurchProper: boolean;
  localProperFingerprint: string;
  localCalendarOverlay: LocalWidgetCalendarOverlay | null;
}

interface WidgetStatusPlugin {
  getCurrentConfigurations(): Promise<IOSWidgetStatus>;
  syncSettings(options: IOSWidgetSettings): Promise<{ sharedSettingsAvailable: boolean }>;
}

const WidgetStatus = registerPlugin<WidgetStatusPlugin>("WidgetStatus");

/**
 * Return the configurations WidgetKit currently knows about for Fidelis.
 *
 * A successful empty array means no Fidelis widget is configured. Native bridge
 * failures reject so callers never misreport an unavailable check as "not added".
 * Non-iOS builds return an explicit unsupported result without touching the
 * native plugin, which keeps the shared web bundle safe in Android and browsers.
 */
export async function getIOSWidgetStatus(): Promise<IOSWidgetStatus> {
  if (Capacitor.getPlatform() !== "ios") {
    return {
      supported: false,
      sharedSettingsAvailable: false,
      configurations: []
    };
  }
  return WidgetStatus.getCurrentConfigurations();
}

/**
 * Persist validated app preferences into the requested App Group store.
 *
 * The method resolves with `sharedSettingsAvailable: false` when the signed app
 * and extension do not yet carry the App Group entitlement. That is a safe,
 * intentional fallback: the widgets retain their bundled defaults and the app
 * never claims that a preference crossed the process boundary when it did not.
 */
export async function syncIOSWidgetSettings(
  settings: IOSWidgetSettings
): Promise<{ sharedSettingsAvailable: boolean }> {
  if (Capacitor.getPlatform() !== "ios") return { sharedSettingsAvailable: false };
  return WidgetStatus.syncSettings(settings);
}
