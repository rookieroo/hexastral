#!/usr/bin/env python3
"""华夏五枚 — 印章（从 tracing-masks 用 SVG 朱砂色盘重渲）。

Run: python3 gen-seal-from-tracing.py
Requires: gen-huaxia-tracing.py (writes dist/tracing-masks/).
"""
from __future__ import annotations

import json
import os
import sys

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
MASK_DIR = os.path.join(HERE, "dist", "tracing-masks")
OUT = os.path.join(HERE, "dist", "seal-photo")
PNG_OUT = os.path.join(HERE, "dist", "seal-png")
CFG_PATH = os.path.join(HERE, "tracing_config.json")

MAX_JPEG = 500_000

sys.path.insert(0, HERE)
from rubbing_style import PALETTE_SEAL, render_rubbing_cap  # noqa: E402

COINS = ["banliang", "wuzhu", "daquan", "kaiyuan", "daguan", "hongwu"]


def load_config() -> dict:
    with open(CFG_PATH, encoding="utf-8") as f:
        return json.load(f)


def load_mask(coin_id: str, side: str) -> np.ndarray:
    path = os.path.join(MASK_DIR, f"{coin_id}-{side}.png")
    if not os.path.isfile(path):
        raise FileNotFoundError(f"missing mask {path} — run gen-huaxia-tracing.py first")
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
    kb = os.path.getsize(jpg_path) // 1024
    print(f"  {base}-{side}.jpg  {kb}KB")


def main() -> None:
    cfg = load_config()
    print("huaxia seal (SVG palette #9c2a1c / #faf5ee)")
    for coin_id in COINS:
        for side in ("yang", "yin"):
            mask = load_mask(coin_id, side)
            plain = side == "yin" and cfg[coin_id].get("reverse") == "su"
            seal = render_rubbing_cap(mask, PALETTE_SEAL, plain_back=plain)
            save_cap(seal, coin_id, side)
    print(f"done → {OUT}/")


if __name__ == "__main__":
    main()
