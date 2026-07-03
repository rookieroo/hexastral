#!/usr/bin/env python3
"""华夏五枚 — 碑拓线稿（凸起字 relief 提取 + 分层滤镜 + 矢量廓/方孔）。

Run: python3 gen-huaxia-tracing.py
"""
from __future__ import annotations

import json
import os
import sys

import numpy as np
from PIL import Image, ImageOps
from scipy import ndimage

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "src")
OUT = os.path.join(HERE, "dist", "tracing")
PNG_OUT = os.path.join(HERE, "dist", "tracing-png")
MASK_OUT = os.path.join(HERE, "dist", "tracing-masks")
CFG_PATH = os.path.join(HERE, "tracing_config.json")

S = 1024
MAX_JPEG = 500_000

sys.path.insert(0, HERE)
from rubbing_style import (  # noqa: E402
    PALETTE_RUB,
    field_mask,
    hole_exclusion,
    render_rubbing_cap,
    synth_plain_glyph_mask,
)

COINS = [
    ("banliang", "半两", "秦"),
    ("wuzhu", "五铢", "汉"),
    ("daquan", "大泉五十", "新莽"),
    ("kaiyuan", "开元通宝", "唐"),
    ("daguan", "大观通宝", "宋"),
    ("hongwu", "洪武通宝", "明"),
]


def load_config() -> dict:
    with open(CFG_PATH, encoding="utf-8") as f:
        return json.load(f)


def pick_coin(path: str, crop: tuple[float, float, float, float] | None) -> Image.Image:
    im = Image.open(path).convert("RGB")
    if crop is not None:
        w, h = im.size
        x0, y0, x1, y1 = crop
        im = im.crop((int(x0 * w), int(y0 * h), int(x1 * w), int(y1 * h)))
    return ImageOps.fit(im, (S, S), Image.LANCZOS, centering=(0.5, 0.5))


def clean_stroke_mask(stroke: np.ndarray, min_pixels: int = 120) -> np.ndarray:
    """Keep meaningful connected components; drop speckle."""
    lbl, n = ndimage.label(stroke)
    kept = np.zeros_like(stroke, dtype=bool)
    for i in range(1, n + 1):
        comp = lbl == i
        if comp.sum() >= min_pixels:
            kept |= comp
    kept = ndimage.binary_closing(kept, iterations=2)
    kept = ndimage.binary_opening(kept, iterations=1)
    return kept


def extract_glyph_mask(
    coin: Image.Image,
    *,
    gamma: float,
    ink_percentile: float,
    stroke_width: int,
    extract_mode: str = "relief",
) -> np.ndarray:
    """Return mask: 0 = ink stroke, 255 = paper."""
    gray = np.asarray(coin.convert("L"), dtype=np.float32)
    if gamma != 1.0:
        gray = np.power(np.clip(gray / 255.0, 0, 1), gamma) * 255.0

    roi = field_mask(S, 0.20, 0.80)
    hole = hole_exclusion(S)

    if extract_mode == "trace":
        # Pre-made rubbing / high-contrast trace photo: dark glyphs
        blur = ndimage.gaussian_filter(gray, sigma=2.5)
        relief = blur - gray
        thr = np.percentile(relief[roi], ink_percentile)
        stroke = relief >= thr
    else:
        # Bronze coin photo: raised characters catch light → brighter than field
        blur = ndimage.gaussian_filter(gray, sigma=4.0)
        relief = gray - blur
        thr = np.percentile(relief[roi], 100.0 - ink_percentile)
        stroke = relief >= thr

    stroke &= roi
    stroke &= ~hole
    stroke = clean_stroke_mask(stroke)

    # Safety: never let >14% of the annulus become ink (was causing inverted dark coins)
    for _ in range(6):
        if stroke[roi].mean() <= 0.14:
            break
        stroke = ndimage.binary_erosion(stroke, iterations=1)

    ink = np.where(stroke, 0, 255).astype(np.uint8)
    if stroke_width > 1:
        ink = ndimage.minimum_filter(ink, size=stroke_width)
    return ink


def save_mask(mask: np.ndarray, base: str, side: str) -> None:
    os.makedirs(MASK_OUT, exist_ok=True)
    Image.fromarray(mask).save(os.path.join(MASK_OUT, f"{base}-{side}.png"))


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


def resolve_src(cfg: dict) -> str:
    primary = os.path.join(SRC, cfg["src"])
    if os.path.isfile(primary):
        return primary
    fb = cfg.get("fallback_src")
    if fb:
        path = os.path.join(SRC, fb)
        if os.path.isfile(path):
            return path
    raise FileNotFoundError(f"no source for {cfg['src']}")


def bake_coin(coin_id: str, cfg: dict) -> None:
    src_path = resolve_src(cfg)
    obv_crop = tuple(cfg["obv_crop"]) if cfg.get("obv_crop") else None
    rev_crop = tuple(cfg["rev_crop"]) if cfg.get("rev_crop") else None
    mode = cfg.get("extract_mode", "relief")

    obv_rgb = pick_coin(src_path, obv_crop)
    yang_mask = extract_glyph_mask(
        obv_rgb,
        gamma=cfg.get("gamma", 1.0),
        ink_percentile=cfg.get("ink_percentile", 18),
        stroke_width=cfg.get("stroke_width", 2),
        extract_mode=mode,
    )
    save_mask(yang_mask, coin_id, "yang")
    save_cap(render_rubbing_cap(yang_mask, PALETTE_RUB), coin_id, "yang")

    rev_type = cfg.get("reverse", "pair")
    if rev_type == "su":
        plain_mask = synth_plain_glyph_mask(obv_rgb)
        save_mask(plain_mask, coin_id, "yin")
        save_cap(render_rubbing_cap(plain_mask, PALETTE_RUB, plain_back=True), coin_id, "yin")
    else:
        rev_rgb = pick_coin(src_path, rev_crop)
        yin_mask = extract_glyph_mask(
            rev_rgb,
            gamma=cfg.get("gamma", 1.0),
            ink_percentile=cfg.get("yin_percentile", cfg.get("ink_percentile", 18) + 4),
            stroke_width=cfg.get("yin_stroke_width", 1),
            extract_mode=mode,
        )
        save_mask(yin_mask, coin_id, "yin")
        save_cap(render_rubbing_cap(yin_mask, PALETTE_RUB), coin_id, "yin")


def main() -> None:
    cfg_all = load_config()
    print("huaxia tracing (relief extract + gentle filters)")
    for coin_id, _, _ in COINS:
        if coin_id not in cfg_all:
            continue
        print(f"  {coin_id}")
        bake_coin(coin_id, cfg_all[coin_id])
    print(f"done → {OUT}/")


if __name__ == "__main__":
    main()
