"""Bake photo-based 碑拓 (ink-rubbing) caps from the same PD/CC0 coin photos
as gen-huaxia.py, but output duotone ink-on-paper instead of realistic bronze.

Run: python3 gen-huaxia-rubbing.py
"""
from __future__ import annotations

import os
import sys
import importlib.util

import numpy as np
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter
from scipy import ndimage

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "dist", "rubbing")
SRC = os.path.join(HERE, "src")
os.makedirs(OUT, exist_ok=True)

S = 1024
MAX_BYTES = 500 * 1024
PAPER = (231, 221, 199)  # #e7ddc7 xuan paper
INK = (22, 17, 10)       # #16110a ink


def load_gen_huaxia():
    spec = importlib.util.spec_from_file_location("gen_huaxia", os.path.join(HERE, "gen-huaxia.py"))
    if spec is None or spec.loader is None:
        raise RuntimeError("cannot load gen-huaxia.py")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def paper_noise(size: int, seed: int = 42) -> np.ndarray:
    rng = np.random.default_rng(seed)
    noise = rng.random((size, size), dtype=np.float32)
    noise = ndimage.gaussian_filter(noise, sigma=4)
    noise = (noise - noise.min()) / (noise.max() - noise.min())
    return noise * 0.06  # 6% modulation


def extract_glyphs(coin_rgb: Image.Image) -> Image.Image:
    """Extract relief glyphs from a coin photo as grayscale ink layer."""
    gray = np.asarray(coin_rgb.convert("L"), dtype=np.float32)

    # Local adaptive threshold — the coin has 3D relief, glyphs are darker recesses
    blurred = ndimage.gaussian_filter(gray, sigma=12)
    detail = gray - blurred
    # Normalize detail
    p2, p98 = np.percentile(detail, 2), np.percentile(detail, 98)
    if p98 > p2:
        detail = np.clip((detail - p2) / (p98 - p2), 0, 1)

    # Invert: recessed glyphs should be dark (ink), raised areas light (paper)
    glyph = 1.0 - detail

    # Threshold
    glyph_thresh = np.clip(glyph, 0.2, 0.9)
    glyph_norm = (glyph_thresh - 0.2) / 0.7

    return Image.fromarray((glyph_norm * 255).astype(np.uint8))


def finish_rubbing(coin_rgb: Image.Image) -> Image.Image:
    """Convert a coin photo crop to a 碑拓 ink-rubbing texture."""

    # Brighten the source for better glyph extraction
    arr = np.asarray(coin_rgb, dtype=np.float32)
    gamma = 0.55
    arr = 255 * (arr / 255) ** gamma
    bright = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))

    glyphs = extract_glyphs(bright)
    glyph_arr = np.asarray(glyphs, dtype=np.float32) / 255.0

    # Paper base with noise
    paper = np.ones((S, S, 3), dtype=np.float32)
    noise = paper_noise(S)
    for c in range(3):
        paper[..., c] = PAPER[c] / 255.0
        paper[..., c] += noise * 0.5
        paper[..., c] = np.clip(paper[..., c], 0, 1)

    # Ink layer: blend between paper (1) and ink (0)
    ink_weight = 0.7
    ink_map = 1.0 - glyph_arr * ink_weight
    ink_map = np.clip(ink_map, 0, 1)

    out = np.zeros_like(paper)
    for c in range(3):
        out[..., c] = paper[..., c] * ink_map + (INK[c] / 255.0) * (1 - ink_map)

    out = np.clip(out * 255, 0, 255).astype(np.uint8)
    result = Image.fromarray(out)

    # Circular coin mask
    circ = Image.new("L", (S, S), 0)
    ImageDraw.Draw(circ).ellipse([2, 2, S - 3, S - 3], fill=255)
    bg = Image.new("RGB", (S, S), PAPER)
    bg.paste(result, (0, 0), circ)

    # Punch square hole
    hole = (int(S * 0.37), int(S * 0.37), int(S * 0.63), int(S * 0.63))
    ImageDraw.Draw(bg).rectangle(hole, fill=PAPER)

    # Subtle edge distress (金石残破)
    bg = bg.filter(ImageFilter.UnsharpMask(radius=1.2, percent=80, threshold=3))

    return bg


def save_cap(im: Image.Image, path: str) -> None:
    jpath = path.rsplit(".", 1)[0] + ".jpg"
    for q in (88, 84, 80, 76, 72):
        im.save(jpath, format="JPEG", quality=q, optimize=True, progressive=True)
        size = os.path.getsize(jpath)
        if size <= MAX_BYTES:
            print(f"  {os.path.basename(jpath)} {size // 1024}KB (q{q})")
            return
    print(f"  WARN {os.path.basename(jpath)} {os.path.getsize(jpath) // 1024}KB")


def bake_all() -> None:
    gh = load_gen_huaxia()
    for cid, fname, _, _, obv_reg, _, gamma in gh.COINS:
        path = os.path.join(SRC, fname)
        if not os.path.exists(path):
            print("SKIP missing", fname)
            continue

        full = Image.open(path).convert("RGB")
        obv_src = gh.region_crop(full, obv_reg)
        obv_box, _ = gh.pick_coin(obv_src)
        if obv_box is None:
            print("SKIP no coin", fname)
            continue

        obv = gh.square_coin(obv_src, obv_box)
        if gamma != 1.0:
            arr = np.array(obv, dtype=float)
            arr = 255 * (arr / 255) ** gamma
            obv = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))

        yang = finish_rubbing(obv)
        save_cap(yang, os.path.join(OUT, f"{cid}-yang.png"))
        print(f"baked rubbing {cid}")

    print("done ->", OUT)


if __name__ == "__main__":
    bake_all()
