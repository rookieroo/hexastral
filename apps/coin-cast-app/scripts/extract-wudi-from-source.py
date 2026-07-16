#!/usr/bin/env python3
"""
Extract photo-textured 五帝钱 faces from assets/coins/source.png.

Centers each coin on a calibrated 穿 (square hole), punches matching
transparent hole, builds 幕面 + bump.

  python3 apps/coin-cast-app/scripts/extract-wudi-from-source.py

Calibrate: open the crop, place hole_cx/cy on the 穿 center (fractions).
"""
from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets" / "coins" / "source.png"
FACES = ROOT / "assets" / "coins" / "faces"
OUT = 1024

# Crops verified to contain ONE full coin. hole_* = 穿 center / size in crop.
COINS: dict[str, dict] = {
    # hole_* tuned from rim-detector seed + visual QA on crop overlays
    "qin-banliang": {
        "crop": (210, 860, 520, 520),
        "hole_cx": 0.52,
        "hole_cy": 0.53,
        "hole_frac": 0.20,
        "note": "Qin Ban Liang",
    },
    "han-wuzhu": {
        "crop": (720, 900, 420, 420),
        "hole_cx": 0.46,
        "hole_cy": 0.50,
        "hole_frac": 0.28,
        "note": "Han Wu Zhu",
    },
    "tang-kaiyuan": {
        "crop": (40, 1410, 420, 420),
        "hole_cx": 0.52,
        "hole_cy": 0.58,
        "hole_frac": 0.22,
        "note": "Tang Kaiyuan",
    },
    "song-songyuan": {
        "crop": (460, 1445, 400, 400),
        "hole_cx": 0.46,
        "hole_cy": 0.50,
        "hole_frac": 0.28,
        "note": "Song Songyuan",
    },
    "ming-yongle": {
        "crop": (860, 1420, 420, 420),
        "hole_cx": 0.46,
        "hole_cy": 0.58,
        "hole_frac": 0.24,
        "note": "Ming Yongle",
    },
}




def soft_circle_mask(size: int, radius: float, feather: float) -> Image.Image:
    m = Image.new("L", (size, size), 0)
    draw = ImageDraw.Draw(m)
    c = size / 2
    draw.ellipse((c - radius, c - radius, c + radius, c + radius), fill=255)
    if feather > 0:
        m = m.filter(ImageFilter.GaussianBlur(radius=feather))
    return m


def punch_square(alpha: Image.Image, cx: float, cy: float, side: float) -> Image.Image:
    a = alpha.copy()
    draw = ImageDraw.Draw(a)
    half = side / 2
    draw.rectangle((cx - half, cy - half, cx + half, cy + half), fill=0)
    return a


def extract_aligned(
    rgb: np.ndarray,
    hole_cx_frac: float,
    hole_cy_frac: float,
    hole_frac: float,
) -> tuple[Image.Image, float]:
    h, w = rgb.shape[:2]
    hx = hole_cx_frac * w
    hy = hole_cy_frac * h
    hole_side = hole_frac * min(h, w)

    side = int(round(min(w, h) * 0.92))
    if side % 2:
        side += 1

    canvas = np.zeros((side, side, 3), dtype=np.float32)
    src_x0 = int(round(hx - side / 2))
    src_y0 = int(round(hy - side / 2))
    y_src0 = max(0, src_y0)
    x_src0 = max(0, src_x0)
    y_src1 = min(h, src_y0 + side)
    x_src1 = min(w, src_x0 + side)
    y_dst0 = y_src0 - src_y0
    x_dst0 = x_src0 - src_x0
    canvas[y_dst0 : y_dst0 + (y_src1 - y_src0), x_dst0 : x_dst0 + (x_src1 - x_src0)] = rgb[
        y_src0:y_src1, x_src0:x_src1
    ]

    im = Image.fromarray(np.clip(canvas, 0, 255).astype(np.uint8), "RGB")
    im = im.resize((OUT, OUT), Image.Resampling.LANCZOS)
    hole_out = hole_side * (OUT / side)

    mask = soft_circle_mask(OUT, OUT * 0.492, OUT * 0.008)
    mask = punch_square(mask, OUT / 2, OUT / 2, hole_out)

    rgba = im.convert("RGBA")
    rgba.putalpha(mask)

    arr = np.asarray(rgba).astype(np.float32)
    rgb_part = arr[..., :3]
    alpha = arr[..., 3]
    opaque = alpha > 128
    mid = rgb_part[opaque].mean() if opaque.any() else rgb_part.mean()
    rgb_part = (rgb_part - mid) * 1.06 + mid * 1.01
    arr[..., :3] = np.clip(rgb_part, 0, 255)
    return Image.fromarray(arr.astype(np.uint8), "RGBA"), hole_out


def make_reverse(obverse: Image.Image, hole_side: float) -> Image.Image:
    rgb = obverse.convert("RGB")
    filled = rgb.copy()
    draw = ImageDraw.Draw(filled)
    c = OUT / 2
    half = hole_side / 2
    pix = np.asarray(rgb)
    sy = int(np.clip(c - hole_side, 0, OUT - 1))
    sample = pix[sy, int(c)].astype(np.int32)
    fill_color = tuple(int(x) for x in np.clip(sample * 0.55, 0, 80))
    draw.rectangle((c - half, c - half, c + half, c + half), fill=fill_color)

    wiped = filled.filter(ImageFilter.MedianFilter(size=9))
    wiped = wiped.filter(ImageFilter.GaussianBlur(radius=28))
    warr = np.asarray(wiped).astype(np.float32) * 0.9
    wiped = Image.fromarray(np.clip(warr, 0, 255).astype(np.uint8), "RGB")

    rim_mask = soft_circle_mask(OUT, OUT * 0.492, 2)
    inner = soft_circle_mask(OUT, OUT * 0.36, 0)
    ring = np.clip(
        np.asarray(rim_mask).astype(np.float32) - np.asarray(inner).astype(np.float32),
        0,
        255,
    ).astype(np.uint8)
    base = wiped.copy()
    base.paste(rgb, mask=Image.fromarray(ring, "L"))

    draw = ImageDraw.Draw(base, "RGBA")
    mark = (16, 14, 10, 150)
    star_y = int(OUT * 0.28)
    moon_y = int(OUT * 0.72)
    mr = int(OUT * 0.024)
    draw.ellipse((c - mr, star_y - mr, c + mr, star_y + mr), fill=mark)
    draw.arc(
        (c - mr * 1.35, moon_y - mr, c + mr * 1.35, moon_y + mr),
        start=200,
        end=340,
        fill=mark,
        width=max(3, mr // 2),
    )

    alpha = soft_circle_mask(OUT, OUT * 0.492, OUT * 0.008)
    alpha = punch_square(alpha, c, c, hole_side)
    out = base.convert("RGBA")
    out.putalpha(alpha)
    return out


def make_bump(obverse: Image.Image) -> Image.Image:
    g = obverse.convert("L").filter(ImageFilter.GaussianBlur(radius=0.6))
    arr = np.asarray(g).astype(np.float32)
    lo, hi = np.percentile(arr, 2), np.percentile(arr, 98)
    if hi > lo:
        arr = (arr - lo) / (hi - lo) * 255
    arr = 255 / (1 + np.exp(-(np.clip(arr, 0, 255) - 128) / 28))
    return Image.fromarray(arr.astype(np.uint8), "L")


def main() -> None:
    FACES.mkdir(parents=True, exist_ok=True)
    src = Image.open(SOURCE).convert("RGB")
    src_a = np.asarray(src).astype(np.float32)

    for coin_id, defn in COINS.items():
        x, y, w, h = defn["crop"]
        print(f"→ {coin_id}: {defn['note']}")
        crop_rgb = src_a[y : y + h, x : x + w].copy()
        print(
            f"  hole=({defn['hole_cx']:.2f},{defn['hole_cy']:.2f}) "
            f"frac={defn['hole_frac']:.2f}"
        )

        obverse, hole_out = extract_aligned(
            crop_rgb,
            defn["hole_cx"],
            defn["hole_cy"],
            defn["hole_frac"],
        )
        reverse = make_reverse(obverse, hole_out)
        bump = make_bump(obverse)

        obverse.save(FACES / f"{coin_id}.png", optimize=True)
        reverse.save(FACES / f"{coin_id}-back.png", optimize=True)
        bump.save(FACES / f"{coin_id}-bump.png", optimize=True)

        a = np.asarray(obverse)[..., 3]
        print(
            f"  alpha center={a[OUT // 2, OUT // 2]} "
            f"body={a[OUT // 2, int(OUT * 0.30)]} "
            f"corner={a[8, 8]}"
        )

    print(f"done — aligned photo 五帝钱 @ {OUT}²")


if __name__ == "__main__":
    main()
