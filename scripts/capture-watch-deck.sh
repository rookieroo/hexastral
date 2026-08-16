#!/bin/bash
# Yuun watchOS screenshot deck — faces + app tabs, per watch size + locale.
# Usage: scripts/capture-watch-deck.sh <watch-udid> <window-name-fragment> <size-dir> <locale>
#   e.g. scripts/capture-watch-deck.sh 8895B38C-... "Series 11" 46mm zh-Hant
# Prereq: the watch has 3 faces with Yuun complications (arranged once per watch);
#         the Release watch app is installed (post-pairing).
set -euo pipefail

WUDID="$1"; WNAME="$2"; SIZE="$3"; LOCALE="$4"
APP="${APP:-com.hexastral.yuun.watch}"
OUT_ROOT="${OUT_ROOT:-docs/publish/screenshots/yuun/watch/$SIZE/$LOCALE}"
case "$LOCALE" in
  en) REGION="en_US" ;;
  zh-Hans) REGION="zh_CN" ;;
  zh-Hant) REGION="zh_TW" ;;
  ja) REGION="ja_JP" ;;
  *) echo "unknown locale" >&2; exit 1 ;;
esac
mkdir -p "$OUT_ROOT"

[ -f /tmp/drag.js ] || echo "missing /tmp/drag.js — create via capture-deck.sh first" >&2
[ -f /tmp/tap.js ] || echo "missing /tmp/tap.js" >&2

[ -f /tmp/geo.js ] || cat > /tmp/geo.js <<'JSEOF'
function run(argv) {
  const name = argv[0]
  const se = Application('System Events')
  const wins = se.processes.byName('Simulator').windows()
  for (let i = 0; i < wins.length; i++) {
    const w = wins[i]
    if (String(w.name()).includes(name)) {
      const p = w.groups[0].position()
      const sz = w.groups[0].size()
      return p[0] + ' ' + p[1] + ' ' + sz[0] + ' ' + sz[1]
    }
  }
  return ''
}
JSEOF
geo() {
  local out tries
  for tries in 1 2 3 4 5 6 7 8; do
    out=$(osascript -l JavaScript /tmp/geo.js "$WNAME" 2>/dev/null)
    case "$out" in
      *" "*" "*" "*) echo "$out"; return 0 ;;
    esac
    sleep 2
  done
  return 1
}
swipe_left() {
  local G NX1 NY1 NX2
  G=$(geo)
  read -r GX GY GW GH <<< "$(python3 -c "
p = '''$G'''.split()
print(p[0], p[1], p[2], p[3])")"
  NX1=$(python3 -c "print(int($GX + 0.85*$GW))"); NY1=$(python3 -c "print(int($GY + 0.5*$GH))")
  NX2=$(python3 -c "print(int($GX + 0.15*$GW))")
  osascript -l JavaScript /tmp/drag.js "$NX1" "$NY1" "$NX2" "$NY1" 0.5
  sleep 2
}
swipe_right() {
  local G NX1 NY1 NX2
  G=$(geo)
  read -r GX GY GW GH <<< "$(python3 -c "
p = '''$G'''.split()
print(p[0], p[1], p[2], p[3])")"
  NX1=$(python3 -c "print(int($GX + 0.15*$GW))"); NY1=$(python3 -c "print(int($GY + 0.5*$GH))")
  NX2=$(python3 -c "print(int($GX + 0.85*$GW))")
  osascript -l JavaScript /tmp/drag.js "$NX1" "$NY1" "$NX2" "$NY1" 0.5
  sleep 2
}
tap_tab() { # $1 x-fraction of the bottom tab bar (0.167 Today / 0.5 Browse / 0.833 Settings)
  local G NX NY
  G=$(geo)
  read -r GX GY GW GH <<< "$(python3 -c "
p = '''$G'''.split()
print(p[0], p[1], p[2], p[3])")"
  NX=$(python3 -c "print(int($GX + $1 * $GW))")
  NY=$(python3 -c "print(int($GY + 0.90 * $GH))")
  osascript -l JavaScript /tmp/tap.js "$NX" "$NY"
  sleep 2
}
ocr_of() { osascript -l JavaScript /tmp/ocr.js "$1" 2>/dev/null || true; }

# ── language + reboot ──
xcrun simctl spawn "$WUDID" defaults write NSGlobalDomain AppleLanguages -array "$LOCALE"
xcrun simctl spawn "$WUDID" defaults write NSGlobalDomain AppleLocale -string "$REGION"
xcrun simctl shutdown "$WUDID" 2>/dev/null || true
# 清掉手表端 App Group 的旧 locale 痕迹 —— resolvedLocale 优先读它，
# 不清会导致切换语言后仍显示上一次的语言。
for gp in "/Users/apple/Library/Developer/CoreSimulator/Devices/$WUDID/data/Containers/Shared/AppGroup/"*/Library/Preferences/group.com.hexastral.yuun.plist; do
  rm -f "$gp"
done
sleep 3
xcrun simctl boot "$WUDID"
xcrun simctl bootstatus "$WUDID" -b >/dev/null 2>&1
sleep 8

# ── fetch localized data via the app ──
xcrun simctl launch "$WUDID" "$APP" 2>/dev/null || true
sleep 8
xcrun simctl terminate "$WUDID" "$APP" 2>/dev/null || true
sleep 2

# ── three faces ──
xcrun simctl io "$WUDID" screenshot "$OUT_ROOT/face1.png"
swipe_left
xcrun simctl io "$WUDID" screenshot "$OUT_ROOT/face2.png"
swipe_left
xcrun simctl io "$WUDID" screenshot "$OUT_ROOT/face3.png"

# ── app tabs ──
xcrun simctl launch "$WUDID" "$APP" 2>/dev/null || true
sleep 6
xcrun simctl io "$WUDID" screenshot "$OUT_ROOT/today.png"
swipe_left
xcrun simctl io "$WUDID" screenshot "$OUT_ROOT/browse.png"
tap_tab 0.833
xcrun simctl io "$WUDID" screenshot "$OUT_ROOT/settings.png"
xcrun simctl terminate "$WUDID" "$APP" 2>/dev/null || true

echo "done -> $OUT_ROOT"
