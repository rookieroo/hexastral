#!/bin/bash
# Yuun ASC screenshot deck — 8-shot template × locale × size.
#
# Usage: scripts/capture-deck.sh <device-name> <size-dir> <locale>
#   locale ∈ {en, zh-Hans, zh-Hant, ja}
#   e.g. scripts/capture-deck.sh "iPhone 11 Pro Max" 6.5 en
#
# Prereqs:
#   - Release simulator app built once (see capture-asc-screenshots.sh header).
#   - Springboard arranged once per device: page 2 holds the THREE Yuun widget
#     sizes (small/medium/large); the Lock Screen has a Yuun accessory widget.
#   - For shot 07 the operator presses ⌘L (Simulator → Device → Lock) when
#     prompted, then the script captures.
#
# Deck (per locale):
#   01-almanac-home  黄历首页 (classical home — new-install default)
#   02-widget        副一屏三尺寸组件 (large variant per locale rule below)
#   03-modern-home   现代首页 (contemporary home)
#   04-culture-deep  处暑文化深读 (deep link)
#   05-find-a-date   择日 (deep link)
#   06-settings      设置与提醒 (deep link + scroll)
#   07-lock          锁屏 + Yuun 锁屏组件 (payload synced; operator locks)
#   08-lifetime      人生时间轴 (deep link)
#
# Widget large-variant rule (founder decision 2026-08):
#   zh-Hans / zh-Hant → 黄历版 (classical almanac large)
#   en / ja           → 现代版 (modern large)
# Medium/small widgets are mode-agnostic by design.
set -euo pipefail

DEVICE_NAME="$1"
SIZE_DIR="$2"
LOCALE="$3"
APP_PATH="${APP_PATH:-apps/auspice-app/ios/build/Build/Products/Release-iphonesimulator/Yuun.app}"
BUNDLE_ID="com.hexastral.yuun"
OUT_ROOT="${OUT_ROOT:-docs/publish/screenshots/yuun/$SIZE_DIR/$LOCALE}"
REGION_MAP="en:en_US zh-Hans:zh_CN zh-Hant:zh_TW ja:ja_JP"
REGION=$(for p in $REGION_MAP; do [ "${p%%:*}" = "$LOCALE" ] && echo "${p##*:}"; done)
[ -n "$REGION" ] || { echo "unknown locale $LOCALE" >&2; exit 1; }

# 大组件变体：zh → classical；en/ja → contemporary。
case "$LOCALE" in
  zh-Hans|zh-Hant) WIDGET_MODE="classical" ;;
  *) WIDGET_MODE="contemporary" ;;
esac

UDID=$(xcrun simctl list devices | grep -F "$DEVICE_NAME" | grep -Eo '[0-9A-F]{8}-[0-9A-F-]{27,}' | head -1)
[ -n "$UDID" ] || { echo "no simulator named $DEVICE_NAME" >&2; exit 1; }
[ -d "$APP_PATH" ] || { echo "Release app not found at $APP_PATH" >&2; exit 1; }

# ── helpers (idempotent) ────────────────────────────────────────────────
[ -f /tmp/tap.js ] || cat > /tmp/tap.js <<'JSEOF'
ObjC.import('CoreGraphics')
ObjC.import('AppKit')
function run(argv) {
  const x = parseFloat(argv[0]); const y = parseFloat(argv[1])
  const apps = $.NSRunningApplication.runningApplicationsWithBundleIdentifier('com.apple.iphonesimulator')
  if (apps.count > 0) apps.objectAtIndex(0).activateWithOptions($.NSApplicationActivateIgnoringOtherApps)
  $.NSThread.sleepForTimeInterval(0.4)
  const p = $.CGPointMake(x, y)
  const d = $.CGEventCreateMouseEvent($(), $.kCGEventLeftMouseDown, p, $.kCGMouseButtonLeft)
  const u = $.CGEventCreateMouseEvent($(), $.kCGEventLeftMouseUp, p, $.kCGMouseButtonLeft)
  $.CGEventPost($.kCGHIDEventTap, d); $.NSThread.sleepForTimeInterval(0.08); $.CGEventPost($.kCGHIDEventTap, u)
  return 'tap'
}
JSEOF
[ -f /tmp/scrollat.js ] || cat > /tmp/scrollat.js <<'JSEOF'
ObjC.import('CoreGraphics')
ObjC.import('AppKit')
function run(argv) {
  const x = parseFloat(argv[0]); const y = parseFloat(argv[1]); const dy = parseFloat(argv[2] || '-12')
  const apps = $.NSRunningApplication.runningApplicationsWithBundleIdentifier('com.apple.iphonesimulator')
  if (apps.count > 0) apps.objectAtIndex(0).activateWithOptions($.NSApplicationActivateIgnoringOtherApps)
  $.NSThread.sleepForTimeInterval(0.3)
  const p = $.CGPointMake(x, y)
  $.CGEventPost($.kCGHIDEventTap, $.CGEventCreateMouseEvent($(), $.kCGEventMouseMoved, p, $.kCGMouseButtonLeft))
  $.NSThread.sleepForTimeInterval(0.2)
  for (let i = 0; i < 4; i++) {
    $.CGEventPost($.kCGHIDEventTap, $.CGEventCreateScrollWheelEvent($(), $.kCGScrollEventUnitLine, 2, dy, 0))
    $.NSThread.sleepForTimeInterval(0.15)
  }
  return 'scroll'
}
JSEOF

geopoint() { # $1 nx $2 ny -> global x y from Simulator content rect
  local G NX NY
  G=$(osascript -e 'tell application "System Events" to tell process "Simulator" to get {position, size} of group 1 of window 1')
  read -r GX GY GW GH <<< "$(python3 -c "
g = '''$G'''.replace('{', '').replace('}', '')
p = [x.strip() for x in g.split(',')]
print(p[0], p[1], p[2], p[3])")"
  NX=$(python3 -c "print(int($GX + $1 * $GW))")
  NY=$(python3 -c "print(int($GY + $2 * $GH))")
  echo "$NX $NY"
}
tap() { read -r X Y <<< "$(geopoint "$1" "$2")"; osascript -l JavaScript /tmp/tap.js "$X" "$Y"; }
scroll() { read -r X Y <<< "$(geopoint "$1" "$2")"; osascript -l JavaScript /tmp/scrollat.js "$X" "$Y" "$3"; }
swipe_left_page() {
  read -r X1 Y1 <<< "$(geopoint 0.85 0.5)"
  read -r X2 Y2 <<< "$(geopoint 0.15 0.5)"
  osascript -l JavaScript /tmp/drag.js "$X1" "$Y1" "$X2" "$Y2" 0.7
}

seed() { # $1 voiceMode (classical|contemporary)
  local APPDATA ASDIR
  xcrun simctl terminate "$UDID" "$BUNDLE_ID" 2>/dev/null || true
  xcrun simctl uninstall "$UDID" "$BUNDLE_ID" 2>/dev/null || true
  xcrun simctl install "$UDID" "$APP_PATH"
  APPDATA=$(xcrun simctl get_app_container "$UDID" "$BUNDLE_ID" data)
  ASDIR="$APPDATA/Library/Application Support/com.hexastral.yuun/RCTAsyncLocalStorage_V1"
  mkdir -p "$ASDIR"
  printf '{"auspice.onboarding.seen.v1":"1","auspice.voice.mode":"%s","auspice.birthDate":"1992-08-15","auspice.birthInfo":"{\\"solarDate\\":\\"1992-08-15\\",\\"calendar\\":\\"solar\\",\\"timeIndex\\":6,\\"gender\\":\\"女\\",\\"timezone\\":\\"Asia/Shanghai\\"}"}' "$1" > "$ASDIR/manifest.json"
}

sync_widget_payload() { # launch app + open display page (writes payload) + terminate
  xcrun simctl launch "$UDID" "$BUNDLE_ID"
  sleep 8
  xcrun simctl openurl "$UDID" "yuun://display"
  sleep 8
  xcrun simctl terminate "$UDID" "$BUNDLE_ID" 2>/dev/null || true
  sleep 2
}

reboot() {
  xcrun simctl shutdown "$UDID" 2>/dev/null || true
  sleep 3
  xcrun simctl boot "$UDID"
  xcrun simctl bootstatus "$UDID" -b >/dev/null 2>&1
  sleep 6
}

# ── boot + locale ───────────────────────────────────────────────────────
xcrun simctl boot "$UDID" 2>/dev/null || true
xcrun simctl bootstatus "$UDID" -b
xcrun simctl spawn "$UDID" defaults write NSGlobalDomain AppleLanguages -array "$LOCALE"
xcrun simctl spawn "$UDID" defaults write NSGlobalDomain AppleLocale -string "$REGION"
xcrun simctl status_bar "$UDID" override \
  --time "9:41" --batteryState charged --batteryLevel 100 --cellularBars 4 --wifiBars 3
mkdir -p "$OUT_ROOT"

# ── 01 黄历首页 (classical) ─────────────────────────────────────────────
echo "== 01 almanac home =="
seed classical
xcrun simctl launch "$UDID" "$BUNDLE_ID"
sleep 15
xcrun simctl io "$UDID" screenshot "$OUT_ROOT/01-almanac-home.png"

# ── 02 副一屏三尺寸组件 (large variant per locale) ──────────────────────
echo "== 02 widgets ($WIDGET_MODE large) =="
seed "$WIDGET_MODE"
sync_widget_payload
reboot          # WidgetKit refetches timelines on boot — reliable refresh
swipe_left_page # page 1 -> page 2 (widgets page)
sleep 3
xcrun simctl io "$UDID" screenshot "$OUT_ROOT/02-widget.png"

# ── 03 现代首页 ─────────────────────────────────────────────────────────
echo "== 03 modern home =="
seed contemporary
xcrun simctl launch "$UDID" "$BUNDLE_ID"
sleep 15
xcrun simctl io "$UDID" screenshot "$OUT_ROOT/03-modern-home.png"

# ── 04 文化深读 / 05 择日 / 08 时间轴 ──────────────────────────────────
echo "== 04 culture deep =="
xcrun simctl openurl "$UDID" "yuun://festival/jieqi-chushu"; sleep 5
xcrun simctl io "$UDID" screenshot "$OUT_ROOT/04-culture-deep.png"

echo "== 05 find a date =="
xcrun simctl openurl "$UDID" "yuun://event"; sleep 4
xcrun simctl io "$UDID" screenshot "$OUT_ROOT/05-find-a-date.png"

echo "== 08 lifetime =="
xcrun simctl openurl "$UDID" "yuun://timeline"; sleep 4
xcrun simctl io "$UDID" screenshot "$OUT_ROOT/08-lifetime.png"

# ── 06 设置与提醒 (scroll to push + mode toggle) ────────────────────────
echo "== 06 settings =="
xcrun simctl openurl "$UDID" "yuun://me"; sleep 4
scroll 0.5 0.7 -14; sleep 1
scroll 0.5 0.7 -14; sleep 2
xcrun simctl io "$UDID" screenshot "$OUT_ROOT/06-settings.png"

# ── 07 锁屏（操作者按 ⌘L 后回车）──────────────────────────────────────
echo "== 07 lock screen =="
seed classical
sync_widget_payload
read -r -p "Press ⌘L in the Simulator to lock, then press Enter here... " _
xcrun simctl io "$UDID" screenshot "$OUT_ROOT/07-lock.png"

echo "done -> $OUT_ROOT"
