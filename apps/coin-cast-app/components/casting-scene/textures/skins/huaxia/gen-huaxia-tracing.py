"""Bake 碑拓 (ink-rubbing) cap textures from PD/CC0 coin photos via
edge-preserving line extraction — pure duotone (black ink on rice paper).

Method: bilateral filter → difference of Gaussians → adaptive threshold
→ morphological cleanup → stroke thickening. This suppresses surface
corrosion noise while keeping glyph edges sharp and readable.

Run: python3 gen-huaxia-tracing.py [threshold=0.5] [stroke_width=2]
"""
from __future__ import annotations

import os
import sys
import importlib.util

import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "dist", "tracing")
SRC_DIR = os.path.join(HERE, "src")
os.makedirs(OUT, exist_ok=True)

S = 1024
MAX_BYTES = 500 * 1024
PAPER = (250, 245, 235)
INK = (22, 17, 10)


def load_gh():
    spec = importlib.util.spec_from_file_location(
        "gen_huaxia", os.path.join(HERE, "gen-huaxia.py")
    )
    if spec is None or spec.loader is None:
        raise RuntimeError("cannot load gen-huaxia.py")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def extract_ink_mask(coin_rgb: Image.Image, gamma: float) -> np.ndarray:
    """DoG edge extraction: G(narrow) - G(wide).

    Keeps glyph-scale edges (stroke width), suppresses fine corrosion
    texture and slow illumination gradients.
    """
    arr = np.asarray(coin_rgb, dtype=np.float32)
    if gamma != 1.0:
        arr = 255 * (arr / 255) ** gamma
    gray = arr.mean(axis=2)

    narrow = ndimage.gaussian_filter(gray, sigma=2.5)
    wide = ndimage.gaussian_filter(gray, sigma=18.0)
    return narrow - wide


def mask_to_duotone(dog: np.ndarray, percentile: float = 10.0) -> np.ndarray:
    """Percentile threshold + aggressive cleanup → clean duotone.

    Uses Nth percentile of DoG as ink threshold. Strong morphological
    cleanup removes surface corrosion noise while keeping glyph strokes.
    """
    thresh = np.percentile(dog, percentile)
    ink = dog < thresh

    # Aggressive opening to kill isolated specks
    se3 = np.ones((3, 3))
    ink = ndimage.binary_opening(ink, structure=se3, iterations=3)

    # Remove small components
    lbl, n = ndimage.label(ink)
    sizes = np.bincount(lbl.ravel())
    min_size = 60
    for i in range(1, n + 1):
        if sizes[i] < min_size:
            ink[lbl == i] = False

    # Close to reconnect broken strokes
    ink = ndimage.binary_closing(ink, structure=se3, iterations=3)

    return np.where(ink, 0, 255).astype(np.uint8)


def thicken_strokes(ink: np.ndarray, width: int = 2) -> np.ndarray:
    """Dilate ink strokes to make them bolder and more readable."""
    if width <= 0:
        return ink
    ink_bool = ink == 0
    ink_bool = ndimage.binary_dilation(ink_bool, iterations=width)
    return np.where(ink_bool, 0, 255).astype(np.uint8)


def add_paper_texture(duotone: np.ndarray, seed: int = 42) -> np.ndarray:
    rng = np.random.default_rng(seed)
    h, w = duotone.shape
    noise = rng.random((h, w), dtype=np.float32)
    noise = ndimage.gaussian_filter(noise, sigma=3.5)
    noise = (noise - noise.min()) / (noise.max() - noise.min())
    paper = duotone == 255
    textured = duotone.astype(np.float32).copy()
    textured[paper] = 255 - noise[paper] * 10
    return np.clip(textured, 0, 255).astype(np.uint8)


def render_coin_ring(duotone: np.ndarray, coin_r: float = 0.48) -> np.ndarray:
    """Reinforce the coin's outer ring with a bold ink border."""
    h, w = duotone.shape
    yy, xx = np.ogrid[:h, :w]
    cx, cy = w // 2, h // 2
    dist = np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2)

    r_max = min(w, h) * coin_r
    ring = (dist >= r_max * 0.92) & (dist <= r_max * 0.97)
    duotone[ring] = 0

    inner = (dist >= r_max * 0.12) & (dist <= r_max * 0.17)
    duotone[inner] = 0

    return duotone


def punch_square_hole(im: Image.Image) -> Image.Image:
    S = im.width
    hole_margin = int(S * 0.34)
    hole_outer = int(S * 0.38)
    draw = ImageDraw.Draw(im)
    draw.rectangle(
        [hole_outer, hole_outer, S - hole_outer, S - hole_outer],
        outline=(INK[0], INK[1], INK[2]),
        width=6,
    )
    draw.rectangle(
        [hole_margin, hole_margin, S - hole_margin, S - hole_margin],
        fill=(255, 255, 255),
    )
    return im


def raster_to_rgb(duotone: np.ndarray) -> Image.Image:
    h, w = duotone.shape
    rgb = np.zeros((h, w, 3), dtype=np.uint8)
    paper_np = np.array(PAPER, dtype=np.float32) / 255.0
    ink_np = np.array(INK, dtype=np.float32) / 255.0

    df = duotone.astype(np.float32) / 255.0
    for c in range(3):
        rgb[..., c] = np.clip(
            df * paper_np[c] * 255 + (1 - df) * ink_np[c] * 255,
            0, 255,
        )
    return Image.fromarray(rgb.astype(np.uint8))


def trace_coin(coin_rgb: Image.Image, gamma: float, threshold: float, stroke_width: int) -> Image.Image:
    """Full pipeline: photo → DoG → adaptive threshold → clean → thicken → 碑拓."""

    dog = extract_ink_mask(coin_rgb, gamma)
    ink = mask_to_duotone(dog)
    ink = thicken_strokes(ink, width=stroke_width)
    ink = render_coin_ring(ink)
    ink = add_paper_texture(ink)

    out = raster_to_rgb(ink)

    circ = Image.new("L", (S, S), 0)
    r = int(S * 0.485)
    ImageDraw.Draw(circ).ellipse(
        [S // 2 - r, S // 2 - r, S // 2 + r, S // 2 + r], fill=255
    )
    bg = Image.new("RGB", (S, S), PAPER)
    bg.paste(out, (0, 0), circ)
    bg = punch_square_hole(bg)
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


# Tracing uses white-bg museum photos for cleaner DoG extraction.
# Separate from the main COINS config which uses dark-bg photos for realistic bronze.
TRACING_SOURCES = [
    ("banliang", "banliang.jpg", 1.0, "pair", (0.38, 0.25, 0.70, 0.74), (0.30, 0.25, 0.38, 0.74)),
    ("wuzhu", "wuzhu-trace.jpg", 1.0, "su", None, None),
    ("daquan", "daquan.jpg", 1.0, "pair", (0.0, 0.0, 0.5, 1.0), (0.5, 0.0, 1.0, 1.0)),
    ("kaiyuan", "kaiyuan-trace.jpg", 1.0, "su", None, None),
    ("daguan", "daguan.jpg", 0.58, "pair", (0.0, 0.0, 0.5, 1.0), (0.5, 0.0, 1.0, 1.0)),
    ("hongwu", "hongwu.jpg", 1.0, "pair", (0.0, 0.0, 0.5, 1.0), (0.5, 0.0, 1.0, 1.0)),
]


def bake_all(threshold: float = 5.0, stroke_width: int = 2) -> None:
    gh = load_gh()
    for cid, fname, gamma, rev_type, obv_reg, rev_reg in TRACING_SOURCES:
        path = os.path.join(SRC_DIR, fname)
        if not os.path.exists(path):
            print("SKIP missing", fname)
            continue

        full = Image.open(path).convert("RGB")

        obv_src = gh.region_crop(full, obv_reg)
        obv_box, _ = gh.pick_coin(obv_src)
        if obv_box is None:
            print("SKIP no coin in", fname)
            continue
        obv = gh.square_coin(obv_src, obv_box)

        yang = trace_coin(obv, gamma, threshold, stroke_width)
        save_cap(yang, os.path.join(OUT, f"{cid}-yang.png"))

        if rev_type == "pair" and rev_reg is not None:
            rev_src = gh.region_crop(full, rev_reg)
            rev_box, _ = gh.pick_coin(rev_src)
            if rev_box is not None:
                rvs = gh.square_coin(rev_src, rev_box)
                yin = trace_coin(rvs, gamma, threshold, stroke_width)
                save_cap(yin, os.path.join(OUT, f"{cid}-yin.png"))
                print(f"traced {cid} (obverse + reverse)")
                continue

        yin = trace_coin(obv, gamma, threshold, stroke_width)
        save_cap(yin, os.path.join(OUT, f"{cid}-yin.png"))
        print(f"traced {cid} (obverse {'+ reverse' if rev_type == 'pair' else 'x2'} )")

    print("done ->", OUT)


if __name__ == "__main__":
    thresh = float(sys.argv[1]) if len(sys.argv) > 1 else 0.5
    sw = int(sys.argv[2]) if len(sys.argv) > 2 else 2
    bake_all(thresh, sw)
