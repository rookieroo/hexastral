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
[ -f /tmp/watchbtn.js ] || cat > /tmp/watchbtn.js <<'JSEOF'
function run(argv) {
  const name = argv[0]
  const btn = argv[1]
  const se = Application('System Events')
  const wins = se.processes.byName('Simulator').windows()
  for (let i = 0; i < wins.length; i++) {
    const w = wins[i]
    if (String(w.name()).includes(name)) {
      const buttons = w.buttons()
      for (let j = 0; j < buttons.length; j++) {
        try {
          if (String(buttons[j].title()) === btn) { buttons[j].click(); return 'clicked ' + btn }
        } catch (e) {}
      }
    }
  }
  return 'not found'
}
JSEOF
press_crown() { osascript -l JavaScript /tmp/watchbtn.js "$WNAME" "Crown" 2>/dev/null; sleep 1.5; }
geo() {
  local out tries
  for tries in $(seq 1 40); do
    out=$(osascript -l JavaScript /tmp/geo.js "$WNAME" 2>/dev/null)
    case "$out" in
      *" "*" "*" "*) echo "$out"; return 0 ;;
    esac
    # 窗口未开：拉起 Simulator App 再等（设备窗口可能因重启被关闭）
    open -a Simulator >/dev/null 2>&1 || true
    sleep 3
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

# ── three faces（滑动后点按激活，否则停留在切换状态）──
ensure_normal_face() {
  local TXT i
  for i in 1 2 3; do
    xcrun simctl io "$WUDID" screenshot /tmp/fcheck.png >/dev/null 2>&1
    TXT=$(ocr_of /tmp/fcheck.png)
    case "$TXT" in
      *"Edit"*|*"编辑"*|*"編輯"*|*"編集"*) press_crown ;;
      *) return 0 ;;
    esac
  done
}
activate_face() { press_crown; sleep 1.5; }  # 按一次表冠激活滑动后的表盘
swipe_face_left() { # 表盘切换：起点避开组件区域（下方）+ 快速短滑
  local G NX1 NY1 NX2
  G=$(geo)
  read -r GX GY GW GH <<< "$(python3 -c "p = '''$G'''.split(); print(p[0], p[1], p[2], p[3])")"
  NX1=$(python3 -c "print(int($GX + 0.85*$GW))"); NY1=$(python3 -c "print(int($GY + 0.85*$GH))")
  NX2=$(python3 -c "print(int($GX + 0.15*$GW))")
  osascript -l JavaScript /tmp/drag.js "$NX1" "$NY1" "$NX2" "$NY1" 0.35
  sleep 2
}
capture_face() {
  local p="$1" prev="$2" TXT i
  for i in 1 2 3; do
    xcrun simctl io "$WUDID" screenshot "$OUT_ROOT/$p.png"
    TXT=$(ocr_of "$OUT_ROOT/$p.png")
    case "$TXT" in
      *"Edit"*|*"编辑"*|*"編輯"*|*"編集"*) press_crown; swipe_face_left; activate_face ;;
      *)
        if [ -n "$prev" ] && [ "$(md5 -q "$OUT_ROOT/$prev.png")" = "$(md5 -q "$OUT_ROOT/$p.png")" ]; then
          swipe_face_left; activate_face
          continue
        fi
        return 0 ;;
    esac
  done
}
ensure_normal_face
capture_face face1 ""
swipe_face_left
activate_face
capture_face face2 face1
swipe_face_left
activate_face
capture_face face3 face2

# ── app tabs（FACE_ONLY=1 时跳过）──
if [ "${FACE_ONLY:-0}" = "1" ]; then
  echo "done(faces) -> $OUT_ROOT"
  exit 0
fi

xcrun simctl launch "$WUDID" "$APP" 2>/dev/null || true
sleep 6
xcrun simctl io "$WUDID" screenshot "$OUT_ROOT/today.png"
swipe_left
xcrun simctl io "$WUDID" screenshot "$OUT_ROOT/browse.png"
tap_tab 0.833
xcrun simctl io "$WUDID" screenshot "$OUT_ROOT/settings.png"
xcrun simctl terminate "$WUDID" "$APP" 2>/dev/null || true

echo "done -> $OUT_ROOT"
