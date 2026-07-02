"""Bake 华夏六枚「复刻」碑拓/印章 caps.

Two modes:
  python3 gen-huaxia-replica.py          → 碑拓 (black ink)
  python3 gen-huaxia-replica.py seal     → 印章 (red ink, seal-carving style)

Requires: rsvg-convert, LXGW WenKai / Songti SC (system fonts).
"""
import os
import sys
import subprocess

from replica_glyphs import (
    INK,
    PAPER,
    RUB_DEFS,
    RUB_HOLE,
    RUB_OBVERSE,
    RUB_PLAIN_BACK,
    RUB_RING,
    SEAL_INK,
    SEAL_OBVERSE,
    SEAL_PAPER,
)

HERE = os.path.dirname(os.path.abspath(__file__))
MODE = sys.argv[1] if len(sys.argv) > 1 else "rub"

if MODE == "seal":
    OUT = os.path.join(HERE, "dist", "replica-seal")
    INK_COLOR = SEAL_INK
    PAPER_COLOR = SEAL_PAPER
    OBVERSE = SEAL_OBVERSE
else:
    OUT = os.path.join(HERE, "dist", "replica")
    INK_COLOR = INK
    PAPER_COLOR = PAPER
    OBVERSE = RUB_OBVERSE

os.makedirs(OUT, exist_ok=True)


def render(inner: str, out: str) -> None:
    svg = (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="1254" height="1254" viewBox="0 0 600 600">'
        f'{RUB_DEFS}'
        f'<rect width="600" height="600" fill="{PAPER_COLOR}" filter="url(#paper)"/>'
        f'<g filter="url(#stone)" fill="{INK_COLOR}" stroke="{INK_COLOR}" '
        f'stroke-linecap="round" stroke-linejoin="round">'
        f'{inner}</g></svg>'
    )
    tmp = os.path.join(OUT, "_tmp.svg")
    with open(tmp, "w") as f:
        f.write(svg)
    subprocess.run(
        ["rsvg-convert", "-w", "1254", "-h", "1254", tmp, "-o", out], check=True
    )
    os.remove(tmp)
    print("baked", os.path.basename(out))


for cid, inner in OBVERSE.items():
    render(RUB_RING + RUB_HOLE + inner, os.path.join(OUT, f"{cid}-yang.png"))

render(RUB_PLAIN_BACK if MODE != "seal" else "", os.path.join(OUT, "su-yin.png"))

print(f"done -> {OUT} [{MODE}]")
