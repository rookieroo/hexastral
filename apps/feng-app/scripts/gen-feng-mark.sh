#!/usr/bin/env bash
#
# gen-feng-mark — regenerate the Fēng brand mark (FengMark.tsx) + app icons from
# the oracle-bone (甲骨文) 鳳/風 phoenix rubbing.
#
# In oracle bone, 風 "wind" and 鳳 "phoenix" are the same graph — the divine bird
# whose wingbeat raises the wind. The mark is an honest TRACE of the rubbing
# (potrace), not a redraw, so the brushwork stays faithful to the original ink.
#
# Source of truth: assets/brand/feng-glyph-src.png (the rubbing photo).
# Requires: imagemagick (magick), potrace, rsvg or magick's SVG delegate, bun.
#
# Usage:  bash scripts/gen-feng-mark.sh
#
set -euo pipefail
cd "$(dirname "$0")/.."

SRC="assets/brand/feng-glyph-src.png"
# Zinc-neutral brand (see FENG_PALETTE in lib/theme.ts) — a bright neutral phoenix
# on a near-black zinc ground. 土黄/铜金 dropped for the 文化出海 mono look. The
# `-gold` filename + var name are kept for script back-compat; the value is zinc.
NIGHT="#09090B"   # zinc-950 (was 墨青 #0A1316)
GOLD="#E4E4E7"    # zinc-200 mark (was copper #B08D5B)
TMP="$(mktemp -d)"

# 1. Isolate the glyph: crop generously, threshold, and KEEP ONLY large black
#    connected components so the surrounding Chinese text/title drop out.
magick "$SRC" -crop 720x760+0+70 +repage "$TMP/crop.png"
magick "$TMP/crop.png" -colorspace Gray -threshold 52% \
  -define connected-components:area-threshold=8000 \
  -define connected-components:mean-color=true \
  -connected-components 8 -threshold 50% "$TMP/iso.png"
magick "$TMP/iso.png" -trim +repage -bordercolor white -border 24 "$TMP/final.png"

# 2. Vectorize.
magick "$TMP/final.png" -threshold 50% "$TMP/final.pbm"
potrace "$TMP/final.pbm" -s -o assets/brand/feng-mark.svg \
  --alphamax 1.2 --opttolerance 0.35 --turdsize 40
sed "s/fill=\"#000000\"/fill=\"$GOLD\"/" assets/brand/feng-mark.svg \
  > assets/brand/feng-mark-gold.svg

# 3. Emit the React Native component (single fill path under potrace's flip <g>).
bun scripts/gen-feng-mark.ts assets/brand/feng-mark.svg components/FengMark.tsx

# 4. App icons: gold phoenix on the night ground.
magick -background none assets/brand/feng-mark-gold.svg -resize 760x "$TMP/phx.png"
magick -size 1024x1024 xc:"$NIGHT" \
  \( "$TMP/phx.png" -resize 680x \) -gravity center -geometry +0-10 -composite \
  -alpha remove -alpha off assets/icon.png
magick -size 1024x1024 xc:none \
  \( "$TMP/phx.png" -resize 580x \) -gravity center -geometry +0-6 -composite \
  assets/adaptive-icon.png
magick -size 1024x1024 xc:none \
  \( "$TMP/phx.png" -resize 460x \) -gravity center -composite assets/splash.png

# 5. Sync into ios/ asset catalog — `expo run:ios` / Xcode read these directly;
#    editing assets/icon.png alone does NOT update the home-screen icon.
IOS_ICON="ios/Feng/Images.xcassets/AppIcon.appiconset/App-Icon-1024x1024@1x.png"
IOS_SPLASH_DIR="ios/Feng/Images.xcassets/SplashScreenLegacy.imageset"
if [[ -f "$IOS_ICON" && -d "$IOS_SPLASH_DIR" ]]; then
  cp assets/icon.png "$IOS_ICON"
  for f in image.png image@2x.png image@3x.png; do
    cp assets/splash.png "$IOS_SPLASH_DIR/$f"
  done
  echo "synced icon + splash → ios/Feng/Images.xcassets/"
fi

rm -rf "$TMP"
echo "feng mark + icons regenerated."
