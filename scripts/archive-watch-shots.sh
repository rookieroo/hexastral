#!/bin/bash
# 把手动截的手表图批量缩放为 ASC 要求尺寸（396×484）并按 locale 归档。
# Usage: scripts/archive-watch-shots.sh <src-dir> <locale>
#   locale ∈ {en, zh-Hans, zh-Hant, ja}
# 输出: docs/publish/screenshots/yuun/watch/45mm/<locale>/shotNN.png（按文件时间排序）
# 归档后请人工把 shotNN 重命名为 face1-3 / today / browse / settings。
set -euo pipefail
SRC="$1"; LOCALE="$2"
OUT="docs/publish/screenshots/yuun/watch/45mm/$LOCALE"
mkdir -p "$OUT"
i=0
for f in "$SRC"/*.png "$SRC"/*.PNG; do
  [ -e "$f" ] || continue
  i=$((i+1))
  dst="$OUT/shot$(printf '%02d' $i).png"
  W=$(sips -g pixelWidth "$f" | tail -1 | awk '{print $2}')
  H=$(sips -g pixelHeight "$f" | tail -1 | awk '{print $2}')
  if [ "$W" = "396" ] && [ "$H" = "484" ]; then
    cp "$f" "$dst"
    echo "$f -> $dst (原尺寸)"
  else
    sips -z 484 396 "$f" --out "$dst" >/dev/null
    echo "$f ($W×$H) -> $dst (缩放 396×484)"
  fi
done
echo "done: $i 张 -> $OUT"
