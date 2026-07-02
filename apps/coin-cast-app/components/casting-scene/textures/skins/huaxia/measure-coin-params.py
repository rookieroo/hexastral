"""Measure coin geometry and character positions from reference photos.

Extracts parametric measurements (proportions, positions, sizes) from
each coin's reference photo. These measurements drive clean SVG rendering
— true 临摹 (study → understand → redraw), not mechanical pixel tracing.

Run: python3 measure-coin-params.py
"""
from __future__ import annotations

import json
import os
import importlib.util

import numpy as np
from PIL import Image
from scipy import ndimage

HERE = os.path.dirname(os.path.abspath(__file__))
SRC_DIR = os.path.join(HERE, "src")
OUT = os.path.join(HERE, "coin_params.json")


def load_gh():
    spec = importlib.util.spec_from_file_location("gen_huaxia", os.path.join(HERE, "gen-huaxia.py"))
    if spec is None or spec.loader is None:
        raise RuntimeError("cannot load gen-huaxia.py")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def measure_coin(coin_rgb: Image.Image) -> dict:
    """Extract parametric measurements from a coin image.

    All values normalized to coin radius = 1.0 for use in SVG viewBox.
    """
    arr = np.asarray(coin_rgb, dtype=np.float32)
    gray = arr.mean(axis=2)
    h, w = gray.shape

    # Find coin center and radius via brightness gradient
    # The coin is brighter than the dark background
    yy, xx = np.ogrid[:h, :w]
    cx, cy = w // 2, h // 2

    # Approximate coin radius: find where brightness drops at the rim
    # Scan outward from center
    center_bright = gray[cy - 20 : cy + 20, cx - 20 : cx + 20].mean()
    bg_bright = min(gray[:5, :5].mean(), gray[-5:, -5:].mean(),
                    gray[:5, -5:].mean(), gray[-5:, :5].mean())

    thresh = (center_bright + bg_bright) / 2
    coin_mask = gray > thresh if center_bright > bg_bright else gray < thresh

    coin_mask = ndimage.binary_fill_holes(coin_mask)
    coin_mask = ndimage.binary_opening(coin_mask, iterations=2)

    # Find the largest connected component = the coin
    lbl, n = ndimage.label(coin_mask)
    sizes = np.bincount(lbl.ravel())
    largest = sizes[1:].argmax() + 1 if len(sizes) > 1 else 1
    coin = lbl == largest

    ys, xs = np.where(coin)
    if len(xs) < 100:
        # Fallback: use all bright pixels
        ys, xs = np.where(coin_mask)

    cx_real = xs.mean()
    cy_real = ys.mean()
    coin_radius = max(xs.max() - xs.min(), ys.max() - ys.min()) / 2

    # Normalize coordinates to coin_radius = 1.0
    scale = coin_radius

    # Find square hole
    hole_r = int(coin_radius * 0.35)
    hole_y0 = int(cy_real - hole_r)
    hole_y1 = int(cy_real + hole_r)
    hole_x0 = int(cx_real - hole_r)
    hole_x1 = int(cx_real + hole_r)

    hole_gray = gray[hole_y0:hole_y1, hole_x0:hole_x1]
    hole_thresh = np.percentile(hole_gray, 30)
    hole_mask = hole_gray < hole_thresh
    hole_mask = ndimage.binary_closing(hole_mask, iterations=2)

    hole_lbl, hole_n = ndimage.label(hole_mask)
    if hole_n > 0:
        hole_sizes = np.bincount(hole_lbl.ravel())
        hole_id = hole_sizes[1:].argmax() + 1 if len(hole_sizes) > 1 else 1
        hy, hx = np.where(hole_lbl == hole_id)
        hole_cx = (hx.mean() + hole_x0 - cx_real) / scale
        hole_cy = (hy.mean() + hole_y0 - cy_real) / scale
        hole_half = max(hx.max() - hx.min(), hy.max() - hy.min()) / 2 / scale
    else:
        hole_cx = 0
        hole_cy = 0
        hole_half = 0.22  # typical

    # Find character bounding boxes via DoG edges
    narrow = ndimage.gaussian_filter(gray, sigma=3.0)
    wide = ndimage.gaussian_filter(gray, sigma=20.0)
    dog = narrow - wide
    char_thresh = np.percentile(dog, 5)
    char_mask = dog < char_thresh
    char_mask = ndimage.binary_opening(char_mask, structure=np.ones((3, 3)), iterations=2)

    char_lbl, char_n = ndimage.label(char_mask)
    char_sizes = np.bincount(char_lbl.ravel())

    # Group characters by position relative to center
    chars = []
    for i in range(1, char_n + 1):
        if char_sizes[i] < 80:
            continue
        chy, chx = np.where(char_lbl == i)
        ch_cx = (chx.mean() - cx_real) / scale
        ch_cy = (chy.mean() - cy_real) / scale
        ch_w = (chx.max() - chx.min()) / scale
        ch_h = (chy.max() - chy.min()) / scale

        # Only keep chars in the ring area (not hole, not rim)
        dist_from_center = np.sqrt(ch_cx**2 + ch_cy**2)
        if 0.15 < dist_from_center < 0.85:
            chars.append({
                "cx": round(ch_cx, 3),
                "cy": round(ch_cy, 3),
                "w": round(ch_w, 3),
                "h": round(ch_h, 3),
            })

    return {
        "hole_half": round(hole_half, 3),
        "hole_cx": round(hole_cx, 3),
        "hole_cy": round(hole_cy, 3),
        "chars": chars,
    }


def bake_all() -> None:
    gh = load_gh()
    params = {}

    for cid, fname, _, _, obv_reg, _, gamma in gh.COINS:
        path = os.path.join(SRC_DIR, fname)
        if not os.path.exists(path):
            print(f"SKIP missing {fname}")
            continue

        full = Image.open(path).convert("RGB")
        obv_src = gh.region_crop(full, obv_reg)
        obv_box, _ = gh.pick_coin(obv_src)
        if obv_box is None:
            print(f"SKIP no coin in {fname}")
            continue

        coin = gh.square_coin(obv_src, obv_box)
        p = measure_coin(coin)

        params[cid] = p
        chars_str = ", ".join(f"({c['cx']:.2f},{c['cy']:.2f})" for c in p["chars"])
        print(f"{cid}: hole={p['hole_half']:.3f}r, {len(p['chars'])} chars: {chars_str}")

    with open(OUT, "w") as f:
        json.dump(params, f, indent=2)
    print(f"\nsaved to {OUT}")


if __name__ == "__main__":
    bake_all()
