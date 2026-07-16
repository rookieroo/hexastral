#!/usr/bin/env python3
"""
汉五铢 · 三分区实验（版权安全主题管线）

从写实图只提取结构 mask，不把照片像素写入主题脸图：
  1. hole  — 方孔（透明穿口）
  2. body  — 钱身地（圆盘 − 穿）
  3. glyph — 钱文浮雕区（五 / 铢）

主题（ procedural，无照片 RGB）：
  ink     — 水墨留白
  rubbing — 碑拓（墨底露白字）
  seal    — 朱文印章

  python3 apps/coin-cast-app/scripts/experiment-wuzhu-regions.py

输出：
  assets/coins/experiments/wuzhu/
    masks/{hole,body,glyph,overlay}.png
    themes/{ink,rubbing,seal}.png (+ -bump)
"""

from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets" / "coins" / "source.png"
OUT_DIR = ROOT / "assets" / "coins" / "experiments" / "wuzhu"
OUT = 1024

# Same crop calibration as extract-wudi-from-source.py
CROP = (720, 900, 420, 420)
HOLE_CX = 0.46
HOLE_CY = 0.50
HOLE_FRAC = 0.28
RIM_FRAC = 0.492

BRUSH = Path.home() / "Library/Fonts/MaShanZheng-Regular.ttf"
WENKAI = Path.home() / "Library/Fonts/LXGWWenKai-Regular.ttf"


def soft_circle(size: int, radius: float, feather: float = 0) -> np.ndarray:
    yy, xx = np.mgrid[0:size, 0:size]
    c = (size - 1) / 2
    d = np.sqrt((xx - c) ** 2 + (yy - c) ** 2)
    m = np.clip((radius + feather - d) / max(feather, 1e-6), 0, 1) if feather > 0 else (d <= radius).astype(
        np.float32
    )
    if feather <= 0:
        return m.astype(np.float32)
    return m.astype(np.float32)


def square_mask(size: int, side: float, cx: float | None = None, cy: float | None = None) -> np.ndarray:
    cx = size / 2 if cx is None else cx
    cy = size / 2 if cy is None else cy
    half = side / 2
    yy, xx = np.mgrid[0:size, 0:size]
    return ((np.abs(xx - cx) <= half) & (np.abs(yy - cy) <= half)).astype(np.float32)


def align_photo() -> tuple[np.ndarray, float]:
    """Return RGB float32 HxWx3 @ OUT² centered on 穿, plus hole side in px."""
    src = np.asarray(Image.open(SOURCE).convert("RGB")).astype(np.float32)
    x, y, w, h = CROP
    crop = src[y : y + h, x : x + w]
    hx, hy = HOLE_CX * w, HOLE_CY * h
    hole_side = HOLE_FRAC * min(h, w)
    side = int(round(min(w, h) * 0.92))
    if side % 2:
        side += 1
    canvas = np.zeros((side, side, 3), dtype=np.float32)
    sx0 = int(round(hx - side / 2))
    sy0 = int(round(hy - side / 2))
    y0, x0 = max(0, sy0), max(0, sx0)
    y1, x1 = min(h, sy0 + side), min(w, sx0 + side)
    dy, dx = y0 - sy0, x0 - sx0
    canvas[dy : dy + (y1 - y0), dx : dx + (x1 - x0)] = crop[y0:y1, x0:x1]
    im = Image.fromarray(np.clip(canvas, 0, 255).astype(np.uint8), "RGB")
    im = im.resize((OUT, OUT), Image.Resampling.LANCZOS)
    return np.asarray(im).astype(np.float32), hole_side * (OUT / side)


def refine_hole(rgb: np.ndarray, hole_side: float) -> tuple[np.ndarray, float]:
    """
    Snap geometric 穿 to darkest square near center (photo guidance only).
    Returns hole mask + refined side.
    """
    lum = 0.2126 * rgb[..., 0] + 0.7152 * rgb[..., 1] + 0.0722 * rgb[..., 2]
    c = OUT // 2
    best = (1e18, c, c, hole_side)
    for scale in (0.92, 1.0, 1.08, 1.15):
        side = hole_side * scale
        half = int(side / 2)
        for dy in range(-28, 29, 2):
            for dx in range(-28, 29, 2):
                cx, cy = c + dx, c + dy
                y0, y1 = cy - half, cy + half
                x0, x1 = cx - half, cx + half
                if y0 < 8 or x0 < 8 or y1 >= OUT - 8 or x1 >= OUT - 8:
                    continue
                patch = lum[y0:y1, x0:x1]
                score = float(patch.mean()) + 0.15 * float(patch.std())
                if score < best[0]:
                    best = (score, cx, cy, side)
    _, cx, cy, side = best
    return square_mask(OUT, side, cx, cy), side


def segment_glyph(rgb: np.ndarray, body: np.ndarray, hole: np.ndarray) -> np.ndarray:
    """
    Relief → glyph mask. Uses |DoG| on luminance inside body\\hole,
    plus mild morphological cleanup. Photo is guidance only.
    """
    lum = 0.2126 * rgb[..., 0] + 0.7152 * rgb[..., 1] + 0.0722 * rgb[..., 2]
    field = (body > 0.5) & (hole < 0.5)

    # Exclude outer rim band (外郭) — noise / edge bevel
    rim_inner = soft_circle(OUT, OUT * 0.42, 0) > 0.5
    field = field & rim_inner

    g = Image.fromarray(lum.astype(np.uint8), "L")
    blur_lo = np.asarray(g.filter(ImageFilter.GaussianBlur(radius=2.0))).astype(np.float32)
    blur_hi = np.asarray(g.filter(ImageFilter.GaussianBlur(radius=10.0))).astype(np.float32)
    dog = np.abs(blur_lo - blur_hi)

    # Local contrast stretch inside field
    vals = dog[field]
    if vals.size < 100:
        return np.zeros((OUT, OUT), dtype=np.float32)
    lo, hi = np.percentile(vals, (55, 96))
    score = np.clip((dog - lo) / max(hi - lo, 1e-3), 0, 1)

    glyph = (score > 0.42) & field
    # Prefer character bands: left / right of 穿 (五铢左右文)
    yy, xx = np.mgrid[0:OUT, 0:OUT]
    c = OUT / 2
    left_band = (xx < c - OUT * 0.04) & (xx > c - OUT * 0.38)
    right_band = (xx > c + OUT * 0.04) & (xx < c + OUT * 0.38)
    mid_y = (yy > c - OUT * 0.28) & (yy < c + OUT * 0.28)
    glyph = glyph & mid_y & (left_band | right_band)

    img = Image.fromarray((glyph.astype(np.uint8) * 255), "L")
    img = img.filter(ImageFilter.MaxFilter(3))
    img = img.filter(ImageFilter.MinFilter(3))
    img = img.filter(ImageFilter.GaussianBlur(radius=0.8))
    arr = np.asarray(img).astype(np.float32) / 255.0
    return np.clip(arr, 0, 1)


def save_mask(path: Path, m: np.ndarray) -> None:
    Image.fromarray(np.clip(m * 255, 0, 255).astype(np.uint8), "L").save(path, optimize=True)


def debug_overlay(rgb: np.ndarray, hole: np.ndarray, body: np.ndarray, glyph: np.ndarray) -> Image.Image:
    """R=hole G=body B=glyph on desaturated photo."""
    gray = (0.2126 * rgb[..., 0] + 0.7152 * rgb[..., 1] + 0.0722 * rgb[..., 2])[..., None]
    base = np.clip(gray * 0.35, 0, 255)
    out = np.repeat(base, 3, axis=2)
    out[..., 0] = np.clip(out[..., 0] + hole * 180, 0, 255)
    out[..., 1] = np.clip(out[..., 1] + body * 90 * (1 - hole), 0, 255)
    out[..., 2] = np.clip(out[..., 2] + glyph * 200, 0, 255)
    # Outside disc black
    disc = soft_circle(OUT, OUT * RIM_FRAC, OUT * 0.008)
    out = out * disc[..., None]
    return Image.fromarray(out.astype(np.uint8), "RGB")


def paper_noise(seed: int, amp: float = 3.0) -> np.ndarray:
    rng = np.random.default_rng(seed)
    return rng.normal(0, amp, (OUT, OUT)).astype(np.float32)


def paint_theme(
    theme: str,
    hole: np.ndarray,
    body: np.ndarray,
    glyph: np.ndarray,
    weather: np.ndarray,
) -> Image.Image:
    """
    Procedural theme — zero photo RGB.
    body fills coin field; glyph paints characters; hole → alpha 0.
    """
    disc = soft_circle(OUT, OUT * RIM_FRAC, OUT * 0.008)
    body_only = np.clip(body * (1.0 - hole) * (1.0 - glyph * 0.9), 0, 1)
    weather = weather * (1.0 - hole)

    if theme == "ink":
        paper = np.array([248, 244, 234], dtype=np.float32)
        ink = np.array([22, 18, 14], dtype=np.float32)
        field = paper + paper_noise(11, 2.0)[..., None]
        rgb = field * (1 - glyph[..., None]) + ink * glyph[..., None]
        g_img = Image.fromarray((glyph * 255).astype(np.uint8), "L").filter(
            ImageFilter.GaussianBlur(radius=2.2)
        )
        bleed = np.asarray(g_img).astype(np.float32) / 255.0
        rgb = rgb * (1 - bleed[..., None] * 0.16) + ink * bleed[..., None] * 0.16

    elif theme == "rubbing":
        ink_ground = np.array([28, 26, 24], dtype=np.float32)
        chalk = np.array([236, 230, 218], dtype=np.float32)
        grain = paper_noise(22, 4.0)
        ground = ink_ground + grain[..., None] * 0.35
        # Chalk = glyph core + photo weather (拓片颗粒)
        chalk_m = np.clip(glyph * 0.85 + weather * 0.65, 0, 1)
        rgb = ground * (1 - chalk_m[..., None]) + chalk * chalk_m[..., None]
        mott = paper_noise(23, 5.0)
        rgb = rgb + (mott * body_only * 0.25)[..., None]

    elif theme == "seal":
        cinnabar = np.array([168, 36, 32], dtype=np.float32)
        paper = np.array([245, 236, 220], dtype=np.float32)
        grain = paper_noise(33, 2.8)
        ground = cinnabar + grain[..., None] * 0.45
        rim = 1.0 - soft_circle(OUT, OUT * 0.38, OUT * 0.12)
        ground = ground * (1 - rim[..., None] * 0.12)
        rgb = ground * (1 - glyph[..., None]) + paper * glyph[..., None]

    else:
        raise ValueError(theme)

    rgb = np.clip(rgb, 0, 255)
    rim_line = soft_circle(OUT, OUT * RIM_FRAC, 0) - soft_circle(OUT, OUT * (RIM_FRAC - 0.012), 0)
    rim_line = np.clip(rim_line, 0, 1)
    stroke = (
        np.array([20, 16, 12], dtype=np.float32)
        if theme != "seal"
        else np.array([120, 24, 20], dtype=np.float32)
    )
    rgb = rgb * (1 - rim_line[..., None] * 0.75) + stroke * rim_line[..., None] * 0.75

    alpha = np.clip(disc * (1.0 - hole), 0, 1)
    rgba = np.dstack([rgb, alpha * 255]).astype(np.uint8)
    return Image.fromarray(rgba, "RGBA")


def hybrid_glyph(
    photo_glyph: np.ndarray,
) -> tuple[np.ndarray, np.ndarray]:
    """
    Vector 五/铢 = readable core (copyright-safe structure).
    Photo DoG only contributes *near* the vector (weather / 碑拓 grain),
    so corrosion speckles elsewhere do not pollute themes.
    """
    font_path = BRUSH if BRUSH.is_file() else WENKAI
    if not font_path.is_file():
        return photo_glyph, photo_glyph
    layer = Image.new("L", (OUT, OUT), 0)
    draw = ImageDraw.Draw(layer)
    font = ImageFont.truetype(str(font_path), size=int(OUT * 0.22))
    c = OUT / 2
    for ch, cx in (("铢", c - OUT * 0.22), ("五", c + OUT * 0.22)):
        bbox = draw.textbbox((0, 0), ch, font=font)
        tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
        x0 = cx - tw / 2 - bbox[0]
        y0 = c - th / 2 - bbox[1]
        draw.text((x0, y0), ch, font=font, fill=255)
    vec = np.asarray(layer).astype(np.float32) / 255.0
    vec_soft = (
        np.asarray(
            Image.fromarray((vec * 255).astype(np.uint8), "L").filter(
                ImageFilter.GaussianBlur(radius=1.0)
            )
        ).astype(np.float32)
        / 255.0
    )
    # Dilate vector → halo where photo weather is allowed
    halo = (
        np.asarray(
            Image.fromarray((vec * 255).astype(np.uint8), "L").filter(ImageFilter.MaxFilter(15))
        ).astype(np.float32)
        / 255.0
    )
    weather = photo_glyph * halo
    core = np.clip(np.maximum(vec_soft, weather * 0.55), 0, 1)
    return core, weather



def make_bump(face: Image.Image) -> Image.Image:
    g = face.convert("L").filter(ImageFilter.GaussianBlur(radius=0.5))
    arr = np.asarray(g).astype(np.float32)
    a = np.asarray(face)[..., 3]
    mask = a > 16
    if mask.any():
        lo, hi = np.percentile(arr[mask], (4, 96))
        if hi > lo:
            arr = (arr - lo) / (hi - lo) * 255
    arr = np.clip(arr, 0, 255)
    return ImageOps.autocontrast(Image.fromarray(arr.astype(np.uint8), "L"), cutoff=2)


def main() -> None:
    masks_dir = OUT_DIR / "masks"
    themes_dir = OUT_DIR / "themes"
    masks_dir.mkdir(parents=True, exist_ok=True)
    themes_dir.mkdir(parents=True, exist_ok=True)

    print("→ align photo (guidance only)")
    rgb, hole_side = align_photo()
    hole, hole_side = refine_hole(rgb, hole_side)
    disc = soft_circle(OUT, OUT * RIM_FRAC, OUT * 0.006)
    body = np.clip(disc * (1.0 - hole), 0, 1)

    print("→ segment glyph (DoG relief + vector reinforce)")
    photo_glyph = segment_glyph(rgb, body, hole)
    glyph, weather = hybrid_glyph(photo_glyph)
    glyph = glyph * (1.0 - hole) * disc
    weather = weather * (1.0 - hole) * disc

    save_mask(masks_dir / "hole.png", hole)
    save_mask(masks_dir / "body.png", body)
    save_mask(masks_dir / "glyph.png", glyph)
    save_mask(masks_dir / "glyph-photo-only.png", photo_glyph * disc * (1 - hole))
    save_mask(masks_dir / "glyph-weather.png", weather)
    debug_overlay(rgb, hole, body, glyph).save(masks_dir / "overlay.png", optimize=True)
    guide = np.dstack([rgb, disc * (1 - hole) * 255]).astype(np.uint8)
    Image.fromarray(guide, "RGBA").save(masks_dir / "photo-guide.png", optimize=True)

    print(
        f"  coverage hole={hole.mean():.3f} body={body.mean():.3f} "
        f"glyph={glyph.mean():.3f} photo_glyph={photo_glyph.mean():.3f} "
        f"weather={weather.mean():.3f}"
    )

    for theme in ("ink", "rubbing", "seal"):
        print(f"→ theme {theme}")
        face = paint_theme(theme, hole, body, glyph, weather)
        face.save(themes_dir / f"{theme}.png", optimize=True)
        make_bump(face).save(themes_dir / f"{theme}-bump.png", optimize=True)

    readme = OUT_DIR / "README.md"
    readme.write_text(
        """# 汉五铢 · 三分区主题实验

写实图仅作 **结构引导**（对齐 / 浮雕检测），主题脸图为 procedural，不含照片 RGB。

| Mask | 含义 |
|------|------|
| `masks/hole.png` | 方孔（输出 alpha=0） |
| `masks/body.png` | 钱身地 |
| `masks/glyph.png` | 钱文（照片 DoG ∪ 矢量五/铢） |
| `masks/overlay.png` | R=hole G=body B=glyph 调试叠图 |

| Theme | 文件 |
|-------|------|
| 水墨 | `themes/ink.png` |
| 碑拓 | `themes/rubbing.png` |
| 印章朱文 | `themes/seal.png` |

重跑：`python3 apps/coin-cast-app/scripts/experiment-wuzhu-regions.py`
""",
        encoding="utf-8",
    )
    print(f"done → {OUT_DIR}")


if __name__ == "__main__":
    main()
