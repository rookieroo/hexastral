"""Extract character bitmaps from CC0 coin photos for use as SVG image stamps.

Uses the best available source images per coin with improved preprocessing.
Extracts at original 1x resolution (from gen-huaxia.py's 1024² pipeline) with
better edge-preserving filters and adaptive thresholding.

Run: python3 extract-char-bitmaps.py
"""
from __future__ import annotations

import base64
import io
import json
import os
import importlib.util

import numpy as np
from PIL import Image
from scipy import ndimage

HERE = os.path.dirname(os.path.abspath(__file__))
SRC_DIR = os.path.join(HERE, "src")
CHAR_OUT = os.path.join(HERE, "dist", "char_bitmaps")
os.makedirs(CHAR_OUT, exist_ok=True)

S = 1024
SCALE = S / 600.0

CHAR_POS = {
    "banliang": [("right", 448, 302), ("left", 152, 302)],
    "wuzhu":    [("right", 448, 302), ("left", 152, 302)],
    "daquan":   [("top", 300, 118), ("bottom", 300, 492), ("right", 468, 302), ("left", 132, 302)],
    "kaiyuan":  [("top", 300, 118), ("bottom", 300, 492), ("right", 468, 302), ("left", 132, 302)],
    "daguan":   [("top", 300, 118), ("bottom", 300, 492), ("right", 468, 302), ("left", 132, 302)],
    "hongwu":   [("top", 300, 118), ("bottom", 300, 492), ("right", 468, 302), ("left", 132, 302)],
}


def load_gh():
    spec = importlib.util.spec_from_file_location("gen_huaxia", os.path.join(HERE, "gen-huaxia.py"))
    if spec is None or spec.loader is None:
        raise RuntimeError("cannot load gen-huaxia.py")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def extract_char_bitmap(coin_rgb: Image.Image, cx: int, cy: int, char_size: int, gamma: float = 1.0) -> bytes | None:
    """Extract a character as a clean ink-on-transparent PNG from a coin photo crop.

    Uses bilateral-filter-like edge-preserving smoothing, difference-of-Gaussians
    edge isolation, and adaptive thresholding for clean character strokes.
    """
    half = char_size // 2
    region = coin_rgb.crop((cx - half, cy - half, cx + half, cy + half))

    arr = np.asarray(region, dtype=np.float32)
    if gamma != 1.0:
        arr = 255 * (arr / 255) ** gamma
    gray = arr.mean(axis=2)

    # Edge-preserving denoise
    gray = ndimage.median_filter(gray, size=3)
    gray = ndimage.gaussian_filter(gray, sigma=1.8)

    # DoG: narrow captures stroke edges, wide captures surface illumination
    narrow = ndimage.gaussian_filter(gray, sigma=3.0)
    wide = ndimage.gaussian_filter(gray, sigma=12.0)
    dog = narrow - wide

    # Adaptive threshold: recessed characters are darker than surface
    thresh = np.percentile(dog, 22)
    mask = dog < thresh

    # Morphological cleanup
    mask = ndimage.binary_closing(mask, structure=np.ones((3, 3)), iterations=3)
    mask = ndimage.binary_opening(mask, structure=np.ones((3, 3)), iterations=2)

    # Keep only major components
    lbl, n = ndimage.label(mask)
    sizes = np.bincount(lbl.ravel())
    min_size = char_size * 3
    for i in range(1, n + 1):
        if sizes[i] < min_size:
            mask[lbl == i] = False

    if mask.sum() < 60:
        return None

    rgba = np.zeros((char_size, char_size, 4), dtype=np.uint8)
    rgba[mask] = [22, 17, 10, 255]

    img = Image.fromarray(rgba, 'RGBA')
    buf = io.BytesIO()
    img.save(buf, format='PNG', optimize=True)
    return buf.getvalue()


def bake_all() -> None:
    gh = load_gh()
    glyph_bitmaps = {}

    for cid, fname, _p, _r, obv_reg, _rr, gamma in gh.COINS:
        path = os.path.join(SRC_DIR, fname)
        if not os.path.exists(path):
            print(f"SKIP missing {fname}")
            continue

        full = Image.open(path).convert("RGB")
        obv_src = gh.region_crop(full, obv_reg)
        obv_box, _bas = gh.pick_coin(obv_src)
        if obv_box is None:
            print(f"SKIP no coin in {fname}")
            continue

        coin = gh.square_coin(obv_src, obv_box)
        coin_chars = {}
        char_size = int(120 * SCALE)

        for pos, x, y in CHAR_POS[cid]:
            px, py = int(x * SCALE), int(y * SCALE)
            png_bytes = extract_char_bitmap(coin, px, py, char_size, gamma)
            if png_bytes:
                fname_out = f"{cid}-{pos}.png"
                with open(os.path.join(CHAR_OUT, fname_out), 'wb') as f:
                    f.write(png_bytes)
                b64 = base64.b64encode(png_bytes).decode()
                coin_chars[pos] = f"data:image/png;base64,{b64}"
                print(f"  {cid}/{pos}: {len(png_bytes)//1024}KB")
            else:
                print(f"  WARN {cid}/{pos}: no content")

        if coin_chars:
            glyph_bitmaps[cid] = coin_chars
            print(f"baked {cid}: {len(coin_chars)} chars")

    out_json = os.path.join(HERE, "glyph_bitmaps.json")
    with open(out_json, "w") as f:
        json.dump(glyph_bitmaps, f)

    total = sum(len(v) for v in glyph_bitmaps.values())
    print(f"\nsaved {total} character bitmaps to {out_json}")


if __name__ == "__main__":
    bake_all()
