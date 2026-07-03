#!/usr/bin/env python3
"""从 banliang-qin.jpg 字面提取「半」「兩」凸起笔画 → 简化 SVG path。

照片仅作字形结构参考；输出供 banliang_glyphs.py 使用。
Run: python3 trace-banliang-from-coin.py
"""
from __future__ import annotations

import importlib.util
import json
import os

import numpy as np
from PIL import Image
from scipy import ndimage

HERE = os.path.dirname(os.path.abspath(__file__))
PARENT = os.path.dirname(HERE)
SRC = os.path.join(PARENT, "src", "banliang-xianyang.jpg")
OUT_JSON = os.path.join(HERE, "banliang_paths_from_coin.json")

# gen-huaxia coin pick + layout
CHAR_LAYOUT = {
    "ban": ("right", 448, 302),  # 半
    "liang": ("left", 152, 302),  # 兩
}
CHAR_SIZE = 220  # px crop in 1024 space


def load_gh():
    spec = importlib.util.spec_from_file_location("gen_huaxia", os.path.join(PARENT, "gen-huaxia.py"))
    mod = importlib.util.module_from_spec(spec)
    assert spec.loader
    spec.loader.exec_module(mod)
    return mod


def raised_mask(region: np.ndarray) -> np.ndarray:
    gray = region.mean(axis=2)
    blur = ndimage.gaussian_filter(gray, sigma=5)
    relief = gray - blur
    thr = np.percentile(relief, 72)
    mask = relief >= thr
    mask = ndimage.binary_closing(mask, iterations=2)
    mask = ndimage.binary_opening(mask, iterations=1)
    lbl, n = ndimage.label(mask)
    sizes = np.bincount(lbl.ravel())
    keep = sizes[1:].max() if n > 1 else 0
    if keep:
        for i in range(1, n + 1):
            if sizes[i] < keep * 0.12:
                mask[lbl == i] = False
    return mask


def mask_to_paths(mask: np.ndarray, box: int = 100, max_pts: int = 36) -> list[str]:
    """Outer contours → SVG paths in 0..box coords."""
    padded = np.pad(mask, 1, mode="constant", constant_values=False)
    contours: list[list[tuple[float, float]]] = []
    h, w = mask.shape

    def neighbors(y: int, x: int) -> list[tuple[int, int]]:
        out = []
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                if dy == 0 and dx == 0:
                    continue
                ny, nx = y + dy, x + dx
                if 0 <= ny < h and 0 <= nx < w and mask[ny, nx]:
                    out.append((ny, nx))
        return out

    visited = np.zeros_like(mask, dtype=bool)
    for y in range(h):
        for x in range(w):
            if not mask[y, x] or visited[y, x]:
                continue
            if y > 0 and mask[y - 1, x]:
                continue
            # trace boundary (simple march)
            pts: list[tuple[float, float]] = []
            cy, cx = y, x
            for _ in range(h * w):
                visited[cy, cx] = True
                pts.append((cx / w * box, cy / h * box))
                nbs = neighbors(cy, cx)
                if not nbs:
                    break
                cy, cx = nbs[0]
                if len(pts) > 4 and abs(cy - y) < 2 and abs(cx - x) < 2:
                    break
            if len(pts) >= 8:
                contours.append(pts)

    paths: list[str] = []
    for pts in sorted(contours, key=len, reverse=True)[:6]:
        step = max(1, len(pts) // max_pts)
        samp = pts[::step]
        if samp[-1] != pts[-1]:
            samp.append(pts[-1])
        d = f"M {samp[0][0]:.1f} {samp[0][1]:.1f}"
        for px, py in samp[1:]:
            d += f" L {px:.1f} {py:.1f}"
        d += " Z"
        paths.append(d)
    return paths


def skeleton_strokes(mask: np.ndarray, box: int = 100) -> list[str]:
    """Morphological skeleton → stroke centerlines as open paths."""
    img = mask.copy()
    skel = np.zeros_like(img, dtype=bool)
    el = ndimage.generate_binary_structure(2, 1)
    while img.any():
        er = ndimage.binary_erosion(img, structure=el)
        op = ndimage.binary_dilation(er, structure=el)
        skel |= img & ~op
        img = er

    h, w = skel.shape
    visited = np.zeros_like(skel, dtype=bool)
    paths: list[str] = []

    def deg(y: int, x: int) -> int:
        c = 0
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                if dy == 0 and dx == 0:
                    continue
                ny, nx = y + dy, x + dx
                if 0 <= ny < h and 0 <= nx < w and skel[ny, nx]:
                    c += 1
        return c

    ys, xs = np.where(skel)
    endpoints = [(y, x) for y, x in zip(ys, xs, strict=True) if deg(y, x) == 1]
    starts = endpoints if endpoints else list(zip(ys, xs, strict=True))

    for sy, sx in starts:
        if visited[sy, sx]:
            continue
        pts: list[tuple[float, float]] = []
        y, x = sy, sx
        py, px = -1, -1
        for _ in range(h * w):
            if visited[y, x]:
                break
            visited[y, x] = True
            pts.append((x / w * box, y / h * box))
            nbs = [
                (ny, nx)
                for ny in range(max(0, y - 1), min(h, y + 2))
                for nx in range(max(0, x - 1), min(w, x + 2))
                if (ny, nx) != (y, x) and skel[ny, nx] and not (ny == py and nx == px)
            ]
            if not nbs:
                break
            py, px = y, x
            y, x = nbs[0]
        if len(pts) >= 6:
            step = max(1, len(pts) // 24)
            samp = pts[::step]
            d = f"M {samp[0][0]:.1f} {samp[0][1]:.1f}"
            for px, py in samp[1:]:
                d += f" L {px:.1f} {py:.1f}"
            paths.append(d)
    return paths


def main() -> None:
    gh = load_gh()
    full = Image.open(SRC).convert("RGB")
    obv = gh.region_crop(full, (0.0, 0.0, 0.5, 1.0))
    box, _ = gh.pick_coin(obv)
    if box is None:
        raise RuntimeError("no coin found")
    coin = gh.square_coin(obv, box)
    scale = coin.width / 600.0

    result: dict[str, list[str]] = {}
    for key, (_pos, vx, vy) in CHAR_LAYOUT.items():
        cx, cy = int(vx * scale), int(vy * scale)
        half = CHAR_SIZE // 2
        crop = coin.crop((cx - half, cy - half, cx + half, cy + half))
        arr = np.asarray(crop)
        mask = raised_mask(arr)
        strokes = skeleton_strokes(mask)
        if len(strokes) < 2:
            strokes = mask_to_paths(mask)
        result[key] = strokes
        debug = Image.fromarray((mask * 255).astype(np.uint8))
        debug.save(os.path.join(HERE, f"_debug_{key}.png"))
        print(f"{key}: {len(strokes)} strokes")

    with open(OUT_JSON, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2, ensure_ascii=False)
    print(f"saved {OUT_JSON}")


if __name__ == "__main__":
    main()
