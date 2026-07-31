#!/usr/bin/env bash
#
# Ship Fidelis to TestFlight / App Store Connect from the command line --- the
# whole archive -> sign -> upload pipeline, no Xcode GUI.
#
# WHY THIS EXISTS (the non-obvious part). A brand-new Apple Developer account has
# no registered devices, and Xcode's *automatic* signing insists on minting a
# DEVELOPMENT provisioning profile at archive time --- which requires a device.
# Forcing "Apple Distribution" with automatic style instead throws "conflicting
# provisioning settings". The way through, used below: archive the code UNSIGNED,
# then do the real DISTRIBUTION signing at the *export* step, where an App Store
# provisioning profile (which needs zero devices) is created on the fly via the
# App Store Connect API key.
#
# The one thing that costs (step [2b/6]): export re-signs from what the ARCHIVE
# declares, and an unsigned archive declares no entitlements, so the App Group
# was silently dropped from every build until v1.24.2. The archive is now ad-hoc
# signed with each target's entitlements before export, and step [4/6] refuses
# to ship a binary that lost them.
#
# CREDENTIALS ARE NOT COMMITTED. Copy scripts/ios-release.local.env.example to
# scripts/ios-release.local.env (gitignored) and fill in your API-key details.
# Generate the key at: App Store Connect -> Users and Access -> Integrations.
#
# Usage:  bash scripts/ios-testflight.sh
#
set -euo pipefail
cd "$(dirname "$0")/.."

# ---- credentials (from the gitignored local env, or the environment) --------
ENV_FILE="scripts/ios-release.local.env"
if [ -f "$ENV_FILE" ]; then set -a; . "$ENV_FILE"; set +a; fi
: "${TEAM_ID:?Set TEAM_ID (10-char Apple Developer Team ID) in $ENV_FILE}"
: "${ASC_KEY_ID:?Set ASC_KEY_ID (App Store Connect API Key ID) in $ENV_FILE}"
: "${ASC_ISSUER_ID:?Set ASC_ISSUER_ID (App Store Connect Issuer ID) in $ENV_FILE}"
: "${ASC_KEY_PATH:?Set ASC_KEY_PATH (path to your AuthKey_XXXX.p8) in $ENV_FILE}"
[ -f "$ASC_KEY_PATH" ] || { echo "ERROR: API key not found at $ASC_KEY_PATH"; exit 1; }

PROJECT="ios/App/App.xcodeproj"
SCHEME="App"
WORK="$(mktemp -d)"
ARCHIVE="$WORK/Fidelis.xcarchive"
EXPORT_DIR="$WORK/export"
EXPORT_PLIST="$WORK/ExportOptions.plist"
# Monotonic, unique build number: one per commit. Beats a hand-bumped integer
# (each TestFlight upload must have a CFBundleVersion no prior build used), and
# both Info.plists read $(CURRENT_PROJECT_VERSION), so app + widget stay in lockstep.
BUILD_NUMBER="$(git rev-list --count HEAD)"

echo "==> Fidelis -> TestFlight   (build $BUILD_NUMBER, team $TEAM_ID)"
echo "    work dir: $WORK"

echo "==> [1/6] Build web bundle + sync into the iOS shell"
npm run build
npx cap sync ios
# Capacitor 8's CLI rewrites this to .v17 on every sync; our plugins only need
# .v15 and the App target is iOS 15, so revert to keep the tree clean and SPM happy.
git checkout -- ios/App/CapApp-SPM/Package.swift || {
  echo "ERROR: could not restore the release-pinned Capacitor Package.swift"; exit 1;
}
grep -Fq 'platforms: [.iOS(.v15)]' ios/App/CapApp-SPM/Package.swift || {
  echo "ERROR: Capacitor Package.swift no longer preserves the iOS 15 app floor"; exit 1;
}

echo "==> [2/6] Archive (UNSIGNED --- signing happens at export)"
xcodebuild archive \
  -project "$PROJECT" -scheme "$SCHEME" -configuration Release \
  -destination 'generic/platform=iOS' -archivePath "$ARCHIVE" \
  CURRENT_PROJECT_VERSION="$BUILD_NUMBER" \
  CODE_SIGNING_ALLOWED=NO CODE_SIGNING_REQUIRED=NO CODE_SIGN_IDENTITY="" \
  > "$WORK/archive.log" 2>&1 \
  || { echo "ERROR: archive failed --- last 25 lines:"; tail -25 "$WORK/archive.log"; exit 1; }
echo "    archived"

# ---- make the archive DECLARE its entitlements (v1.24.2) --------------------
# Entitlements are written into a binary by the *signing* step, from each
# target's CODE_SIGN_ENTITLEMENTS file. The unsigned archive above skips that
# step, so it declares nothing --- and `-exportArchive` re-signs from what the
# archive declares. An archive that declares nothing yields a binary that claims
# nothing. That is how `group.app.fidelis.bible` could be registered on both App
# IDs, and granted by both provisioning profiles, and still never reach a
# device: no build this pipeline produced had ever asked for it (293 and 304
# included). WidgetSharedSettings was therefore inert in every shipped build,
# and from v1.24.0 that silently emptied the Mass and Quote home-screen widgets.
#
# Ad-hoc signing ("--sign -") embeds the entitlement blob without needing a
# provisioning profile, so the original reason this step stays unsigned --- a
# device-less account cannot mint a DEVELOPMENT profile at archive time --- is
# left intact. Manual signing was tried first and is not an option: an iOS
# device build rejects an empty PROVISIONING_PROFILE_SPECIFIER outright, under
# CODE_SIGNING_REQUIRED both YES and NO.
#
# Nested code must be signed before its container. The export below then
# re-signs everything with the real App Store distribution profile, which grants
# the group, and step [4/6] fails the release if the group did not survive.
echo "==> [2b/6] Declare entitlements in the archive (ad-hoc, no profile needed)"
ARCHIVED_APP="$ARCHIVE/Products/Applications/App.app"
ARCHIVED_APPEX="$(ls -d "$ARCHIVED_APP"/PlugIns/*.appex 2>/dev/null | head -1)"
[ -n "$ARCHIVED_APPEX" ] || { echo "ERROR: no widget extension in the archive"; exit 1; }
codesign --force --sign - --generate-entitlement-der \
  --entitlements ios/WidgetExtension/WidgetExtension.entitlements "$ARCHIVED_APPEX" \
  || { echo "ERROR: could not declare the widget's entitlements"; exit 1; }
codesign --force --sign - --generate-entitlement-der \
  --entitlements ios/App/App/App.entitlements "$ARCHIVED_APP" \
  || { echo "ERROR: could not declare the app's entitlements"; exit 1; }
echo "    declared App.app + $(basename "$ARCHIVED_APPEX")"

echo "==> [3/6] Export a distribution-signed .ipa (creates the App Store profile)"
cat > "$EXPORT_PLIST" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>method</key><string>app-store-connect</string>
  <key>teamID</key><string>$TEAM_ID</string>
  <key>signingStyle</key><string>automatic</string>
  <key>destination</key><string>export</string>
  <key>uploadSymbols</key><true/>
</dict>
</plist>
PLIST
# PATH is sanitized to the system dirs for this one step: Xcode's create-IPA
# copy runs Apple's /usr/bin/rsync (openrsync) as the client but resolves the
# server-side rsync through $PATH --- a Homebrew rsync there (samba 3.x) rejects
# Apple's --extended-attributes flag and the export dies with the bare message
# "Copy failed" (rsync "syntax or usage error" in the xcdistributionlogs).
env PATH="/usr/bin:/bin:/usr/sbin:/sbin" xcodebuild -exportArchive \
  -archivePath "$ARCHIVE" -exportPath "$EXPORT_DIR" \
  -exportOptionsPlist "$EXPORT_PLIST" -allowProvisioningUpdates \
  -authenticationKeyPath "$ASC_KEY_PATH" \
  -authenticationKeyID "$ASC_KEY_ID" \
  -authenticationKeyIssuerID "$ASC_ISSUER_ID" \
  > "$WORK/export.log" 2>&1 \
  || { echo "ERROR: export failed --- last 25 lines:"; tail -25 "$WORK/export.log"; exit 1; }
IPA="$(ls "$EXPORT_DIR"/*.ipa 2>/dev/null | head -1)"
[ -n "$IPA" ] || { echo "ERROR: no .ipa produced in $EXPORT_DIR"; exit 1; }
echo "    signed: $IPA"

EXPECTED_VERSION="$(node -p "require('./package.json').version")"
# FIDELIS_VERIFY_ONLY=1 archives, exports, and runs every signed-artifact
# assertion, then stops before the two irreversible steps (App Store validation
# and upload). Use it to prove a signing change locally without spending a
# build number.
if [ "${FIDELIS_VERIFY_ONLY:-0}" = "1" ]; then
  bash scripts/ios-testflight-dispatch.sh --verify-only "$IPA" "$EXPECTED_VERSION" "$BUILD_NUMBER"
  echo "==> FIDELIS_VERIFY_ONLY=1 --- verified, not uploaded."
  echo "    ipa: $IPA"
  exit 0
fi
bash scripts/ios-testflight-dispatch.sh "$IPA" "$EXPECTED_VERSION" "$BUILD_NUMBER"

echo "==> Build $BUILD_NUMBER uploaded. Check processing state with:"
echo "          node scripts/asc-build-status.mjs"
echo ""
echo "Then: App Store Connect -> Fidelis -> TestFlight -> Internal Testing -> add the build."
echo "(Internal testing needs no Apple review.)"
