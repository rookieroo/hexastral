#!/usr/bin/env python3
"""Bake 华夏六币 · 原创卦钱纹样（碑拓 / 印章 / 水墨 + 做旧）。

Run: python3 gen-pattern-skins.py [rub|seal|ink|all] [coin_id ...]
"""
from __future__ import annotations

import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
DIST = os.path.join(HERE, "dist")

sys.path.insert(0, HERE)
from coin_motifs import ORACLE_SET, coin_motif_label  # noqa: E402
from render_styles import STYLES, StyleId, age_png, bake_png, render_svg  # noqa: E402

COINS = list(ORACLE_SET.keys())


def parse_args() -> tuple[list[StyleId], list[str]]:
    args = sys.argv[1:]
    styles: list[StyleId] = ["rub", "seal", "ink"]
    coins = COINS
    if args:
        if args[0] in STYLES:
            styles = [args[0]]  # type: ignore[assignment]
            args = args[1:]
        elif args[0] == "all":
            args = args[1:]
        if args:
            coins = args
    return styles, coins


def main() -> None:
    styles, coins = parse_args()
    print("卦钱六爻原创套 (owned IP · rub/seal/ink)")
    for sid in styles:
        spec = STYLES[sid]
        out_dir = os.path.join(DIST, sid)
        os.makedirs(out_dir, exist_ok=True)
        print(f"── {spec.label} ({sid})")
        for cid in coins:
            if cid not in ORACLE_SET:
                print(f"unknown coin: {cid}", file=sys.stderr)
                sys.exit(1)
            print(f"  {cid}: {coin_motif_label(cid)}")
            for side in ("yang", "yin"):
                out = os.path.join(out_dir, f"{cid}-{side}.png")
                bake_png(render_svg(cid, side, spec), out)
                age_png(out, sid)
                print(f"    {sid}/{cid}-{side}.png {os.path.getsize(out) // 1024}KB")
    print(f"done → {DIST}/")


if __name__ == "__main__":
    main()
