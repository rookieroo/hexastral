#!/bin/bash
# Capture ONLY shot 07 — real Lock Screen with the Yuun accessory widget.
# Prereq: a Yuun lock-screen widget was added once on this device.
# Usage: scripts/capture-lock.sh <device-name> <size-dir> <locale>
# The operator presses ⌘L when prompted; the script then captures.
set -euo pipefail
DEVICE_NAME="$1"; SIZE_DIR="$2"; LOCALE="$3"
OUT_ROOT="${OUT_ROOT:-docs/publish/screenshots/yuun/$SIZE_DIR/$LOCALE}"
UDID=$(xcrun simctl list devices | grep -F "$DEVICE_NAME" | grep -Eo '[0-9A-F]{8}-[0-9A-F-]{27,}' | head -1)
[ -n "$UDID" ] || { echo "no simulator named $DEVICE_NAME" >&2; exit 1; }
xcrun simctl boot "$UDID" 2>/dev/null || true
xcrun simctl bootstatus "$UDID" -b
mkdir -p "$OUT_ROOT"
read -r -p "Press ⌘L in the Simulator to lock, then press Enter... " _ || true
sleep 2
xcrun simctl io "$UDID" screenshot "$OUT_ROOT/07-lock.png"
echo "done -> $OUT_ROOT/07-lock.png"
