#!/usr/bin/env python3
"""Bake 华夏六币 · 临摹版（C.Design 铜钱纹 + 原币字形）。

图案主、字形辅；字面叠半透明朝代铭文，背面纯几何简化纹。
前置：python3 ../fonts/setup-fonts.py
Run: python3 gen-linmo-skins.py [coin_id ...]
"""
from __future__ import annotations

import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
DIST = os.path.join(HERE, "dist")
os.makedirs(DIST, exist_ok=True)

sys.path.insert(0, HERE)
from bronze_face import RELIEF, RELIEF_DIM, defs, disc, hole, patina, rsvg  # noqa: E402
from linmo_patterns import LINMO_PATTERNS, HoleGeom  # noqa: E402
from typography import COIN_TYPES, font_face_rules, obverse_glyphs  # noqa: E402

SIZE = 1254
VIEW = 600

# 字形透明度 — 图案为主
GLYPH_OPACITY = 0.52


def _hole_geom(coin_id: str) -> HoleGeom:
    x, y, w, h, _ = COIN_TYPES[coin_id].hole
    return HoleGeom(x, y, w, h)


def _yang_pattern(coin_id: str) -> str:
    fn, _ = LINMO_PATTERNS[coin_id]
    return fn(_hole_geom(coin_id))


def _yin_pattern(coin_id: str) -> str:
    _, fn = LINMO_PATTERNS[coin_id]
    return fn(_hole_geom(coin_id))


def _glyphs(coin_id: str) -> str:
    return f'<g opacity="{GLYPH_OPACITY}">{obverse_glyphs(coin_id, RELIEF)}</g>'


def _svg(inner: str, rim_lip: bool) -> str:
    style = f"<style><![CDATA[{font_face_rules()}]]></style>"
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" '
        f'width="{SIZE}" height="{SIZE}" viewBox="0 0 {VIEW} {VIEW}">'
        f"<defs>{style}{defs(rim_lip)}</defs>"
        f'<rect width="{VIEW}" height="{VIEW}" fill="#080706"/>'
        f"{disc()}"
        f'<g filter="url(#relief)" fill="{RELIEF}" stroke="{RELIEF}">{inner}</g></svg>'
    )


def bake(coin_id: str) -> None:
    spec = COIN_TYPES[coin_id]
    hx, hy, hw, hh, hsw = spec.hole
    h = hole(hx, hy, hw, hh, hsw)

    yang_inner = h + _yang_pattern(coin_id) + _glyphs(coin_id)
    yang = os.path.join(DIST, f"{coin_id}-yang.png")
    rsvg(_svg(yang_inner, spec.rim_lip), yang, HERE)
    patina(yang)

    yin_inner = h + _yin_pattern(coin_id)
    yin = os.path.join(DIST, f"{coin_id}-yin.png")
    rsvg(_svg(yin_inner, spec.rim_lip), yin, HERE)
    patina(yin)

    print(f"  {coin_id}-yang.png {os.path.getsize(yang) // 1024}KB")
    print(f"  {coin_id}-yin.png  {os.path.getsize(yin) // 1024}KB")


def main() -> None:
    targets = sys.argv[1:] if len(sys.argv) > 1 else list(COIN_TYPES.keys())
    print("huaxia linmo skins (铜钱纹几何 · 字形辅)")
    for cid in targets:
        if cid not in COIN_TYPES:
            print(f"unknown coin: {cid}", file=sys.stderr)
            sys.exit(1)
        print(f"→ {cid} ({COIN_TYPES[cid].era_script})")
        bake(cid)
    print(f"done → {DIST}/")


if __name__ == "__main__":
    main()
