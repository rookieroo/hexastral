"""碑拓 / 印章 aesthetic — matches original/gen-coins.py + ART-BRIEF.md."""
from __future__ import annotations

import base64
import io
import os
import subprocess
import tempfile
from dataclasses import dataclass

import numpy as np
from PIL import Image

RENDER_SIZE = 1254
VIEW = 600
S = 1024

# Paper: light fiber only. Ink: gentle stone wear (legibility > noise).
GENTLE_DEFS = (
    '<defs><filter id="paper" x="0" y="0" width="100%" height="100%">'
    '<feTurbulence type="fractalNoise" baseFrequency="0.008" numOctaves="3" seed="11" result="n"/>'
    '<feColorMatrix in="n" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.45 0" result="na"/>'
    '<feComponentTransfer in="na"><feFuncA type="linear" slope="0.06"/></feComponentTransfer>'
    '<feFlood flood-color="#c4b896" result="fib"/>'
    '<feComposite in="fib" in2="na" operator="in" result="fibers"/>'
    '<feMerge><feMergeNode in="SourceGraphic"/><feMergeNode in="fibers"/></feMerge></filter>'
    '<filter id="ink" x="-8%" y="-8%" width="116%" height="116%">'
    '<feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="7" result="warp"/>'
    '<feDisplacementMap in="SourceGraphic" in2="warp" scale="2" xChannelSelector="R" yChannelSelector="G" result="disp"/>'
    '<feTurbulence type="fractalNoise" baseFrequency="0.11" numOctaves="2" seed="21" result="g"/>'
    '<feColorMatrix in="g" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.7 0" result="ga"/>'
    '<feComposite in="ga" in2="disp" operator="in" result="grain"/>'
    '<feComponentTransfer in="grain"><feFuncA type="linear" slope="0.1"/></feComponentTransfer>'
    '<feMerge><feMergeNode in="disp"/><feMergeNode in="grain"/></feMerge></filter></defs>'
)

RING = (
    '<circle cx="300" cy="300" r="248" fill="none" stroke-width="40"/>'
    '<circle cx="300" cy="300" r="271" fill="none" stroke-width="5"/>'
    '<circle cx="300" cy="300" r="220" fill="none" stroke-width="4"/>'
)
HOLE = '<rect x="256" y="256" width="88" height="88" fill="none" stroke-width="22"/>'
PLAIN_INNER = '<circle cx="300" cy="300" r="168" fill="none" stroke-width="2" opacity="0.3"/>'


@dataclass(frozen=True)
class Palette:
    name: str
    paper_hex: str
    paper_rgb: tuple[int, int, int]
    ink_hex: str
    ink_rgb: tuple[int, int, int]


PALETTE_RUB = Palette("rub", "#e7ddc7", (231, 221, 199), "#16110a", (22, 17, 10))
PALETTE_SEAL = Palette("seal", "#faf5ee", (250, 245, 238), "#9c2a1c", (156, 42, 28))


def field_mask(size: int, r_inner: float = 0.20, r_outer: float = 0.80) -> np.ndarray:
    yy, xx = np.ogrid[:size, :size]
    cx = cy = (size - 1) / 2
    r = np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2) / (size * 0.5)
    return (r >= r_inner) & (r <= r_outer)


def hole_exclusion(size: int, half: float = 0.075) -> np.ndarray:
    yy, xx = np.ogrid[:size, :size]
    cx = cy = (size - 1) / 2
    h = size * half
    return (np.abs(xx - cx) < h) & (np.abs(yy - cy) < h)


def ink_mask_to_rgba(ink: np.ndarray, ink_rgb: tuple[int, int, int]) -> Image.Image:
    """ink: 0 = stroke, 255 = paper/transparent."""
    h, w = ink.shape
    rgba = np.zeros((h, w, 4), dtype=np.uint8)
    stroke = ink < 128
    rgba[stroke, 0] = ink_rgb[0]
    rgba[stroke, 1] = ink_rgb[1]
    rgba[stroke, 2] = ink_rgb[2]
    rgba[stroke, 3] = 255
    return Image.fromarray(rgba, "RGBA")


def _b64_png(im: Image.Image) -> str:
    buf = io.BytesIO()
    im.save(buf, format="PNG", optimize=True)
    return base64.b64encode(buf.getvalue()).decode()


def _render_svg(svg: str, render_size: int) -> Image.Image:
    with tempfile.NamedTemporaryFile(suffix=".svg", delete=False, mode="w") as sf:
        sf.write(svg)
        svg_path = sf.name
    png_path = svg_path.replace(".svg", ".png")
    try:
        subprocess.run(
            ["rsvg-convert", "-w", str(render_size), "-h", str(render_size), svg_path, "-o", png_path],
            check=True,
        )
        return Image.open(png_path).convert("RGB")
    finally:
        for p in (svg_path, png_path):
            if os.path.exists(p):
                os.remove(p)


def render_rubbing_cap_paths(
    path_markup: str,
    palette: Palette,
    *,
    plain_back: bool = False,
    render_size: int = RENDER_SIZE,
) -> Image.Image:
    geom = path_markup + RING + HOLE
    if plain_back:
        geom += PLAIN_INNER
    svg = (
        f'<svg xmlns="http://www.w3.org/2000/svg" '
        f'width="{render_size}" height="{render_size}" viewBox="0 0 {VIEW} {VIEW}">'
        f"{GENTLE_DEFS}"
        f'<rect width="{VIEW}" height="{VIEW}" fill="{palette.paper_hex}" filter="url(#paper)"/>'
        f'<g filter="url(#ink)" fill="{palette.ink_hex}" stroke="{palette.ink_hex}" '
        f'stroke-linecap="round" stroke-linejoin="round">{geom}</g></svg>'
    )
    return _render_svg(svg, render_size)


def render_rubbing_cap(
    glyph_ink: np.ndarray | None,
    palette: Palette,
    *,
    plain_back: bool = False,
    extra_paths: str = "",
    render_size: int = RENDER_SIZE,
) -> Image.Image:
    ink_layer = ""
    if glyph_ink is not None and glyph_ink.size > 0:
        glyph_rgba = ink_mask_to_rgba(glyph_ink, palette.ink_rgb)
        glyph_rgba = glyph_rgba.resize((VIEW, VIEW), Image.LANCZOS)
        ink_layer = (
            f'<image x="0" y="0" width="{VIEW}" height="{VIEW}" '
            f'preserveAspectRatio="none" '
            f'xlink:href="data:image/png;base64,{_b64_png(glyph_rgba)}"/>'
        )
    geom = RING + HOLE
    if plain_back:
        geom += PLAIN_INNER
    geom += extra_paths
    svg = (
        f'<svg xmlns="http://www.w3.org/2000/svg" '
        f'xmlns:xlink="http://www.w3.org/1999/xlink" '
        f'width="{render_size}" height="{render_size}" viewBox="0 0 {VIEW} {VIEW}">'
        f"{GENTLE_DEFS}"
        f'<rect width="{VIEW}" height="{VIEW}" fill="{palette.paper_hex}" filter="url(#paper)"/>'
        f'<g filter="url(#ink)">{ink_layer}</g>'
        f'<g filter="url(#ink)" fill="{palette.ink_hex}" stroke="{palette.ink_hex}" '
        f'stroke-linecap="round" stroke-linejoin="round">{geom}</g></svg>'
    )
    return _render_svg(svg, render_size)


def synth_plain_glyph_mask(coin_rgb: Image.Image, size: int = S) -> np.ndarray:
    from scipy import ndimage

    gray = np.asarray(coin_rgb.convert("L"), dtype=np.float32)
    gray = ndimage.gaussian_filter(gray, sigma=size * 0.04)
    cx = cy = (size - 1) / 2
    yy, xx = np.ogrid[:size, :size]
    r = np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2) / (size * 0.5)
    inner_mask = (r > 0.16) & (r < 0.78)
    norm = (gray - gray.min()) / max(gray.max() - gray.min(), 1e-6)
    wash = 255 - (norm * 22 * inner_mask.astype(np.float32))
    wash[~inner_mask] = 255
    wash = ndimage.gaussian_filter(wash, sigma=2)
    return wash.astype(np.uint8)
