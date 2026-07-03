#!/usr/bin/env python3
"""华夏五枚 — 细线碑拓（tracing mask 骨架细化，非照片轮廓填充）。

Run: python3 gen-huaxia-hand-rubbing.py
"""
from __future__ import annotations

import json
import os
import sys

import numpy as np
from PIL import Image
from scipy import ndimage

HERE = os.path.dirname(os.path.abspath(__file__))
MASK_DIR = os.path.join(HERE, "dist", "tracing-masks")
CFG_PATH = os.path.join(HERE, "tracing_config.json")
OUT = os.path.join(HERE, "dist", "hand-rubbing")
PNG_OUT = os.path.join(HERE, "dist", "hand-rubbing-png")

MAX_JPEG = 500_000

sys.path.insert(0, HERE)
from rubbing_style import PALETTE_RUB, render_rubbing_cap  # noqa: E402

COINS = ["banliang", "wuzhu", "daquan", "kaiyuan", "daguan", "hongwu"]


def load_config() -> dict:
    with open(CFG_PATH, encoding="utf-8") as f:
        return json.load(f)


def morphological_skeleton(stroke: np.ndarray) -> np.ndarray:
    """stroke: True = ink. Returns 1px skeleton."""
    img = stroke.copy()
    skel = np.zeros_like(img, dtype=bool)
    element = ndimage.generate_binary_structure(2, 1)
    while img.any():
        eroded = ndimage.binary_erosion(img, structure=element)
        opened = ndimage.binary_dilation(eroded, structure=element)
        skel |= img & ~opened
        img = eroded
    return skel


def thin_mask(mask: np.ndarray) -> np.ndarray:
    stroke = mask < 128
    if not stroke.any():
        return mask
    skel = morphological_skeleton(stroke)
    if not skel.any():
        skel = ndimage.binary_erosion(stroke, iterations=2)
    # Slight thickening so strokes survive JPEG + small thumb
    skel = ndimage.binary_dilation(skel, iterations=1)
    return np.where(skel, 0, 255).astype(np.uint8)


def load_mask(coin_id: str, side: str) -> np.ndarray:
    path = os.path.join(MASK_DIR, f"{coin_id}-{side}.png")
    if not os.path.isfile(path):
        raise FileNotFoundError(f"missing {path}")
    return np.asarray(Image.open(path).convert("L"))


def save_cap(im: Image.Image, base: str, side: str) -> None:
    os.makedirs(OUT, exist_ok=True)
    os.makedirs(PNG_OUT, exist_ok=True)
    png_path = os.path.join(PNG_OUT, f"{base}-{side}.png")
    jpg_path = os.path.join(OUT, f"{base}-{side}.jpg")
    im.save(png_path, format="PNG", optimize=True)
    for q in range(94, 58, -2):
        im.save(jpg_path, format="JPEG", quality=q, optimize=True, progressive=True)
        if os.path.getsize(jpg_path) <= MAX_JPEG:
            break
    print(f"  {base}-{side}.jpg  {os.path.getsize(jpg_path) // 1024}KB")


def main() -> None:
    cfg = load_config()
    print("huaxia hand-rubbing (skeleton from tracing masks)")
    for coin_id in COINS:
        print(f"  {coin_id}")
        yang = thin_mask(load_mask(coin_id, "yang"))
        save_cap(render_rubbing_cap(yang, PALETTE_RUB), coin_id, "yang")
        rev = cfg[coin_id].get("reverse", "pair")
        yin_src = load_mask(coin_id, "yin")
        yin_mask = thin_mask(yin_src) if rev != "su" else yin_src
        plain = rev in ("su", "pair")
        save_cap(render_rubbing_cap(yin_mask, PALETTE_RUB, plain_back=plain), coin_id, "yin")
    print(f"done → {OUT}/")


if __name__ == "__main__":
    main()
