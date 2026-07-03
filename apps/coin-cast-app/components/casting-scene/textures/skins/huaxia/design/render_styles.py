"""铜钱纹 · 碑拓 / 印章 / 水墨 + 做旧（原创纹样渲染）。"""
from __future__ import annotations

import os
import subprocess
import tempfile
from dataclasses import dataclass
from typing import Literal

import numpy as np
from PIL import Image, ImageEnhance, ImageFilter

from coin_motifs import oracle_mark, yang_motif, yin_motif
from typography import FONTS, font_face_rules

StyleId = Literal["rub", "seal", "ink"]

RENDER_SIZE = 1254
VIEW = 600

_VIGNETTE = """
  <radialGradient id="edge" cx="50%" cy="48%" r="54%">
    <stop offset="58%" stop-color="#000000" stop-opacity="0"/>
    <stop offset="100%" stop-color="#000000" stop-opacity="0.16"/>
  </radialGradient>
"""


def _wrap_defs(body: str) -> str:
    return f"<defs>{_VIGNETTE}{body}</defs>"


DEFS_RUB = _wrap_defs("""
  <filter id="paper" x="0" y="0" width="100%" height="100%">
    <feTurbulence type="fractalNoise" baseFrequency="0.008" numOctaves="4" seed="11" result="n"/>
    <feColorMatrix in="n" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.55 0" result="na"/>
    <feComponentTransfer in="na"><feFuncA type="linear" slope="0.09"/></feComponentTransfer>
    <feFlood flood-color="#b8a67a" result="fib"/>
    <feComposite in="fib" in2="na" operator="in" result="fibers"/>
    <feMerge><feMergeNode in="SourceGraphic"/><feMergeNode in="fibers"/></feMerge>
  </filter>
  <filter id="ink" x="-12%" y="-12%" width="124%" height="124%">
    <feTurbulence type="fractalNoise" baseFrequency="0.038" numOctaves="2" seed="7" result="warp"/>
    <feDisplacementMap in="SourceGraphic" in2="warp" scale="5.5" xChannelSelector="R" yChannelSelector="G" result="disp"/>
    <feTurbulence type="fractalNoise" baseFrequency="0.12" numOctaves="3" seed="21" result="g"/>
    <feColorMatrix in="g" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.75 0" result="ga"/>
    <feComposite in="ga" in2="disp" operator="in" result="grain"/>
    <feComponentTransfer in="grain"><feFuncA type="linear" slope="0.14"/></feComponentTransfer>
    <feFlood flood-color="#e8dfca" result="lift"/>
    <feComposite in="lift" in2="grain" operator="in" result="speck"/>
    <feMerge><feMergeNode in="disp"/><feMergeNode in="speck"/></feMerge>
  </filter>
""")


DEFS_SEAL = _wrap_defs("""
  <filter id="paper" x="0" y="0" width="100%" height="100%">
    <feTurbulence type="fractalNoise" baseFrequency="0.013" numOctaves="3" seed="3" result="n"/>
    <feColorMatrix in="n" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.38 0" result="na"/>
    <feComponentTransfer in="na"><feFuncA type="linear" slope="0.06"/></feComponentTransfer>
    <feFlood flood-color="#e0d4c4" result="fib"/>
    <feComposite in="fib" in2="na" operator="in" result="fibers"/>
    <feMerge><feMergeNode in="SourceGraphic"/><feMergeNode in="fibers"/></feMerge>
  </filter>
  <filter id="ink" x="-14%" y="-14%" width="128%" height="128%">
    <feTurbulence type="fractalNoise" baseFrequency="0.048" numOctaves="3" seed="17" result="warp"/>
    <feDisplacementMap in="SourceGraphic" in2="warp" scale="4.2" xChannelSelector="R" yChannelSelector="G" result="disp"/>
    <feMorphology in="disp" operator="dilate" radius="0.45" result="thick"/>
    <feTurbulence type="fractalNoise" baseFrequency="0.17" numOctaves="2" seed="9" result="g"/>
    <feColorMatrix in="g" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.55 0" result="ga"/>
    <feComposite in="ga" in2="thick" operator="in" result="grain"/>
    <feComponentTransfer in="grain"><feFuncA type="linear" slope="0.2"/></feComponentTransfer>
    <feMerge><feMergeNode in="thick"/><feMergeNode in="grain"/></feMerge>
  </filter>
""")


DEFS_INK = _wrap_defs("""
  <filter id="paper" x="0" y="0" width="100%" height="100%">
    <feTurbulence type="fractalNoise" baseFrequency="0.007" numOctaves="4" seed="5" result="n"/>
    <feColorMatrix in="n" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.42 0" result="na"/>
    <feComponentTransfer in="na"><feFuncA type="linear" slope="0.05"/></feComponentTransfer>
    <feFlood flood-color="#cfc4b2" result="fib"/>
    <feComposite in="fib" in2="na" operator="in" result="fibers"/>
    <feMerge><feMergeNode in="SourceGraphic"/><feMergeNode in="fibers"/></feMerge>
  </filter>
  <filter id="ink" x="-16%" y="-16%" width="132%" height="132%">
    <feGaussianBlur in="SourceGraphic" stdDeviation="0.75" result="blur"/>
    <feTurbulence type="fractalNoise" baseFrequency="0.024" numOctaves="3" seed="13" result="warp"/>
    <feDisplacementMap in="blur" in2="warp" scale="3.2" xChannelSelector="R" yChannelSelector="G" result="disp"/>
    <feComponentTransfer in="disp" result="fade">
      <feFuncA type="table" tableValues="0.68 0.86 0.96 1"/>
    </feComponentTransfer>
    <feTurbulence type="fractalNoise" baseFrequency="0.075" numOctaves="2" seed="31" result="g"/>
    <feColorMatrix in="g" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.5 0" result="ga"/>
    <feComposite in="ga" in2="fade" operator="in" result="grain"/>
    <feComponentTransfer in="grain"><feFuncA type="linear" slope="0.09"/></feComponentTransfer>
    <feMerge><feMergeNode in="fade"/><feMergeNode in="grain"/></feMerge>
  </filter>
""")


@dataclass(frozen=True)
class StyleSpec:
    id: StyleId
    label: str
    paper: str
    ink: str
    stroke_mul: float
    motif_sw_yang: float
    motif_sw_yin: float
    defs: str
    ink_filter: str
    paper_filter: str


STYLES: dict[StyleId, StyleSpec] = {
    "rub": StyleSpec(
        id="rub",
        label="碑拓",
        paper="#e7ddc7",
        ink="#16110a",
        stroke_mul=1.0,
        motif_sw_yang=5.2,
        motif_sw_yin=4.8,
        defs=DEFS_RUB,
        ink_filter="url(#ink)",
        paper_filter="url(#paper)",
    ),
    "seal": StyleSpec(
        id="seal",
        label="印章",
        paper="#faf5ee",
        ink="#9c2a1c",
        stroke_mul=1.12,
        motif_sw_yang=5.8,
        motif_sw_yin=5.2,
        defs=DEFS_SEAL,
        ink_filter="url(#ink)",
        paper_filter="url(#paper)",
    ),
    "ink": StyleSpec(
        id="ink",
        label="水墨",
        paper="#f0ebe0",
        ink="#242018",
        stroke_mul=0.95,
        motif_sw_yang=5.0,
        motif_sw_yin=4.5,
        defs=DEFS_INK,
        ink_filter="url(#ink)",
        paper_filter="url(#paper)",
    ),
}


def _yang_mark(coin_id: str, ink: str) -> str:
    spec = oracle_mark(coin_id)
    font = FONTS[spec.font_key]
    return (
        f'<text x="300" y="518" font-family="{font.css_family}" font-size="28" '
        f'text-anchor="middle" dominant-baseline="central" fill="{ink}" stroke="{ink}" '
        f'stroke-width="0.6" opacity="0.5">{spec.mark}</text>'
    )


def compose_face(coin_id: str, side: str, style: StyleSpec) -> str:
    sw = (style.motif_sw_yang if side == "yang" else style.motif_sw_yin) * style.stroke_mul
    if side == "yang":
        return yang_motif(coin_id, sw, style.paper, style.ink) + _yang_mark(coin_id, style.ink)
    return yin_motif(coin_id, sw, style.paper, style.ink)


def render_svg(coin_id: str, side: str, style: StyleSpec) -> str:
    inner = compose_face(coin_id, side, style)
    font_css = f"<style><![CDATA[{font_face_rules()}]]></style>" if side == "yang" else ""
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" '
        f'width="{RENDER_SIZE}" height="{RENDER_SIZE}" viewBox="0 0 {VIEW} {VIEW}">'
        f"{style.defs}{font_css}"
        f'<rect width="{VIEW}" height="{VIEW}" fill="{style.paper}" filter="{style.paper_filter}"/>'
        f'<g filter="{style.ink_filter}" fill="{style.ink}" stroke="{style.ink}" '
        f'stroke-linecap="round" stroke-linejoin="round" color="{style.ink}">{inner}</g>'
        f'<rect width="{VIEW}" height="{VIEW}" fill="url(#edge)" opacity="0.55"/>'
        f"</svg>"
    )


def bake_png(svg: str, out_path: str) -> None:
    with tempfile.NamedTemporaryFile(suffix=".svg", delete=False, mode="w", encoding="utf-8") as sf:
        sf.write(svg)
        svg_path = sf.name
    try:
        subprocess.run(
            ["rsvg-convert", "-w", str(RENDER_SIZE), "-h", str(RENDER_SIZE), svg_path, "-o", out_path],
            check=True,
        )
    finally:
        if os.path.exists(svg_path):
            os.remove(svg_path)


def age_png(path: str, style: StyleId) -> None:
    """烘焙后做旧：暗角、纸色偏移、微颗粒。"""
    im = Image.open(path).convert("RGB")
    w, h = im.size
    arr = np.asarray(im, dtype=np.float32)
    yy, xx = np.ogrid[:h, :w]
    cx, cy = (w - 1) / 2, (h - 1) / 2
    r = np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2) / (w * 0.5)
    vignette = np.clip((r - 0.52) / 0.48, 0, 1) * 0.2
    arr *= 1 - vignette[..., None]
    if style == "rub":
        arr[:, :, 0] *= 1.03
        arr[:, :, 2] *= 0.96
    elif style == "seal":
        arr[:, :, 0] *= 1.04
        arr[:, :, 1] *= 0.98
    else:
        arr *= 0.98
    arr = np.clip(arr, 0, 255).astype(np.uint8)
    out = Image.fromarray(arr)
    grain = Image.effect_noise((w, h), 11).convert("L").filter(ImageFilter.GaussianBlur(0.6))
    garr = np.asarray(grain, dtype=np.float32) / 255
    oarr = np.asarray(out, dtype=np.float32)
    oarr *= 1 - garr[..., None] * 0.04
    out = Image.fromarray(np.clip(oarr, 0, 255).astype(np.uint8))
    out = ImageEnhance.Contrast(out).enhance(1.04)
    out.save(path, optimize=True, compress_level=9)
