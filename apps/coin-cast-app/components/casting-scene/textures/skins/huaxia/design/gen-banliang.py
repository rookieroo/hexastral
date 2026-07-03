#!/usr/bin/env python3
"""Bake 秦半两 — dark 青铜浮雕；字形依 F01 咸阳博物馆半两描摹。

秦早期无郭。Run: python3 gen-banliang.py
"""
from __future__ import annotations

import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
DIST = os.path.join(HERE, "dist")
os.makedirs(DIST, exist_ok=True)

sys.path.insert(0, HERE)
from banliang_glyphs import obverse_glyphs  # noqa: E402
from bronze_face import RELIEF, hole, patina, rsvg, svg  # noqa: E402


def main() -> None:
    print("banliang design (F01 咸阳博 · dark bronze · 无郭)")
    yang_path = os.path.join(DIST, "banliang-yang.png")
    rsvg(svg(hole() + obverse_glyphs(RELIEF), rim_lip=False), yang_path, HERE)
    patina(yang_path)
    print(f"  baked banliang-yang.png  {os.path.getsize(yang_path) // 1024}KB")

    yin_path = os.path.join(DIST, "banliang-yin.png")
    rsvg(svg(hole(), rim_lip=False), yin_path, HERE)
    patina(yin_path)
    print(f"  baked banliang-yin.png  {os.path.getsize(yin_path) // 1024}KB")
    print(f"done → {DIST}/")


if __name__ == "__main__":
    main()
