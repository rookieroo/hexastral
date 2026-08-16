#!/bin/bash
# Capture Yuun App Store screenshots from a simulator running the Release build.
#
# Usage: scripts/capture-asc-screenshots.sh <device-name> <size-dir>
#   e.g. scripts/capture-asc-screenshots.sh "iPhone 11 Pro Max" 6.5
#        scripts/capture-asc-screenshots.sh "iPhone 16 Pro Max" 6.9
#
# Prereqs:
#   - Release app built once via:
#     EXPO_PUBLIC_ENV=production EXPO_PUBLIC_IAP_ENABLED=false CI=1 \
#       bunx expo run:ios --configuration Release --device "<device-name>" --no-bundler
#   - The simulator exists (`xcrun simctl list devices`).
#
# What it does per locale (en / zh-Hans / zh-Hant / ja):
#   set system language+region -> fresh install (defaults: 黄历模式 ON) ->
#   launch -> S1 home -> deep link S2 calendar, S3 glossary, S5 settings.
#   S4 (对你而言 with birth info) needs manual taps and is captured separately.
set -euo pipefail

DEVICE_NAME="$1"
SIZE_DIR="$2"
APP_PATH="${APP_PATH:-apps/auspice-app/ios/build/Build/Products/Release-iphonesimulator/Yuun.app}"
BUNDLE_ID="com.hexastral.yuun"
OUT_ROOT="${OUT_ROOT:-docs/publish/screenshots/yuun/$SIZE_DIR}"

UDID=$(xcrun simctl list devices | grep -F "$DEVICE_NAME" | grep -Eo '[0-9A-F]{8}-[0-9A-F-]{27,}' | head -1)
if [ -z "$UDID" ]; then echo "no simulator named $DEVICE_NAME" >&2; exit 1; fi
if [ ! -d "$APP_PATH" ]; then echo "Release app not found at $APP_PATH — build it first" >&2; exit 1; fi

xcrun simctl boot "$UDID" 2>/dev/null || true
open -a Simulator
xcrun simctl bootstatus "$UDID" -b
xcrun simctl status_bar "$UDID" override \
  --time "9:41" --batteryState charged --batteryLevel 100 --cellularBars 4 --wifiBars 3

declare -a LOCALES=("en:en_US" "zh-Hans:zh_CN" "zh-Hant:zh_TW" "ja:ja_JP")

for pair in "${LOCALES[@]}"; do
  lang="${pair%%:*}"
  region="${pair##*:}"
  dir="$OUT_ROOT/$lang"
  mkdir -p "$dir"

  echo "== locale $lang / $region =="
  xcrun simctl spawn "$UDID" defaults write NSGlobalDomain AppleLanguages -array "$lang"
  xcrun simctl spawn "$UDID" defaults write NSGlobalDomain AppleLocale -string "$region"

  xcrun simctl terminate "$UDID" "$BUNDLE_ID" 2>/dev/null || true
  xcrun simctl uninstall "$UDID" "$BUNDLE_ID" 2>/dev/null || true
  xcrun simctl install "$UDID" "$APP_PATH"

  xcrun simctl launch "$UDID" "$BUNDLE_ID"
  sleep 14   # first launch: almanac fetch + fonts
  xcrun simctl io "$UDID" screenshot "$dir/S1-home.png"
  echo "  S1 home"

  xcrun simctl openurl "$UDID" "yuun://calendar"
  sleep 3
  xcrun simctl io "$UDID" screenshot "$dir/S2-calendar.png"
  echo "  S2 calendar"

  xcrun simctl openurl "$UDID" "yuun://glossary"
  sleep 3
  xcrun simctl io "$UDID" screenshot "$dir/S3-glossary.png"
  echo "  S3 glossary"

  xcrun simctl openurl "$UDID" "yuun://me"
  sleep 3
  xcrun simctl io "$UDID" screenshot "$dir/S5-me.png"
  echo "  S5 settings/reminders"
done

echo "done -> $OUT_ROOT"
