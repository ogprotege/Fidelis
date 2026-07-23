#!/usr/bin/env bash
# Verify, validate, and upload one already-exported Fidelis IPA. Keeping these
# irreversible steps in a small fail-fast pipeline makes their ordering testable.
set -euo pipefail
cd "$(dirname "$0")/.."

VERIFY_ONLY=0
if [ "${1:-}" = "--verify-only" ]; then
  VERIFY_ONLY=1
  shift
fi

[ "$#" -eq 3 ] || {
  echo "usage: ios-testflight-dispatch.sh [--verify-only] <ipa> <version> <build>"
  exit 2
}
IPA="$1"
EXPECTED_VERSION="$2"
BUILD_NUMBER="$3"
NPM_BIN="${NPM_BIN:-npx}"
XCRUN_BIN="${XCRUN_BIN:-xcrun}"

echo "==> [4/6] Verify signed app + widget contracts"
"$NPM_BIN" tsx scripts/verify-ios-export.ts \
  --ipa "$IPA" \
  --expected-version "$EXPECTED_VERSION" \
  --expected-build "$BUILD_NUMBER"

if [ "$VERIFY_ONLY" -eq 1 ]; then
  echo "    verification-only mode: validation and upload skipped"
  exit 0
fi

: "${ASC_KEY_ID:?Set ASC_KEY_ID before dispatch}"
: "${ASC_ISSUER_ID:?Set ASC_ISSUER_ID before dispatch}"
: "${ASC_KEY_PATH:?Set ASC_KEY_PATH before dispatch}"
[ -f "$ASC_KEY_PATH" ] || { echo "ERROR: API key not found at $ASC_KEY_PATH"; exit 1; }
APPSTORE_KEYS_DIR="${APPSTORE_KEYS_DIR:-$HOME/.appstoreconnect/private_keys}"
mkdir -p "$APPSTORE_KEYS_DIR"
APPSTORE_KEY_DEST="$APPSTORE_KEYS_DIR/AuthKey_${ASC_KEY_ID}.p8"
if ! [ "$ASC_KEY_PATH" -ef "$APPSTORE_KEY_DEST" ]; then
  cp "$ASC_KEY_PATH" "$APPSTORE_KEY_DEST"
fi
chmod 600 "$APPSTORE_KEY_DEST"

echo "==> [5/6] Validate the signed IPA with App Store Connect"
"$XCRUN_BIN" altool --validate-app -f "$IPA" -t ios \
  --apiKey "$ASC_KEY_ID" --apiIssuer "$ASC_ISSUER_ID"

echo "==> [6/6] Upload to App Store Connect / TestFlight"
"$XCRUN_BIN" altool --upload-app -f "$IPA" -t ios \
  --apiKey "$ASC_KEY_ID" --apiIssuer "$ASC_ISSUER_ID"
