#!/usr/bin/env python3
"""Overlay 銖 path on W01 relief crop for fine-tuning."""
from __future__ import annotations

import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

from wuzhu_glyphs import ZHU_STROKES, _place  # noqa: E402

CROP = os.path.join(HERE, "_relief_crop_zhu.jpg")
if not os.path.isfile(CROP):
    CROP = os.path.join(HERE, "_zhu_relief_crop.jpg")
OUT_SVG = os.path.join(HERE, "_verify_zhu_crop.svg")
OUT_PNG = os.path.join(HERE, "_verify_zhu_crop.png")
VIEW = 100


def main() -> None:
    glyphs = _place(ZHU_STROKES, 50, 50, 100, "#ff3333", 8.5)
    svg = (
        f'<svg xmlns="http://www.w3.org/2000/svg" '
        f'width="512" height="512" viewBox="0 0 {VIEW} {VIEW}">'
        f'<image href="{CROP}" x="0" y="0" width="{VIEW}" height="{VIEW}" '
        f'preserveAspectRatio="none" opacity="0.72"/>'
        f'<g opacity="0.95">{glyphs}</g></svg>'
    )
    with open(OUT_SVG, "w", encoding="utf-8") as f:
        f.write(svg)
    subprocess.run(
        ["rsvg-convert", "-w", "512", "-h", "512", OUT_SVG, "-o", OUT_PNG],
        check=True,
    )
    print(f"wrote {OUT_PNG}")


if __name__ == "__main__":
    main()
