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

  const groups = target.entitlements["com.apple.security.application-groups"];
  if (!Array.isArray(groups) || !groups.some(group => group === REQUIRED_IOS_APP_GROUP)) {
    throw new Error(
      `${label} entitlements do not contain the exact App Group ${REQUIRED_IOS_APP_GROUP}`
    );
  }
}

export function assertIosReleaseContract(contract: IosReleaseContract): void {
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
}
