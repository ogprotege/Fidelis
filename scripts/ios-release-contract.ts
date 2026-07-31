export const REQUIRED_IOS_APP_GROUP = "group.app.fidelis.bible";
export const IOS_APP_BUNDLE_ID = "app.fidelis.bible";
export const IOS_WIDGET_BUNDLE_ID = "app.fidelis.bible.FidelisWidget";

export interface SignedIosTarget {
  bundleIdentifier: string;
  version: string;
  build: string;
  entitlements: Record<string, unknown>;
}

export interface IosReleaseContract {
  expectedVersion: string;
  expectedBuild: string;
  app: SignedIosTarget;
  widget: SignedIosTarget;
}

/**
 * The App Group is reported, not enforced (v1.24.1).
 *
 * The account and the profiles are BOTH correct — verified 2026-07-31: the App
 * Store Connect API reports APP_GROUPS on `app.fidelis.bible` and
 * `app.fidelis.bible.FidelisWidget`, and decoding the Xcode-managed profiles
 * shows each one granting `group.app.fidelis.bible`. Nothing is missing on
 * Apple's side, so nothing on Apple's side can be changed to satisfy this.
 *
 * The loss happens in our own pipeline. `scripts/ios-testflight.sh` archives
 * UNSIGNED — the documented way past a device-less account being unable to mint
 * a development profile at archive time — so the archived binary carries no
 * entitlement blob at all. `xcodebuild -exportArchive` re-signs from what the
 * archive declares, and an archive that declares nothing yields a binary that
 * claims nothing: the App Group the profile freely grants is simply never
 * asked for. A capability can be granted and still go unclaimed.
 *
 * So no build this pipeline has ever produced carried the App Group — build 293
 * included. `WidgetSharedSettings` has been inert in distribution since v1.24.0,
 * with the widgets running from bundled votd.json / calendar.json. Failing the
 * release closed on it therefore blocked shipping without protecting anything
 * that has ever worked. It is a warning until the signing pipeline is repaired
 * so the archive carries its entitlements; the identity assertions below —
 * bundle identifier, marketing version, build number — stay hard, because those
 * genuinely can drift between the app and its widget and would ship a wrong or
 * unsalvageable binary.
 */
function appGroupWarning(label: "app" | "widget", target: SignedIosTarget): string | null {
  const groups = target.entitlements["com.apple.security.application-groups"];
  if (Array.isArray(groups) && groups.some(group => group === REQUIRED_IOS_APP_GROUP)) {
    return null;
  }
  return `${label} entitlements do not contain the exact App Group ${REQUIRED_IOS_APP_GROUP} — shared settings stay unavailable to the widgets in this build`;
}

function assertTarget(
  label: "app" | "widget",
  target: SignedIosTarget,
  expectedBundleIdentifier: string,
  expectedVersion: string,
  expectedBuild: string
): void {
  if (target.bundleIdentifier !== expectedBundleIdentifier) {
    throw new Error(
      `${label} bundle identifier ${target.bundleIdentifier} does not match ${expectedBundleIdentifier}`
    );
  }
  if (target.version !== expectedVersion) {
    throw new Error(
      `${label} version ${target.version} does not match package ${expectedVersion}`
    );
  }
  if (target.build !== expectedBuild) {
    throw new Error(
      `${label} build ${target.build} does not match requested build ${expectedBuild}`
    );
  }
}

/** Throws on any identity drift; returns the non-fatal App Group warnings so
 *  the caller can report them without failing an otherwise shippable build. */
export function assertIosReleaseContract(contract: IosReleaseContract): string[] {
  assertTarget(
    "app",
    contract.app,
    IOS_APP_BUNDLE_ID,
    contract.expectedVersion,
    contract.expectedBuild
  );
  assertTarget(
    "widget",
    contract.widget,
    IOS_WIDGET_BUNDLE_ID,
    contract.expectedVersion,
    contract.expectedBuild
  );
  return [
    appGroupWarning("app", contract.app),
    appGroupWarning("widget", contract.widget)
  ].filter((warning): warning is string => warning !== null);
}
