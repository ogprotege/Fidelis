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

echo "==> [1/5] Build web bundle + sync into the iOS shell"
npm run build
npx cap sync ios
# Capacitor 8's CLI rewrites this to .v17 on every sync; our plugins only need
# .v15 and the App target is iOS 15, so revert to keep the tree clean and SPM happy.
git checkout -- ios/App/CapApp-SPM/Package.swift 2>/dev/null || true

echo "==> [2/5] Archive (UNSIGNED --- signing happens at export)"
xcodebuild archive \
  -project "$PROJECT" -scheme "$SCHEME" -configuration Release \
  -destination 'generic/platform=iOS' -archivePath "$ARCHIVE" \
  CURRENT_PROJECT_VERSION="$BUILD_NUMBER" \
  CODE_SIGNING_ALLOWED=NO CODE_SIGNING_REQUIRED=NO CODE_SIGN_IDENTITY="" \
  > "$WORK/archive.log" 2>&1 \
  || { echo "ERROR: archive failed --- last 25 lines:"; tail -25 "$WORK/archive.log"; exit 1; }
echo "    archived"

echo "==> [3/5] Export a distribution-signed .ipa (creates the App Store profile)"
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
xcodebuild -exportArchive \
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

echo "==> [4/5] Upload to App Store Connect / TestFlight"
mkdir -p "$HOME/.appstoreconnect/private_keys"
cp "$ASC_KEY_PATH" "$HOME/.appstoreconnect/private_keys/" 2>/dev/null || true
xcrun altool --upload-app -f "$IPA" -t ios \
  --apiKey "$ASC_KEY_ID" --apiIssuer "$ASC_ISSUER_ID"

echo "==> [5/5] Build $BUILD_NUMBER uploaded. Check processing state with:"
echo "          node scripts/asc-build-status.mjs"
echo ""
echo "Then: App Store Connect -> Fidelis -> TestFlight -> Internal Testing -> add the build."
echo "(Internal testing needs no Apple review.)"
