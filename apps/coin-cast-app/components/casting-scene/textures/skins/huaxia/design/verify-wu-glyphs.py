#!/usr/bin/env python3
"""Overlay 五 path on W01 relief crop for fine-tuning."""
from __future__ import annotations

import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

from wuzhu_glyphs import WU_STROKES, _place  # noqa: E402

CROP = os.path.join(HERE, "_relief_crop_wu.jpg")
OUT_SVG = os.path.join(HERE, "_verify_wu_crop.svg")
OUT_PNG = os.path.join(HERE, "_verify_wu_crop.png")
VIEW = 100


def main() -> None:
    glyphs = _place(WU_STROKES, 50, 50, 100, "#ff3333", 8.0)
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
