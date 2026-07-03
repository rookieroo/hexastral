#!/usr/bin/env python3
"""Bake 汉五铢 — dark 青铜；字形依 W01 S-114 描摹。汉制窄郭用渐变唇，非描边圈。

Run: python3 gen-wuzhu.py
"""
from __future__ import annotations

import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
DIST = os.path.join(HERE, "dist")
os.makedirs(DIST, exist_ok=True)

sys.path.insert(0, HERE)
from bronze_face import RELIEF, hole, patina, rsvg, svg  # noqa: E402
from wuzhu_glyphs import obverse_glyphs  # noqa: E402
from wuzhu_ref import HOLE  # noqa: E402


def main() -> None:
    print("wuzhu design (W01 S-114 · dark bronze · 窄郭渐变)")
    h = hole(**HOLE)
    yang_path = os.path.join(DIST, "wuzhu-yang.png")
    rsvg(svg(h + obverse_glyphs(RELIEF), rim_lip=True), yang_path, HERE)
    patina(yang_path)
    print(f"  baked wuzhu-yang.png  {os.path.getsize(yang_path) // 1024}KB")

    yin_path = os.path.join(DIST, "wuzhu-yin.png")
    rsvg(svg(h, rim_lip=True), yin_path, HERE)
    patina(yin_path)
    print(f"  baked wuzhu-yin.png  {os.path.getsize(yin_path) // 1024}KB")
    print(f"done → {DIST}/")


if __name__ == "__main__":
    main()
