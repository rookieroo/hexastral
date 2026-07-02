"""Extract character bitmaps from CC0 coin photos for use as SVG image stamps.

Instead of tracing contours (which produces noisy paths from corroded coins),
this extracts clean binary character masks from the real coin photos and embeds
them as data URIs in the SVG. Result: authentic character shapes without path noise.

Run: python3 extract-char-bitmaps.py
"""
from __future__ import annotations

import base64
import io
import json
import os

import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

HERE = os.path.dirname(os.path.abspath(__file__))
SRC_DIR = os.path.join(HERE, "src")
CHAR_OUT = os.path.join(HERE, "dist", "char_bitmaps")
os.makedirs(CHAR_OUT, exist_ok=True)


def load_gh():
    import importlib.util
    spec = importlib.util.spec_from_file_location("gen_huaxia", os.path.join(HERE, "gen-huaxia.py"))
    if spec is None or spec.loader is None:
        raise RuntimeError("cannot load gen-huaxia.py")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def extract_char_bitmap(coin_rgb: Image.Image, cx: int, cy: int, char_size: int = 160, gamma: float = 1.0) -> bytes | None:
    """Extract a character as a clean binary ink-on-transparent PNG.

    Returns PNG bytes (data URI ready) or None if extraction fails.
    """
    half = char_size // 2
    region = coin_rgb.crop((cx - half, cy - half, cx + half, cy + half))

    arr = np.asarray(region, dtype=np.float32)
    if gamma != 1.0:
        arr = 255 * (arr / 255) ** gamma
    gray = arr.mean(axis=2)

    # Edge-preserving smooth
    gray = ndimage.median_filter(gray, size=3)
    gray = ndimage.gaussian_filter(gray, sigma=2.0)

    # DoG to isolate character edges
    narrow = ndimage.gaussian_filter(gray, sigma=2.5)
    wide = ndimage.gaussian_filter(gray, sigma=15.0)
    dog = narrow - wide

    # Threshold: character recesses are darker than surface
    thresh = np.percentile(dog, 30)
    mask = dog < thresh

    # Clean up
    mask = ndimage.binary_closing(mask, iterations=2)
    mask = ndimage.binary_opening(mask, iterations=2)

    # Remove small noise specks (< 1% of region)
    lbl, n = ndimage.label(mask)
    sizes = np.bincount(lbl.ravel())
    for i in range(1, n + 1):
        if sizes[i] < char_size * 2:
            mask[lbl == i] = False

    # Check if we have any content
    if mask.sum() < 20:
        return None

    # Invert: ink=black (opaque), paper=white (transparent)
    rgba = np.zeros((char_size, char_size, 4), dtype=np.uint8)
    rgba[mask] = [22, 17, 10, 255]  # ink color, fully opaque

    img = Image.fromarray(rgba, 'RGBA')
    buf = io.BytesIO()
    img.save(buf, format='PNG', optimize=True)
    return buf.getvalue()


def bake_all() -> None:
    gh = load_gh()
    glyph_bitmaps = {}

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
        S = coin.width  # 1024
        scale = S / 600.0
        char_size = int(120 * scale)  # ~205

        coin_chars = {}

        if cid in ("banliang", "wuzhu"):
            positions = [("right", 448, 302), ("left", 152, 302)]
        else:
            positions = [("top", 300, 118), ("bottom", 300, 492),
                         ("right", 468, 302), ("left", 132, 302)]

        for pos, x, y in positions:
            px, py = int(x * scale), int(y * scale)
            png_bytes = extract_char_bitmap(coin, px, py, char_size, gamma)
            if png_bytes:
                fname_out = f"{cid}-{pos}.png"
                with open(os.path.join(CHAR_OUT, fname_out), 'wb') as f:
                    f.write(png_bytes)
                b64 = base64.b64encode(png_bytes).decode()
                coin_chars[pos] = f"data:image/png;base64,{b64}"
                print(f"  {cid}/{pos}: {len(png_bytes)//1024}KB")

        if coin_chars:
            glyph_bitmaps[cid] = coin_chars

    out_json = os.path.join(HERE, "glyph_bitmaps.json")
    with open(out_json, "w") as f:
        json.dump(glyph_bitmaps, f)

    total = sum(len(v) for v in glyph_bitmaps.values())
    print(f"\nsaved {total} character bitmaps to {out_json}")


if __name__ == "__main__":
    bake_all()
