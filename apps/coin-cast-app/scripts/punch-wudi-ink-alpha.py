#!/usr/bin/env python3
"""Punch soft circular rim + square 穿 alpha, write bump for ink-wash faces."""

from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageOps


def soft_circle(size: int, radius: float, feather: float) -> Image.Image:
    m = Image.new("L", (size, size), 0)
    draw = ImageDraw.Draw(m)
    c = size / 2
    draw.ellipse((c - radius, c - radius, c + radius, c + radius), fill=255)
    if feather > 0:
        m = m.filter(ImageFilter.GaussianBlur(radius=feather))
    return m


def punch_square(alpha: Image.Image, side: float) -> Image.Image:
    a = alpha.copy()
    if side <= 0:
        return a
    draw = ImageDraw.Draw(a)
    c = alpha.size[0] / 2
    half = side / 2
    draw.rectangle((c - half, c - half, c + half, c + half), fill=0)
    return a


def apply_alpha(rgba: Image.Image, rim_frac: float, hole_frac: float) -> Image.Image:
    size = rgba.size[0]
    alpha = soft_circle(size, size * rim_frac, size * 0.006)
    alpha = punch_square(alpha, size * hole_frac)
    out = rgba.convert("RGBA")
    # Keep existing soft anti-alias from rsvg, then intersect
    existing = np.asarray(out.split()[-1]).astype(np.float32)
    mask = np.asarray(alpha).astype(np.float32) / 255.0
    combined = (existing * mask).astype(np.uint8)
    out.putalpha(Image.fromarray(combined, "L"))
    return out


def make_bump(face: Image.Image) -> Image.Image:
    g = face.convert("L").filter(ImageFilter.GaussianBlur(radius=0.5))
    arr = np.asarray(g).astype(np.float32)
    alpha = np.asarray(face)[..., 3]
    mask = alpha > 16
    if mask.any():
        lo, hi = np.percentile(arr[mask], (4, 96))
        if hi > lo:
            arr = (arr - lo) / (hi - lo) * 255
    arr = np.clip(arr, 0, 255)
    arr = 255 / (1 + np.exp(-(arr - 128) / 24))
    return ImageOps.autocontrast(Image.fromarray(arr.astype(np.uint8), "L"), cutoff=2)


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--obverse", required=True)
    p.add_argument("--reverse", required=True)
    p.add_argument("--out-prefix", required=True)
    p.add_argument("--rim-frac", type=float, default=0.453)
    p.add_argument("--hole-frac", type=float, default=0.195)
    args = p.parse_args()

    prefix = Path(args.out_prefix)
    ob = apply_alpha(Image.open(args.obverse), args.rim_frac, args.hole_frac)
    bk = apply_alpha(Image.open(args.reverse), args.rim_frac, args.hole_frac)
    bump = make_bump(ob)

    ob.save(f"{prefix}.png", optimize=True)
    bk.save(f"{prefix}-back.png", optimize=True)
    bump.save(f"{prefix}-bump.png", optimize=True)

    a = np.asarray(ob)[..., 3]
    h, w = a.shape
    print(
        f"  punch alpha center={a[h // 2, w // 2]} "
        f"body={a[h // 2, int(w * 0.30)]} corner={a[8, 8]}"
    )


if __name__ == "__main__":
    main()
