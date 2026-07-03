#!/usr/bin/env python3
"""Overlay banliang paths on F01 relief reference."""
from __future__ import annotations

import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

from banliang_glyphs import obverse_glyphs  # noqa: E402
from banliang_ref import RELIEF_OUT, build_relief_annotated  # noqa: E402

OUT_SVG = os.path.join(HERE, "_verify_overlay.svg")
OUT_PNG = os.path.join(HERE, "_verify_overlay.png")
W, H = 1024, 1024
VIEW = 600


def main() -> None:
    ref = build_relief_annotated()
    glyphs = obverse_glyphs("#ff3333", stroke_w=11.0)
    svg = (
        f'<svg xmlns="http://www.w3.org/2000/svg" '
        f'width="{W}" height="{H}" viewBox="0 0 {VIEW} {VIEW}">'
        f'<image href="{ref}" x="0" y="0" width="{VIEW}" height="{VIEW}" '
        f'preserveAspectRatio="none" opacity="0.55"/>'
        f'<g opacity="0.92">{glyphs}</g></svg>'
    )
    with open(OUT_SVG, "w", encoding="utf-8") as f:
        f.write(svg)
    subprocess.run(
        ["rsvg-convert", "-w", str(W), "-h", str(H), OUT_SVG, "-o", OUT_PNG],
        check=True,
    )
    print(f"wrote {OUT_PNG} (ref {os.path.basename(ref)})")


if __name__ == "__main__":
    main()
