#!/usr/bin/env python3
"""Bake 华夏六币 · 六爻占卜皮肤（图案主、文字辅）。

前置：python3 ../fonts/setup-fonts.py
Run: python3 gen-type-skins.py [coin_id ...]
"""
from __future__ import annotations

import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
DIST = os.path.join(HERE, "dist")
os.makedirs(DIST, exist_ok=True)

sys.path.insert(0, HERE)
from bronze_face import RELIEF, RELIEF_DIM, defs, disc, hole, patina, rsvg  # noqa: E402
from oracle_skins import ORACLE_SKINS, yang_pattern, yin_pattern  # noqa: E402
from typography import FONTS, font_face_rules  # noqa: E402

SIZE = 1254
VIEW = 600


def _mark_glyph(spec, ink: str) -> str:
    font = FONTS[spec.font_key]
    return (
        f'<text x="{spec.mark_x:.1f}" y="{spec.mark_y:.1f}" font-family="{font.css_family}" '
        f'font-size="{spec.mark_size:.1f}" text-anchor="middle" dominant-baseline="central" '
        f'fill="{ink}" stroke="{ink}" stroke-width="{spec.mark_stroke:.2f}" '
        f'stroke-linejoin="round" opacity="0.72">{spec.mark_char}</text>'
    )


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
    spec = ORACLE_SKINS[coin_id]
    hx, hy, hw, hh, hsw = spec.hole
    h = hole(hx, hy, hw, hh, hsw)
    yang_inner = h + yang_pattern(coin_id) + _mark_glyph(spec, RELIEF_DIM)
    yang = os.path.join(DIST, f"{coin_id}-yang.png")
    rsvg(_svg(yang_inner, spec.rim_lip), yang, HERE)
    patina(yang)

    yin_inner = h + yin_pattern(coin_id)
    yin = os.path.join(DIST, f"{coin_id}-yin.png")
    rsvg(_svg(yin_inner, spec.rim_lip), yin, HERE)
    patina(yin)
    print(f"  {coin_id}-yang.png {os.path.getsize(yang) // 1024}KB")
    print(f"  {coin_id}-yin.png  {os.path.getsize(yin) // 1024}KB")


def main() -> None:
    targets = sys.argv[1:] if len(sys.argv) > 1 else list(ORACLE_SKINS.keys())
    print("huaxia oracle skins (pattern-first · dark bronze)")
    for cid in targets:
        if cid not in ORACLE_SKINS:
            print(f"unknown coin: {cid}", file=sys.stderr)
            sys.exit(1)
        s = ORACLE_SKINS[cid]
        print(f"→ {cid} ({s.era_script} · {s.oracle_theme})")
        bake(cid)
    print(f"done → {DIST}/")


if __name__ == "__main__":
    main()
