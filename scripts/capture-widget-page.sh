#!/bin/bash
# Capture ONLY shot 02 — springboard page 2 with the three Yuun widget sizes.
# Prereq: page 2 already arranged (small/medium/large) once on this device.
# Usage: scripts/capture-widget-page.sh <device-name> <size-dir> <locale>
# Large-widget variant rule: zh-Hans/zh-Hant -> classical; en/ja -> contemporary.
set -euo pipefail

DEVICE_NAME="$1"; SIZE_DIR="$2"; LOCALE="$3"
APP_PATH="${APP_PATH:-apps/auspice-app/ios/build/Build/Products/Release-iphonesimulator/Yuun.app}"
BUNDLE_ID="com.hexastral.yuun"
OUT_ROOT="${OUT_ROOT:-docs/publish/screenshots/yuun/$SIZE_DIR/$LOCALE/deck}"
case "$LOCALE" in
  zh-Hans|zh-Hant) WIDGET_MODE="classical" ;;
  *) WIDGET_MODE="contemporary" ;;
esac
UDID=$(xcrun simctl list devices | grep -F "$DEVICE_NAME" | grep -Eo '[0-9A-F]{8}-[0-9A-F-]{27,}' | head -1)
[ -n "$UDID" ] || { echo "no simulator named $DEVICE_NAME" >&2; exit 1; }
[ -d "$APP_PATH" ] || { echo "Release app not found at $APP_PATH" >&2; exit 1; }

[ -f /tmp/drag.js ] || cat > /tmp/drag.js <<'JSEOF'
ObjC.import('CoreGraphics')
ObjC.import('AppKit')
function run(argv) {
  const x1 = parseFloat(argv[0]); const y1 = parseFloat(argv[1])
  const x2 = parseFloat(argv[2]); const y2 = parseFloat(argv[3])
  const dur = parseFloat(argv[4] || '0.6')
  const apps = $.NSRunningApplication.runningApplicationsWithBundleIdentifier('com.apple.iphonesimulator')
  if (apps.count > 0) apps.objectAtIndex(0).activateWithOptions($.NSApplicationActivateIgnoringOtherApps)
  $.NSThread.sleepForTimeInterval(0.4)
  const p1 = $.CGPointMake(x1, y1)
  $.CGEventPost($.kCGHIDEventTap, $.CGEventCreateMouseEvent($(), $.kCGEventLeftMouseDown, p1, $.kCGMouseButtonLeft))
  const steps = 12
  for (let i = 1; i <= steps; i++) {
    const t = i / steps
    $.CGEventPost($.kCGHIDEventTap, $.CGEventCreateMouseEvent($(), $.kCGEventLeftMouseDragged, $.CGPointMake(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t), $.kCGMouseButtonLeft))
    $.NSThread.sleepForTimeInterval(dur / steps)
  }
  $.CGEventPost($.kCGHIDEventTap, $.CGEventCreateMouseEvent($(), $.kCGEventLeftMouseUp, $.CGPointMake(x2, y2), $.kCGMouseButtonLeft))
  return 'drag'
}
JSEOF
[ -f /tmp/ocr.js ] || cat > /tmp/ocr.js <<'JSEOF'
ObjC.import('Vision')
ObjC.import('AppKit')
function run(argv) {
  const data = $.NSData.dataWithContentsOfFile(argv[0])
  const nsimg = $.NSImage.alloc.initWithData(data)
  const cg = nsimg.CGImageForProposedRectContextHints($(), $(), $())
  const req = $.VNRecognizeTextRequest.alloc.init
  req.recognitionLevel = $.VNRequestTextRecognitionLevelAccurate
  req.recognitionLanguages = $('zh-Hans', 'zh-Hant', 'en-US', 'ja-JP')
  const handler = $.VNImageRequestHandler.alloc.initWithCGImageOptions(cg, $.NSDictionary.dictionary)
  handler.performRequestsError($.NSArray.arrayWithObject(req), null)
  const out = []
  const results = req.results
  for (let i = 0; i < results.count; i++) {
    out.push(results.objectAtIndex(i).topCandidates(1).objectAtIndex(0).string.js)
  }
  return out.join(' | ')
}
JSEOF

seed_and_sync() {
  # Merge-seed the app's AsyncStorage WITHOUT uninstalling — uninstalling
  # removes the app's home-screen widgets, destroying the operator's arrangement.
  local APPDATA ASDIR
  APPDATA=$(xcrun simctl get_app_container "$UDID" "$BUNDLE_ID" data 2>/dev/null || true)
  if [ -z "$APPDATA" ]; then
    xcrun simctl install "$UDID" "$APP_PATH"
    APPDATA=$(xcrun simctl get_app_container "$UDID" "$BUNDLE_ID" data)
  fi
  ASDIR="$APPDATA/Library/Application Support/com.hexastral.yuun/RCTAsyncLocalStorage_V1"
  mkdir -p "$ASDIR"
  python3 - <<EOF
import json, os
p = "$ASDIR/manifest.json"
d = {}
if os.path.exists(p):
    try: d = json.load(open(p))
    except Exception: d = {}
d.update({
  "auspice.onboarding.seen.v1": "1",
  "auspice.voice.mode": "$1",
  "auspice.birthDate": "1992-08-15",
  "auspice.birthInfo": '{"solarDate":"1992-08-15","calendar":"solar","timeIndex":6,"gender":"女","timezone":"Asia/Shanghai"}',
})
json.dump(d, open(p, "w"), ensure_ascii=False)
EOF
  xcrun simctl terminate "$UDID" "$BUNDLE_ID" 2>/dev/null || true
  xcrun simctl launch "$UDID" "$BUNDLE_ID"
  sleep 8
  xcrun simctl openurl "$UDID" "yuun://display"
  sleep 8
  xcrun simctl terminate "$UDID" "$BUNDLE_ID" 2>/dev/null || true
  sleep 2
}

xcrun simctl boot "$UDID" 2>/dev/null || true
xcrun simctl bootstatus "$UDID" -b
xcrun simctl status_bar "$UDID" override \
  --time "9:41" --batteryState charged --batteryLevel 100 --cellularBars 4 --wifiBars 3
mkdir -p "$OUT_ROOT"

echo "== widget page ($WIDGET_MODE large) =="
seed_and_sync "$WIDGET_MODE"
xcrun simctl shutdown "$UDID" 2>/dev/null || true
sleep 3
xcrun simctl boot "$UDID"
xcrun simctl bootstatus "$UDID" -b >/dev/null 2>&1
sleep 8

# ── navigate to the widgets page (OCR-detect current page, swipe right as needed)
# Layout (current arrangement): [widgets page] [apps page] [App Library];
# post-boot the sim lands on the apps page.
swipe_right() {
  local G NX1 NY1 NX2
  G=$(osascript -e 'tell application "System Events" to tell process "Simulator" to get {position, size} of group 1 of window 1')
  read -r GX GY GW GH <<< "$(python3 -c "
g = '''$G'''.replace('{', '').replace('}', '')
p = [x.strip() for x in g.split(',')]
print(p[0], p[1], p[2], p[3])")"
  NX1=$(python3 -c "print(int($GX + 0.15*$GW))"); NY1=$(python3 -c "print(int($GY + 0.5*$GH))")
  NX2=$(python3 -c "print(int($GX + 0.88*$GW))")
  osascript -l JavaScript /tmp/drag.js "$NX1" "$NY1" "$NX2" "$NY1" 0.8
  sleep 2.5
}
page_probe() {
  xcrun simctl io "$UDID" screenshot /tmp/probe.png >/dev/null 2>&1
  osascript -l JavaScript /tmp/ocr.js /tmp/probe.png 2>/dev/null || true
}
for _ in 1 2 3; do
  TXT=$(page_probe)
  # Widget-page anchor: the large widget's For-you line (locale-neutral markers).
  case "$TXT" in
    *"For you"*|*"对你而言"*|*"對你而言"*|*"あなたへ"*|*"于你"*|*"於你"*) break ;;
    *) swipe_right ;;
  esac
  sleep 2
done
sleep 2
xcrun simctl io "$UDID" screenshot "$OUT_ROOT/02-widget.png"
echo "done -> $OUT_ROOT/02-widget.png"
