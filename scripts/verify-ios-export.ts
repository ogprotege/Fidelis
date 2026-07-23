import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  rmSync
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { assertIosReleaseContract } from "./ios-release-contract";
import type {
  IosReleaseContract,
  SignedIosTarget
} from "./ios-release-contract";

interface CliOptions {
  ipa: string;
  expectedVersion: string;
  expectedBuild: string;
}

function parseArgs(args: string[]): CliOptions {
  const values = new Map<string, string>();
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i];
    const value = args[i + 1];
    if (!key?.startsWith("--") || value === undefined) {
      throw new Error(
        "usage: verify-ios-export.ts --ipa <path> --expected-version <version> --expected-build <build>"
      );
    }
    values.set(key, value);
  }

  const ipa = values.get("--ipa");
  const expectedVersion = values.get("--expected-version");
  const expectedBuild = values.get("--expected-build");
  if (!ipa || !expectedVersion || !expectedBuild || values.size !== 3) {
    throw new Error(
      "usage: verify-ios-export.ts --ipa <path> --expected-version <version> --expected-build <build>"
    );
  }
  return { ipa: resolve(ipa), expectedVersion, expectedBuild };
}

function readPlist(path: string): Record<string, unknown> {
  const json = execFileSync(
    "/usr/bin/plutil",
    ["-convert", "json", "-o", "-", path],
    { encoding: "utf8", maxBuffer: 1024 * 1024 }
  );
  const parsed: unknown = JSON.parse(json);
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error(`${path} is not a dictionary plist`);
  }
  return parsed as Record<string, unknown>;
}

function requiredString(
  dictionary: Record<string, unknown>,
  key: string,
  label: string
): string {
  const value = dictionary[key];
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${label} is missing ${key}`);
  }
  return value;
}

function readEntitlements(
  bundlePath: string,
  label: string,
  workDir: string
): Record<string, unknown> {
  const derPath = join(workDir, `${label}.entitlements.der`);
  const xmlPath = join(workDir, `${label}.entitlements.plist`);
  execFileSync(
    "/usr/bin/codesign",
    ["-d", "--entitlements", derPath, "--der", bundlePath],
    { stdio: ["ignore", "ignore", "pipe"] }
  );
  if (!existsSync(derPath)) {
    throw new Error(`signed ${label} has no entitlement blob`);
  }
  execFileSync(
    "/usr/bin/derq",
    ["query", "--xml", "-i", derPath, "-o", xmlPath],
    { stdio: ["ignore", "ignore", "pipe"] }
  );
  return readPlist(xmlPath);
}

function readTarget(
  bundlePath: string,
  label: string,
  workDir: string
): SignedIosTarget {
  const infoPath = join(bundlePath, "Info.plist");
  if (!existsSync(infoPath)) throw new Error(`signed ${label} Info.plist is missing`);
  const info = readPlist(infoPath);
  return {
    bundleIdentifier: requiredString(info, "CFBundleIdentifier", label),
    version: requiredString(info, "CFBundleShortVersionString", label),
    build: requiredString(info, "CFBundleVersion", label),
    entitlements: readEntitlements(bundlePath, label, workDir)
  };
}

function verifyIosExport(options: CliOptions): void {
  if (!existsSync(options.ipa)) throw new Error(`IPA not found: ${options.ipa}`);
  const workDir = mkdtempSync(join(tmpdir(), "fidelis-ios-release-"));
  try {
    execFileSync("/usr/bin/ditto", ["-x", "-k", options.ipa, workDir], {
      stdio: ["ignore", "ignore", "pipe"]
    });
    const appPath = join(workDir, "Payload", "App.app");
    const widgetPath = join(
      appPath,
      "PlugIns",
      "FidelisWidgetExtension.appex"
    );
    if (!existsSync(appPath)) throw new Error("signed app bundle is missing from the IPA");
    if (!existsSync(widgetPath)) {
      throw new Error("signed widget extension is missing from the IPA");
    }

    const contract: IosReleaseContract = {
      expectedVersion: options.expectedVersion,
      expectedBuild: options.expectedBuild,
      app: readTarget(appPath, "app", workDir),
      widget: readTarget(widgetPath, "widget", workDir)
    };
    assertIosReleaseContract(contract);
  } finally {
    rmSync(workDir, { recursive: true, force: true });
  }
}

function main(): void {
  try {
    const options = parseArgs(process.argv.slice(2));
    verifyIosExport(options);
    console.log(
      `verified signed iOS app + widget ${options.expectedVersion} (${options.expectedBuild})`
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`ERROR: ${message}`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main();
}
