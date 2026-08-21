#!/usr/bin/env bash
set -euo pipefail

api_level="${1:?usage: run-android-instrumentation.sh <api-level>}"
gradlew="${GRADLEW_BIN:-./gradlew}"
adb="${ADB_BIN:-adb}"
task="${ANDROID_TEST_TASK:-:app:connectedDebugAndroidTest}"
log_file="$(mktemp "${TMPDIR:-/tmp}/fidelis-android-instrumentation.XXXXXX")"
trap 'rm -f "$log_file"' EXIT

run_tests() {
  : > "$log_file"
  set +e
  "$gradlew" "$task" --no-daemon 2>&1 | tee "$log_file"
  local status="${PIPESTATUS[0]}"
  set -e
  return "$status"
}

if run_tests; then
  exit 0
else
  first_status=$?
fi

# API 24's emulator occasionally leaves ddmlib's package-install transport
# stalled until its four-minute timeout. Retry only that infrastructure
# signature: assertion, compilation, and every other failure remain hard red.
if ! grep -Fq "Failed to install-write all apks" "$log_file"; then
  exit "$first_status"
fi

echo "Android API ${api_level}: APK install transport stalled; reconnecting ADB and retrying once."
"$adb" reconnect >/dev/null 2>&1 || true
"$adb" wait-for-device
"$adb" shell pm path android >/dev/null

if run_tests; then
  exit 0
else
  retry_status=$?
fi
exit "$retry_status"
