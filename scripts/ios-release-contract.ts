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
 * The App Group is enforced again (v1.24.2) — and is now enforceable.
 *
 * Apple's side was always correct, verified 2026-07-31: the App Store Connect
 * API reports APP_GROUPS on `app.fidelis.bible` and
 * `app.fidelis.bible.FidelisWidget`, and decoding the Xcode-managed profiles
 * shows each one granting `group.app.fidelis.bible`.
 *
 * The loss happened in our own pipeline. `scripts/ios-testflight.sh` archives
 * UNSIGNED — the way past a device-less account being unable to mint a
 * development profile at archive time — so the archived binary carried no
 * entitlement blob, and `xcodebuild -exportArchive` re-signs from what the
 * archive declares. An archive that declares nothing yields a binary that
 * claims nothing: the App Group both profiles freely granted was never asked
 * for. A capability can be granted and still go unclaimed.
 *
 * v1.24.1 downgraded this to a warning because failing closed blocked shipping
 * while protecting something that had never once worked — no build this
 * pipeline produced carried the group, 293 and 304 included. That was the right
 * call then and the wrong state to stay in: it also meant nothing noticed when
 * v1.24.0 made `WidgetSharedSettings` load-bearing, and the Mass and Quote
 * home-screen widgets went blank on every device.
 *
 * `ios-testflight.sh` step [2b/6] now ad-hoc signs the archive with each
 * target's entitlements before export, so the group survives into the exported
 * IPA — proved against a real export before this was flipped back. A build that
 * loses it again is a build whose widgets cannot read the app's calendar
 * selection, so it fails here instead of shipping.
 */
function assertAppGroup(label: "app" | "widget", target: SignedIosTarget): void {
  const groups = target.entitlements["com.apple.security.application-groups"];
  if (Array.isArray(groups) && groups.some(group => group === REQUIRED_IOS_APP_GROUP)) {
    return;
  }
  throw new Error(
    `${label} entitlements do not contain the exact App Group ${REQUIRED_IOS_APP_GROUP} — the widgets in this build could not read the app's calendar selection (see scripts/ios-testflight.sh step 2b)`
  );
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

/** Throws on any identity drift, and on a signed binary that does not claim the
 *  App Group its widgets need. Returns the (now always empty) warning list so
 *  callers that report warnings keep compiling. */
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
  assertAppGroup("app", contract.app);
  assertAppGroup("widget", contract.widget);
  return [];
}
