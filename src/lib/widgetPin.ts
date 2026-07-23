import { Capacitor, registerPlugin } from "@capacitor/core";
import type { PluginListenerHandle } from "@capacitor/core";
import type { LocalWidgetCalendarOverlay } from "./widgetCalendarOverlay";

export type WidgetKind = "verse" | "mass" | "quote";
export type WidgetPinReason = "supported" | "android_version" | "launcher_or_profile";
export type WidgetAppearance = "system" | "day" | "night";
export type WidgetCalendarProfile =
  | "roman.general"
  | "roman.us.ascension-sunday"
  | "roman.us.ascension-thursday";

export interface WidgetCounts {
  verse: number;
  mass: number;
  quote: number;
}

export interface WidgetPinStatus {
  supported: boolean;
  reason: WidgetPinReason;
  counts: WidgetCounts;
}

export interface WidgetPinRequestResult {
  /** True means Android opened a pin request. Only pinConfirmed means added. */
  requested: boolean;
  reason: WidgetPinReason;
  token?: string;
}

export interface WidgetPinConfirmation {
  token: string;
  kind: WidgetKind;
  appWidgetId: number;
}

export interface AndroidWidgetSettings {
  calendarProfile: WidgetCalendarProfile | "universal" | "usa";
  appearance: WidgetAppearance;
  lectionaryPackId: "roman.ordinary.derived-citation-table";
  hasIndividualChurchProper: boolean;
  localProperFingerprint: string;
  localCalendarOverlay: LocalWidgetCalendarOverlay | null;
}

export interface AndroidWidgetSettingsResult {
  stored: true;
  calendarProfile: WidgetCalendarProfile;
  appearance: WidgetAppearance;
  lectionaryPackId: "roman.ordinary.derived-citation-table";
}

const WIDGET_TITLES: Record<WidgetKind, string> = {
  verse: "Verse of the Day",
  mass: "Daily Mass",
  quote: "Quote of the Day"
};

/** A successful API call means only that Android opened its confirmation UI. */
export function widgetPinRequestMessage(result: WidgetPinRequestResult): string {
  if (result.requested) {
    return "Android opened its confirmation prompt. The widget is added only after you approve it there.";
  }
  return result.reason === "android_version"
    ? "Your Android version does not support the in-app widget prompt."
    : "This launcher or device profile does not offer the in-app widget prompt.";
}

/** Only the launcher's one-shot positive callback may produce this claim. */
export function widgetPinConfirmationMessage(kind: WidgetKind): string {
  return `${WIDGET_TITLES[kind]} was added to your Home Screen.`;
}

interface WidgetPinNativePlugin {
  getStatus(): Promise<WidgetPinStatus>;
  requestPin(options: { kind: WidgetKind }): Promise<WidgetPinRequestResult>;
  consumePinConfirmation(): Promise<{ confirmation?: WidgetPinConfirmation }>;
  syncSettings(options: AndroidWidgetSettings): Promise<AndroidWidgetSettingsResult>;
  addListener(
    eventName: "pinConfirmed",
    listener: (confirmation: WidgetPinConfirmation) => void
  ): Promise<PluginListenerHandle>;
}

const WidgetPin = registerPlugin<WidgetPinNativePlugin>("WidgetPin");

export function isAndroidWidgetPinning(): boolean {
  return Capacitor.getPlatform() === "android";
}

export function getWidgetPinStatus(): Promise<WidgetPinStatus> {
  return WidgetPin.getStatus();
}

export function requestWidgetPin(kind: WidgetKind): Promise<WidgetPinRequestResult> {
  return WidgetPin.requestPin({ kind });
}

export async function consumeWidgetPinConfirmation(): Promise<WidgetPinConfirmation | null> {
  const result = await WidgetPin.consumePinConfirmation();
  return result.confirmation ?? null;
}

export function addWidgetPinConfirmationListener(
  listener: (confirmation: WidgetPinConfirmation) => void
): Promise<PluginListenerHandle> {
  return WidgetPin.addListener("pinConfirmed", listener);
}

export function syncAndroidWidgetSettings(
  settings: AndroidWidgetSettings
): Promise<AndroidWidgetSettingsResult> {
  return WidgetPin.syncSettings(settings);
}
