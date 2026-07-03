"""Hand-trace character glyphs from PD/CC0 coin photos → SVG paths.

For each coin, extract character contours from the real coin photo,
convert to SVG path data, and build a glyph library that replaces
system fonts with authentic hand-traced calligraphy.

Run: python3 extract-glyph-paths.py
"""
from __future__ import annotations

import json
import os
import sys
import importlib.util

import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

HERE = os.path.dirname(os.path.abspath(__file__))
SRC_DIR = os.path.join(HERE, "src")
OUT = os.path.join(HERE, "glyph_paths.json")


def load_gh():
    spec = importlib.util.spec_from_file_location(
        "gen_huaxia", os.path.join(HERE, "gen-huaxia.py")
    )
    if spec is None or spec.loader is None:
        raise RuntimeError("cannot load gen-huaxia.py")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def extract_character_contours(
    coin_rgb: Image.Image,
    cx: int,
    cy: int,
    char_size: int = 160,
    gamma: float = 1.0,
) -> list[list[tuple[float, float]]]:
    """Extract the contour of a single character from a coin photo region.

    Returns a list of contours, each contour is a list of (x,y) points
    relative to the character region center, normalized to a 0-1 range.
    """
    # Crop character region
    half = char_size // 2
    region = coin_rgb.crop((cx - half, cy - half, cx + half, cy + half))

    arr = np.asarray(region, dtype=np.float32)
    if gamma != 1.0:
        arr = 255 * (arr / 255) ** gamma
    gray = arr.mean(axis=2)

    # Bilateral-like smoothing to preserve edges
    gray = ndimage.gaussian_filter(gray, sigma=1.5)

    # Difference of Gaussians to find character edges
    narrow = ndimage.gaussian_filter(gray, sigma=2.0)
    wide = ndimage.gaussian_filter(gray, sigma=8.0)
    dog = narrow - wide

    # Threshold: recessed characters are darker
    thresh = np.percentile(dog, 35)
    mask = dog < thresh

    # Clean up
    mask = ndimage.binary_closing(mask, iterations=2)
    mask = ndimage.binary_opening(mask, iterations=1)

    # Find contours using connected components boundaries
    lbl, n = ndimage.label(mask)
    contours = []
    min_size = 80

    for i in range(1, n + 1):
        ys, xs = np.where(lbl == i)
        if len(xs) < min_size:
            continue

        # Trace the outer boundary
        comp = (lbl == i).astype(np.uint8)
        # Get boundary pixels
        eroded = ndimage.binary_erosion(comp, iterations=1)
        boundary = comp & ~eroded
        by, bx = np.where(boundary)

        if len(bx) < 10:
            continue

        # Order boundary points by angle from center
        bcy, bcx = by.mean(), bx.mean()
        angles = np.arctan2(by - bcy, bx - bcx)
        order = np.argsort(angles)

        points = []
        for j in order:
            # Normalize to [0, 1] range relative to char_size
            nx = (bx[j]) / char_size
            ny = (by[j]) / char_size
            points.append((round(nx, 4), round(ny, 4)))

        contours.append(points)

    return contours


def douglas_peucker(points: list[tuple[float, float]], epsilon: float) -> list[tuple[float, float]]:
    if len(points) < 3:
        return points

    def perp_dist(pt: tuple[float, float], a: tuple[float, float], b: tuple[float, float]) -> float:
        ax, ay = a
        bx, by = b
        px, py = pt
        dx = bx - ax
        dy = by - ay
        if dx == 0 and dy == 0:
            return ((px - ax) ** 2 + (py - ay) ** 2) ** 0.5
        t = max(0, min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)))
        proj_x = ax + t * dx
        proj_y = ay + t * dy
        return ((px - proj_x) ** 2 + (py - proj_y) ** 2) ** 0.5

    start, end = points[0], points[-1]
    dists = [perp_dist(p, start, end) for p in points]
    idx = int(np.argmax(dists))
    if dists[idx] > epsilon:
        left = douglas_peucker(points[: idx + 1], epsilon)
        right = douglas_peucker(points[idx:], epsilon)
        return left[:-1] + right
    return [start, end]


def contours_to_svg_path(contours: list, scale: float = 120.0) -> str:
    """Convert extracted contours to a simplified SVG path string."""
    if not contours:
        return ""

    paths = []
    for contour in contours:
        if len(contour) < 3:
            continue
        simplified = douglas_peucker(contour, epsilon=0.012)
        if len(simplified) < 3:
            continue
        if simplified[-1] != simplified[0]:
            simplified = list(simplified) + [simplified[0]]

        sx, sy = simplified[0]
        d = f"M {sx * scale:.1f} {sy * scale:.1f}"
        for px, py in simplified[1:]:
            d += f" L {px * scale:.1f} {py * scale:.1f}"
        d += " Z"
        paths.append(d)

    return " ".join(paths)


def bake_all() -> None:
    gh = load_gh()
    glyphs = {}

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

        # Character positions (matching replica_glyphs.py layout in 600 viewBox)
        # Scaled to 1024: center=512, char positions scaled by 1024/600
        scale = S / 600.0  # 1.7067
        cx = int(300.0 * scale)  # 512
        cy = int(300.0 * scale)  # 512

        coin_glyphs = {}
        char_size = int(160 * scale)  # ~273

        if cid in ("banliang", "wuzhu"):
            # Two horizontal characters: right at x=448, left at x=152
            for name, x_pos in [("right", 448), ("left", 152)]:
                px = int(x_pos * scale)
                py = int(302 * scale)
                contours = extract_character_contours(coin, px, py, char_size, gamma)
                if contours:
                    coin_glyphs[name] = contours_to_svg_path(contours, 120)

        elif cid in ("daquan", "kaiyuan", "daguan", "hongwu"):
            # Four cross characters: top/bottom/right/left
            for name, x_pos, y_pos in [
                ("top", 300, 118),
                ("bottom", 300, 492),
                ("right", 468, 302),
                ("left", 132, 302),
            ]:
                px = int(x_pos * scale)
                py = int(y_pos * scale)
                contours = extract_character_contours(coin, px, py, char_size, gamma)
                if contours:
                    coin_glyphs[name] = contours_to_svg_path(contours, 120)

        if coin_glyphs:
            glyphs[cid] = coin_glyphs
            n = len(coin_glyphs)
            print(f"extracted {cid}: {n} glyph(s) — {' '.join(coin_glyphs.keys())}")
        else:
            print(f"WARN {cid}: no glyphs extracted")

    with open(OUT, "w") as f:
        json.dump(glyphs, f, indent=2)

    total = sum(len(v) for v in glyphs.values())
    print(f"\nsaved {total} glyphs to {OUT}")


if __name__ == "__main__":
    bake_all()
