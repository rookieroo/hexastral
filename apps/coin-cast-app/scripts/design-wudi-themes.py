#!/usr/bin/env python3
"""
中华大五帝钱 · 设计稿级三主题（从零绘制，无照片像素）

三种物件，不是同一 mask 换色：
  ink     — 纸上的一枚钱影（宣纸留白 + 枯笔圆郭 + 湿墨篆文）
  rubbing — 拓片（墨海 + 字口露白 + 毛边纸感）
  seal    — 朱文印面（朱红地 + 留白铁线篆 + 印边栏）

  python3 apps/coin-cast-app/scripts/design-wudi-themes.py

输出：assets/coins/faces/<id>-{ink,rubbing,seal}.png (+ -back, -bump)
"""

from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parents[1]
FACES = ROOT / "assets" / "coins" / "faces"
OUT = 1024
C = OUT / 2

BRUSH_FONT = Path.home() / "Library/Fonts/MaShanZheng-Regular.ttf"
FALLBACK_FONT = Path.home() / "Library/Fonts/LXGWWenKai-Regular.ttf"

WUDI_IDS = (
    "qin-banliang",
    "han-wuzhu",
    "tang-kaiyuan",
    "song-songyuan",
    "ming-yongle",
)

# Seal-script strokes (100×100 box) — same as wudi-coins.mjs / gen-wudi-ink-wash.py
SEAL_LIANG = [
    ((18, 22), (82, 22)),
    ((27, 22), (27, 80)),
    ((73, 22), (73, 80)),
    ((50, 30), (50, 80)),
    ((38, 42), (31, 70)),
    ((38, 42), (45, 66)),
    ((62, 42), (55, 66)),
    ((62, 42), (69, 70)),
    ((27, 80), (73, 80)),
]
SEAL_BAN = [
    ((38, 20), (45, 33)),
    ((62, 20), (55, 33)),
    ((50, 22), (50, 86)),
    ((24, 46), (76, 46)),
    ((32, 65), (68, 65)),
]
SEAL_ZHU = [
    ((24, 12), (10, 28)),
    ((24, 12), (38, 28)),
    ((24, 12), (24, 80)),
    ((12, 40), (36, 40)),
    ((12, 55), (36, 55)),
    ((8, 80), (40, 80)),
    ((15, 66), (21, 60)),
    ((33, 66), (27, 60)),
    ((48, 48), (92, 48)),
    ((70, 20), (70, 84)),
    ((70, 58), (52, 84)),
    ((70, 58), (88, 84)),
]
SEAL_WU = [
    ((20, 22), (80, 22)),
    ((20, 78), (80, 78)),
    ((34, 30), (66, 70)),
    ((66, 30), (34, 70)),
]

COINS = {
    "qin-banliang": {"kind": "seal", "left": SEAL_LIANG, "right": SEAL_BAN},
    "han-wuzhu": {"kind": "seal", "left": SEAL_ZHU, "right": SEAL_WU},
    "tang-kaiyuan": {"kind": "tongbao", "chars": ("开", "元", "宝", "通")},
    "song-songyuan": {"kind": "tongbao", "chars": ("宋", "元", "宝", "通")},
    "ming-yongle": {"kind": "tongbao", "chars": ("永", "乐", "宝", "通")},
}


def load_brush(size: int) -> ImageFont.FreeTypeFont:
    path = BRUSH_FONT if BRUSH_FONT.is_file() else FALLBACK_FONT
    if not path.is_file():
        raise SystemExit(f"brush font missing: {BRUSH_FONT}")
    return ImageFont.truetype(str(path), size=size)


def disc_alpha(radius: float, feather: float) -> np.ndarray:
    yy, xx = np.mgrid[0:OUT, 0:OUT]
    d = np.sqrt((xx - C) ** 2 + (yy - C) ** 2)
    if feather <= 0:
        return (d <= radius).astype(np.float32)
    return np.clip((radius + feather - d) / feather, 0, 1).astype(np.float32)


def hole_alpha(side: float) -> np.ndarray:
    half = side / 2
    yy, xx = np.mgrid[0:OUT, 0:OUT]
    return ((np.abs(xx - C) <= half) & (np.abs(yy - C) <= half)).astype(np.float32)


def noise(seed: int, amp: float) -> np.ndarray:
    return np.random.default_rng(seed).normal(0, amp, (OUT, OUT)).astype(np.float32)


def stroke_layer(
    segments: list[tuple[tuple[float, float], tuple[float, float]]],
    ox: float,
    oy: float,
    scale: float,
    width: float,
    color: tuple[int, int, int],
    alpha: int = 255,
) -> Image.Image:
    layer = Image.new("RGBA", (OUT, OUT), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    col = (*color, alpha)
    w = max(1, int(round(width)))
    for a, b in segments:
        p0 = (ox + a[0] * scale, oy + a[1] * scale)
        p1 = (ox + b[0] * scale, oy + b[1] * scale)
        d.line([p0, p1], fill=col, width=w, joint="curve")
    return layer


def place_seal_pair(
    canvas: Image.Image,
    left: list,
    right: list,
    color: tuple[int, int, int],
    *,
    scale: float,
    width: float,
    bleed: bool,
    bleed_alpha: int = 40,
    soft: bool = False,
) -> None:
    ty = OUT * 0.30
    left_x = OUT * 0.105
    right_x = OUT * 0.575
    if bleed:
        b = stroke_layer(left, left_x + 4, ty + 5, scale, width * 1.7, color, bleed_alpha)
        b = b.filter(ImageFilter.GaussianBlur(radius=OUT * 0.007))
        canvas.alpha_composite(b)
        b2 = stroke_layer(right, right_x + 4, ty + 5, scale, width * 1.7, color, bleed_alpha)
        b2 = b2.filter(ImageFilter.GaussianBlur(radius=OUT * 0.007))
        canvas.alpha_composite(b2)
    body_w = width * (1.15 if soft else 1.0)
    body = stroke_layer(left, left_x, ty, scale, body_w, color, 250)
    body2 = stroke_layer(right, right_x, ty, scale, body_w, color, 250)
    if soft:
        body = body.filter(ImageFilter.GaussianBlur(radius=0.7))
        body2 = body2.filter(ImageFilter.GaussianBlur(radius=0.7))
    canvas.alpha_composite(body)
    canvas.alpha_composite(body2)
    if soft:
        canvas.alpha_composite(
            stroke_layer(left, left_x - 1, ty - 1, scale, width * 0.35, color, 70)
        )
        canvas.alpha_composite(
            stroke_layer(right, right_x - 1, ty - 1, scale, width * 0.35, color, 70)
        )
    else:
        canvas.alpha_composite(stroke_layer(left, left_x, ty, scale, width * 0.45, color, 90))
        canvas.alpha_composite(stroke_layer(right, right_x, ty, scale, width * 0.45, color, 90))


def draw_char(
    canvas: Image.Image,
    ch: str,
    cx: float,
    cy: float,
    font: ImageFont.FreeTypeFont,
    color: tuple[int, int, int],
    *,
    bleed: bool,
    soft: bool,
    alpha: int = 250,
) -> None:
    tmp = Image.new("L", (1, 1))
    td = ImageDraw.Draw(tmp)
    bbox = td.textbbox((0, 0), ch, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    x0 = cx - tw / 2 - bbox[0]
    y0 = cy - th / 2 - bbox[1]

    if bleed:
        bleed_layer = Image.new("RGBA", (OUT, OUT), (0, 0, 0, 0))
        bd = ImageDraw.Draw(bleed_layer)
        bd.text((x0 + 3, y0 + 4), ch, font=font, fill=(*color, 70))
        bleed_layer = bleed_layer.filter(ImageFilter.GaussianBlur(radius=OUT * 0.008))
        canvas.alpha_composite(bleed_layer)

    body = Image.new("RGBA", (OUT, OUT), (0, 0, 0, 0))
    d = ImageDraw.Draw(body)
    d.text((x0, y0), ch, font=font, fill=(*color, alpha))
    if soft:
        body = body.filter(ImageFilter.GaussianBlur(radius=0.8))
    canvas.alpha_composite(body)

    if not soft:
        outline = Image.new("RGBA", (OUT, OUT), (0, 0, 0, 0))
        od = ImageDraw.Draw(outline)
        od.text((x0, y0), ch, font=font, fill=(*color, 90))
        canvas.alpha_composite(outline)


def place_tongbao(
    canvas: Image.Image,
    chars: tuple[str, str, str, str],
    color: tuple[int, int, int],
    *,
    bleed: bool,
    soft: bool,
    font_scale: float = 0.195,
) -> None:
    top, bottom, left, right = chars
    font = load_brush(int(OUT * font_scale))
    r = OUT * 0.453
    place = [
        (top, C, C - r * 0.5),
        (bottom, C, C + r * 0.5),
        (left, C - r * 0.5, C),
        (right, C + r * 0.5, C),
    ]
    for ch, x, y in place:
        draw_char(canvas, ch, x, y, font, color, bleed=bleed, soft=soft)


def place_obverse_glyphs(
    canvas: Image.Image,
    coin_id: str,
    color: tuple[int, int, int],
    *,
    theme: str,
) -> None:
    defn = COINS[coin_id]
    bleed = theme == "ink"
    soft = theme == "ink"
    if defn["kind"] == "seal":
        scale = OUT / (340 if theme == "ink" else 335 if theme == "rubbing" else 350)
        width = OUT * (0.015 if theme == "ink" else 0.0145 if theme == "rubbing" else 0.0095)
        place_seal_pair(
            canvas,
            defn["left"],
            defn["right"],
            color,
            scale=scale,
            width=width,
            bleed=bleed,
            bleed_alpha=70 if theme == "ink" else 40,
            soft=soft,
        )
        if theme == "seal":
            place_seal_pair(
                canvas,
                defn["left"],
                defn["right"],
                (255, 250, 240),
                scale=scale,
                width=width * 0.42,
                bleed=False,
                soft=False,
            )
    else:
        fs = 0.195 if theme != "seal" else 0.18
        place_tongbao(canvas, defn["chars"], color, bleed=bleed, soft=soft, font_scale=fs)
        if theme == "seal":
            place_tongbao(
                canvas,
                defn["chars"],
                (255, 250, 240),
                bleed=False,
                soft=False,
                font_scale=fs * 0.85,
            )


def star_moon(canvas: Image.Image, color: tuple[int, int, int], alpha: int = 160) -> None:
    layer = Image.new("RGBA", (OUT, OUT), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    sr = OUT * 0.018
    d.ellipse((C - sr, OUT * 0.22 - sr, C + sr, OUT * 0.22 + sr), fill=(*color, alpha))
    my = OUT * 0.76
    R = OUT * 0.038
    d.ellipse((C - R, my - R, C + R, my + R), fill=(*color, int(alpha * 0.85)))
    cut = Image.new("L", (OUT, OUT), 0)
    ImageDraw.Draw(cut).ellipse((C - R + R * 0.55, my - R, C + R + R * 0.55, my + R), fill=255)
    arr = np.asarray(layer).copy()
    arr[np.asarray(cut) > 0, 3] = 0
    canvas.alpha_composite(Image.fromarray(arr, "RGBA"))


def finish(rgb: np.ndarray, rim_r: float, hole_side: float) -> Image.Image:
    alpha = disc_alpha(rim_r, OUT * 0.008) * (1.0 - hole_alpha(hole_side))
    rgba = np.dstack([np.clip(rgb, 0, 255), alpha * 255]).astype(np.uint8)
    return Image.fromarray(rgba, "RGBA")


def theme_ink(coin_id: str, side: str) -> Image.Image:
    paper = np.array([252, 248, 238], dtype=np.float32)
    ink = (18, 14, 12)
    rgb = np.zeros((OUT, OUT, 3), dtype=np.float32)
    rgb[:] = paper
    rgb += noise(7 + hash(coin_id) % 100, 1.6)[..., None]
    yy, xx = np.mgrid[0:OUT, 0:OUT]
    for cx, cy, rad, a in (
        (OUT * 0.22, OUT * 0.78, OUT * 0.18, 0.045),
        (OUT * 0.78, OUT * 0.24, OUT * 0.14, 0.035),
    ):
        d = np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2) / rad
        w = np.clip(1 - d, 0, 1) ** 2
        rgb = rgb * (1 - w[..., None] * a) + np.array([40, 34, 28]) * w[..., None] * a

    canvas = Image.fromarray(np.clip(rgb, 0, 255).astype(np.uint8), "RGB").convert("RGBA")

    rim = Image.new("RGBA", (OUT, OUT), (0, 0, 0, 0))
    d = ImageDraw.Draw(rim)
    r = OUT * 0.455
    rng = np.random.default_rng(9 + hash(coin_id) % 50)
    for start in range(0, 360, 8):
        extent = int(rng.integers(4, 10))
        op = int(rng.integers(40, 160))
        d.arc(
            (C - r, C - r, C + r, C + r),
            start=start,
            end=start + extent,
            fill=(*ink, op),
            width=max(2, int(OUT * 0.006)),
        )
    rim = rim.filter(ImageFilter.GaussianBlur(radius=0.6))
    canvas.alpha_composite(rim)

    frame = Image.new("RGBA", (OUT, OUT), (0, 0, 0, 0))
    fd = ImageDraw.Draw(frame)
    hs = OUT * 0.11
    for x0, y0, x1, y1 in (
        (C - hs, C - hs, C - hs + OUT * 0.04, C - hs),
        (C + hs - OUT * 0.04, C - hs, C + hs, C - hs),
        (C - hs, C + hs, C - hs + OUT * 0.04, C + hs),
        (C + hs - OUT * 0.04, C + hs, C + hs, C + hs),
        (C - hs, C - hs, C - hs, C - hs + OUT * 0.04),
        (C + hs, C - hs, C + hs, C - hs + OUT * 0.04),
        (C - hs, C + hs - OUT * 0.04, C - hs, C + hs),
        (C + hs, C + hs - OUT * 0.04, C + hs, C + hs),
    ):
        fd.line([(x0, y0), (x1, y1)], fill=(*ink, 70), width=2)
    canvas.alpha_composite(frame)

    if side == "obverse":
        place_obverse_glyphs(canvas, coin_id, ink, theme="ink")
    else:
        star_moon(canvas, ink, alpha=120)

    arr = np.asarray(canvas).astype(np.float32)
    return finish(arr[..., :3], OUT * 0.46, OUT * 0.195)


def theme_rubbing(coin_id: str, side: str) -> Image.Image:
    ground = np.array([32, 30, 28], dtype=np.float32)
    chalk = (232, 226, 214)
    rgb = np.zeros((OUT, OUT, 3), dtype=np.float32)
    rgb[:] = ground
    rgb += noise(21 + hash(coin_id) % 100, 5.5)[..., None]
    yy, xx = np.mgrid[0:OUT, 0:OUT]
    dist = np.sqrt((xx - C) ** 2 + (yy - C) ** 2) / (OUT * 0.45)
    rgb *= 1.0 - np.clip(dist - 0.55, 0, 1)[..., None] * 0.12

    canvas = Image.fromarray(np.clip(rgb, 0, 255).astype(np.uint8), "RGB").convert("RGBA")

    rim = Image.new("RGBA", (OUT, OUT), (0, 0, 0, 0))
    d = ImageDraw.Draw(rim)
    r = OUT * 0.458
    d.ellipse((C - r, C - r, C + r, C + r), outline=(*chalk, 90), width=max(3, int(OUT * 0.008)))
    hs = OUT * 0.112
    d.rectangle(
        (C - hs, C - hs, C + hs, C + hs),
        outline=(*chalk, 140),
        width=max(2, int(OUT * 0.007)),
    )
    canvas.alpha_composite(rim)

    if side == "obverse":
        place_obverse_glyphs(canvas, coin_id, chalk, theme="rubbing")
        tmp = Image.new("RGBA", (OUT, OUT), (0, 0, 0, 0))
        place_obverse_glyphs(tmp, coin_id, (255, 255, 255), theme="rubbing")
        mask = np.asarray(tmp)[..., 3]
        speck = noise(24 + hash(coin_id) % 50, 1.0)
        knock = (speck > 0.55) & (mask > 40)
        arr = np.asarray(canvas).copy()
        arr[knock, :3] = ground.astype(np.uint8)
        canvas = Image.fromarray(arr, "RGBA")
    else:
        star_moon(canvas, chalk, alpha=150)

    arr = np.asarray(canvas).astype(np.float32)
    return finish(arr[..., :3], OUT * 0.462, OUT * 0.195)


def theme_seal(coin_id: str, side: str) -> Image.Image:
    vermilion = np.array([174, 42, 36], dtype=np.float32)
    paper = (248, 240, 226)
    rgb = np.zeros((OUT, OUT, 3), dtype=np.float32)
    rgb[:] = vermilion
    rgb += noise(31 + hash(coin_id) % 100, 2.8)[..., None]
    yy, xx = np.mgrid[0:OUT, 0:OUT]
    dist = np.sqrt((xx - C) ** 2 + (yy - C) ** 2) / (OUT * 0.45)
    rgb = rgb * (1 + (0.06 - dist * 0.1)[..., None])
    blot = noise(32 + hash(coin_id) % 50, 1.0)
    rgb[blot > 1.4] *= 0.88

    canvas = Image.fromarray(np.clip(rgb, 0, 255).astype(np.uint8), "RGB").convert("RGBA")

    rim = Image.new("RGBA", (OUT, OUT), (0, 0, 0, 0))
    d = ImageDraw.Draw(rim)
    for r, w, a in (
        (OUT * 0.458, OUT * 0.014, 220),
        (OUT * 0.430, OUT * 0.005, 160),
    ):
        d.ellipse(
            (C - r, C - r, C + r, C + r),
            outline=(*paper, a),
            width=max(2, int(w)),
        )
    hs = OUT * 0.118
    d.rectangle(
        (C - hs, C - hs, C + hs, C + hs),
        outline=(*paper, 200),
        width=max(2, int(OUT * 0.008)),
    )
    canvas.alpha_composite(rim)

    if side == "obverse":
        place_obverse_glyphs(canvas, coin_id, paper, theme="seal")
    else:
        star_moon(canvas, paper, alpha=180)

    arr = np.asarray(canvas).astype(np.float32)
    return finish(arr[..., :3], OUT * 0.465, OUT * 0.20)


def make_bump(face: Image.Image) -> Image.Image:
    g = face.convert("L").filter(ImageFilter.GaussianBlur(radius=0.4))
    arr = np.asarray(g).astype(np.float32)
    a = np.asarray(face)[..., 3]
    m = a > 16
    if m.any():
        lo, hi = np.percentile(arr[m], (3, 97))
        if hi > lo:
            arr = (arr - lo) / (hi - lo) * 255
    return ImageOps.autocontrast(Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), "L"), cutoff=1)


def main() -> None:
    FACES.mkdir(parents=True, exist_ok=True)
    themes = {
        "ink": theme_ink,
        "rubbing": theme_rubbing,
        "seal": theme_seal,
    }
    for coin_id in WUDI_IDS:
        for name, fn in themes.items():
            print(f"→ {coin_id}-{name}")
            ob = fn(coin_id, "obverse")
            bk = fn(coin_id, "reverse")
            bump = make_bump(ob)
            ob.save(FACES / f"{coin_id}-{name}.png", optimize=True)
            bk.save(FACES / f"{coin_id}-{name}-back.png", optimize=True)
            bump.save(FACES / f"{coin_id}-{name}-bump.png", optimize=True)
            a = np.asarray(ob)[..., 3]
            print(f"  alpha center={a[OUT // 2, OUT // 2]} body={a[OUT // 2, int(OUT * 0.3)]}")
    print(f"done — 五帝钱三主题 @ {OUT}² → {FACES}")


if __name__ == "__main__":
    main()
