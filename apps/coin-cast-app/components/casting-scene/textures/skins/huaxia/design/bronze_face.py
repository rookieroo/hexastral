"""Shared dark-bronze coin face for huaxia design skins."""
from __future__ import annotations

import os
import subprocess

from PIL import Image, ImageEnhance, ImageFilter

SIZE = 1254
VIEW = 600

GROUND = "#080706"
FIELD_MID = "#141210"
FIELD_EDGE = "#1c1814"
RELIEF = "#d4bc82"
RELIEF_DIM = "#7a6344"
HOLE_STROKE = "#6a5838"
RIM_LIP = "#1e1a16"


def face_gradient_stops(rim_lip: bool) -> str:
    if rim_lip:
        return (
            f'<stop offset="0%" stop-color="{FIELD_MID}"/>'
            f'<stop offset="65%" stop-color="{FIELD_EDGE}"/>'
            f'<stop offset="82%" stop-color="#181512"/>'
            f'<stop offset="92%" stop-color="{RIM_LIP}"/>'
            f'<stop offset="100%" stop-color="{GROUND}"/>'
        )
    return (
        f'<stop offset="0%" stop-color="{FIELD_MID}"/>'
        f'<stop offset="70%" stop-color="{FIELD_EDGE}"/>'
        f'<stop offset="90%" stop-color="#12100e"/>'
        f'<stop offset="100%" stop-color="{GROUND}"/>'
    )


def defs(rim_lip: bool = False) -> str:
    stops = face_gradient_stops(rim_lip)
    return (
        "<defs>"
        f'<radialGradient id="face" cx="50%" cy="48%" r="50%">{stops}</radialGradient>'
        '<filter id="relief" x="-12%" y="-12%" width="124%" height="124%">'
        '<feGaussianBlur in="SourceAlpha" stdDeviation="1.2" result="blur"/>'
        '<feOffset in="blur" dx="0.8" dy="1.2" result="off"/>'
        '<feFlood flood-color="#000000" flood-opacity="0.45" result="shadow"/>'
        '<feComposite in="shadow" in2="off" operator="in" result="drop"/>'
        '<feMerge><feMergeNode in="drop"/><feMergeNode in="SourceGraphic"/></feMerge>'
        "</filter>"
        '<filter id="grain" x="0" y="0" width="100%" height="100%">'
        '<feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="2" seed="19" result="n"/>'
        '<feColorMatrix in="n" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.08 0"/>'
        '<feBlend in="SourceGraphic" in2="n" mode="multiply"/>'
        "</filter>"
        "</defs>"
    )


def disc() -> str:
    return f'<circle cx="300" cy="300" r="300" fill="url(#face)" filter="url(#grain)"/>'


def hole(
    x: float = 258,
    y: float = 258,
    w: float = 84,
    h: float = 84,
    stroke_w: float = 11,
) -> str:
    return (
        f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="{GROUND}" '
        f'stroke="{HOLE_STROKE}" stroke-width="{stroke_w}" stroke-linejoin="round"/>'
    )


def svg(inner: str, rim_lip: bool = False) -> str:
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" '
        f'xmlns:xlink="http://www.w3.org/1999/xlink" '
        f'width="{SIZE}" height="{SIZE}" viewBox="0 0 {VIEW} {VIEW}">'
        f"{defs(rim_lip)}"
        f'<rect width="{VIEW}" height="{VIEW}" fill="{GROUND}"/>'
        f"{disc()}"
        f'<g filter="url(#relief)" fill="{RELIEF}" stroke="{RELIEF}">{inner}</g></svg>'
    )


def rsvg(svg_text: str, out_path: str, tmp_dir: str) -> None:
    tmp = os.path.join(tmp_dir, "_coin.svg")
    with open(tmp, "w", encoding="utf-8") as f:
        f.write(svg_text)
    subprocess.run(
        ["rsvg-convert", "-w", str(SIZE), "-h", str(SIZE), tmp, "-o", out_path],
        check=True,
    )
    os.remove(tmp)


def patina(path: str) -> None:
    im = Image.open(path).convert("RGB")
    w, h = im.size
    noise = Image.effect_noise((w, h), 14).convert("L").filter(ImageFilter.GaussianBlur(0.7))
    grain = Image.merge("RGB", (noise, noise, noise))
    im = Image.blend(im, grain, 0.045)
    im = ImageEnhance.Contrast(im).enhance(1.08)
    im.save(path, optimize=True)
