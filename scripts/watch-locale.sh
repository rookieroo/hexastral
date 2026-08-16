#!/bin/bash
# 切换 Apple Watch 模拟器的语言并清掉 App Group 旧 locale 痕迹（必须清，
# 否则手表 App 的 resolvedLocale 优先读旧值，语言不生效）。
# Usage: scripts/watch-locale.sh <watch-device-name> <locale>
#   locale ∈ {en, zh-Hans, zh-Hant, ja}
set -euo pipefail

DEVICE_NAME="$1"; LOCALE="$2"
case "$LOCALE" in
  en) REGION="en_US" ;;
  zh-Hans) REGION="zh_CN" ;;
  zh-Hant) REGION="zh_TW" ;;
  ja) REGION="ja_JP" ;;
  *) echo "locale must be en|zh-Hans|zh-Hant|ja" >&2; exit 1 ;;
esac

if echo "$DEVICE_NAME" | grep -qE '^[0-9A-F]{8}-[0-9A-F-]{27,}$'; then
  WUDID="$DEVICE_NAME"   # 直接传了 UDID
else
  # 同名实例可能多台：优先选已启动的
  WUDID=$(xcrun simctl list devices | grep -F "$DEVICE_NAME" | grep -F '(Booted)' | grep -Eo '[0-9A-F]{8}-[0-9A-F-]{27,}' | head -1)
  if [ -z "$WUDID" ]; then
    WUDID=$(xcrun simctl list devices | grep -F "$DEVICE_NAME" | grep -Eo '[0-9A-F]{8}-[0-9A-F-]{27,}' | head -1)
  fi
fi
[ -n "$WUDID" ] || { echo "no booted/existing simulator named $DEVICE_NAME" >&2; exit 1; }
echo "watch=$WUDID -> $LOCALE / $REGION"

xcrun simctl spawn "$WUDID" defaults write NSGlobalDomain AppleLanguages -array "$LOCALE"
xcrun simctl spawn "$WUDID" defaults write NSGlobalDomain AppleLocale -string "$REGION"

for gp in "/Users/apple/Library/Developer/CoreSimulator/Devices/$WUDID/data/Containers/Shared/AppGroup/"*/Library/Preferences/group.com.hexastral.yuun.plist; do
  rm -f "$gp" && echo "cleared stale locale: $gp"
done

xcrun simctl shutdown "$WUDID" 2>/dev/null || true
sleep 3
xcrun simctl boot "$WUDID"
xcrun simctl bootstatus "$WUDID" -b >/dev/null 2>&1
sleep 5
# 启动一次 App 拉取新语言数据
xcrun simctl launch "$WUDID" com.hexastral.yuun.watch 2>/dev/null || true
sleep 8
echo "done — watch is now in $LOCALE; the Yuun app has fetched fresh data."
