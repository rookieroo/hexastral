#!/bin/bash
# Capture the MODERN (contemporary) home + expanded month for ASC screenshots.
# Month grid only exists in modern mode and only expands on tap. Single-seed
# flow: pre-write onboarding + voice.mode=contemporary + demo birth into the
# AsyncStorage manifest BEFORE the first launch (seedVoiceModeDefault only
# writes when the key is absent, so the pre-seed survives).
#
# Usage: scripts/capture-modern-month.sh <device-name> <size-dir>
#   e.g. scripts/capture-modern-month.sh "iPhone 11 Pro Max" 6.5
# Prereq: Release app built once; ONLY ONE Simulator window open.
set -euo pipefail

DEVICE_NAME="$1"
SIZE_DIR="$2"
APP_PATH="${APP_PATH:-apps/auspice-app/ios/build/Build/Products/Release-iphonesimulator/Yuun.app}"
BUNDLE_ID="com.hexastral.yuun"
OUT_ROOT="${OUT_ROOT:-docs/publish/screenshots/yuun/$SIZE_DIR}"
TAP_JS="${TAP_JS:-/tmp/tap.js}"

if [ ! -f "$TAP_JS" ]; then
  cat > "$TAP_JS" <<'JSEOF'
ObjC.import('CoreGraphics')
ObjC.import('AppKit')
function run(argv) {
  const x = parseFloat(argv[0])
  const y = parseFloat(argv[1])
  const apps = $.NSRunningApplication.runningApplicationsWithBundleIdentifier('com.apple.iphonesimulator')
  if (apps.count > 0) apps.objectAtIndex(0).activateWithOptions($.NSApplicationActivateIgnoringOtherApps)
  $.NSThread.sleepForTimeInterval(0.4)
  const p = $.CGPointMake(x, y)
  const down = $.CGEventCreateMouseEvent($(), $.kCGEventLeftMouseDown, p, $.kCGMouseButtonLeft)
  const up = $.CGEventCreateMouseEvent($(), $.kCGEventLeftMouseUp, p, $.kCGMouseButtonLeft)
  $.CGEventPost($.kCGHIDEventTap, down)
  $.NSThread.sleepForTimeInterval(0.08)
  $.CGEventPost($.kCGHIDEventTap, up)
  return 'clicked ' + x + ',' + y
}
JSEOF
fi

UDID=$(xcrun simctl list devices | grep -F "$DEVICE_NAME" | grep -Eo '[0-9A-F]{8}-[0-9A-F-]{27,}' | head -1)
[ -n "$UDID" ] || { echo "no simulator named $DEVICE_NAME" >&2; exit 1; }
[ -d "$APP_PATH" ] || { echo "Release app not found at $APP_PATH" >&2; exit 1; }

xcrun simctl boot "$UDID" 2>/dev/null || true
xcrun simctl bootstatus "$UDID" -b
xcrun simctl status_bar "$UDID" override \
  --time "9:41" --batteryState charged --batteryLevel 100 --cellularBars 4 --wifiBars 3

SEED='{"auspice.onboarding.seen.v1":"1","auspice.voice.mode":"contemporary","auspice.birthDate":"1992-08-15","auspice.birthInfo":"{\"solarDate\":\"1992-08-15\",\"calendar\":\"solar\",\"timeIndex\":6,\"gender\":\"女\",\"timezone\":\"Asia/Shanghai\"}"}'

declare -a LOCALES=("en:en_US" "zh-Hans:zh_CN" "zh-Hant:zh_TW" "ja:ja_JP")

for pair in "${LOCALES[@]}"; do
  lang="${pair%%:*}"
  region="${pair##*:}"
  dir="$OUT_ROOT/$lang"
  mkdir -p "$dir"

  echo "== modern $lang / $region =="
  xcrun simctl spawn "$UDID" defaults write NSGlobalDomain AppleLanguages -array "$lang"
  xcrun simctl spawn "$UDID" defaults write NSGlobalDomain AppleLocale -string "$region"

  xcrun simctl terminate "$UDID" "$BUNDLE_ID" 2>/dev/null || true
  xcrun simctl uninstall "$UDID" "$BUNDLE_ID" 2>/dev/null || true
  xcrun simctl install "$UDID" "$APP_PATH"

  APPDATA=$(xcrun simctl get_app_container "$UDID" "$BUNDLE_ID" data)
  ASDIR="$APPDATA/Library/Application Support/com.hexastral.yuun/RCTAsyncLocalStorage_V1"
  mkdir -p "$ASDIR"
  printf '%s' "$SEED" > "$ASDIR/manifest.json"

  xcrun simctl launch "$UDID" "$BUNDLE_ID"
  sleep 14
  xcrun simctl io "$UDID" screenshot "$dir/M1-modern-home.png"
  echo "  M1 modern home"

  # Tap the expand chevron (collapsed state sits at ~(0.5, 0.206) of the screen).
  G=$(osascript -e 'tell application "System Events" to tell process "Simulator" to get {position, size} of group 1 of window 1')
  read -r GX GY GW GH <<< "$(python3 -c "
g = '''$G'''.replace('{', '').replace('}', '')
p = [x.strip() for x in g.split(',')]
print(p[0], p[1], p[2], p[3])
")"
  CX=$(python3 -c "print(int($GX + 0.5 * $GW))")
  CY=$(python3 -c "print(int($GY + 0.206 * $GH))")
  osascript -l JavaScript "$TAP_JS" "$CX" "$CY"
  sleep 3
  xcrun simctl io "$UDID" screenshot "$dir/M2-modern-month.png"
  echo "  M2 modern month expanded"
done

echo "done -> $OUT_ROOT (M1/M2)"
