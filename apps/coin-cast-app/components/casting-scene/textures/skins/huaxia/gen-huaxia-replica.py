"""Bake 华夏五枚「复刻」碑拓 caps — same SVG master system as original/gen-coins.py.

Interpretive rubbings (NOT photo crops): real inscription layout + 对读 positions,
宣纸/墨拓 filters, plain 素背 reverse. Preview-only in gallery.html (tier 复刻).

  python3 gen-huaxia-replica.py
Requires: rsvg-convert, LXGW WenKai / Songti SC (system fonts).
"""
import os
import subprocess

from replica_glyphs import (
    PAPER,
    RUB_DEFS,
    RUB_HOLE,
    RUB_OBVERSE,
    RUB_PLAIN_BACK,
    RUB_RING,
)

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "dist", "replica")
os.makedirs(OUT, exist_ok=True)


def render(inner: str, out: str) -> None:
    svg = (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="1254" height="1254" viewBox="0 0 600 600">'
        f'{RUB_DEFS}<rect width="600" height="600" fill="{PAPER}" filter="url(#paper)"/>'
        f'<g filter="url(#ink)" fill="#16110a" stroke="#16110a">{inner}</g></svg>'
    )
    tmp = os.path.join(OUT, "_tmp.svg")
    with open(tmp, "w") as f:
        f.write(svg)
    subprocess.run(["rsvg-convert", "-w", "1254", "-h", "1254", tmp, "-o", out], check=True)
    os.remove(tmp)
    print("baked", os.path.basename(out))


for cid, inner in RUB_OBVERSE.items():
    render(RUB_RING + RUB_HOLE + inner, os.path.join(OUT, f"{cid}-yang.png"))

render(RUB_PLAIN_BACK, os.path.join(OUT, "su-yin.png"))

print("done →", OUT)
