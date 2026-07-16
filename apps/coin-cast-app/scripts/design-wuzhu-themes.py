#!/usr/bin/env python3
"""
汉五铢 · 设计稿级三主题（从零绘制，无照片像素）

三种物件，不是同一 mask 换色：
  ink     — 纸上的一枚钱影（宣纸留白 + 枯笔圆郭 + 湿墨篆文）
  rubbing — 拓片（墨海 + 字口露白 + 毛边纸感）
  seal    — 朱文印面（朱红地 + 留白铁线篆 + 印边栏）

  python3 apps/coin-cast-app/scripts/design-wuzhu-themes.py

输出：assets/coins/experiments/wuzhu-design/
"""

from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageOps

ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "assets" / "coins" / "experiments" / "wuzhu-design"
OUT = 1024
C = OUT / 2

# 篆书笔画（100 盒）— 与 wudi-coins.mjs 一致；铢左、五右
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


def place_seals(
    canvas: Image.Image,
    color: tuple[int, int, int],
    *,
    scale: float,
    width: float,
    bleed: bool,
    bleed_alpha: int = 40,
    soft: bool = False,
) -> None:
    """铢 left, 五 right — classical 五铢 reading."""
    ty = OUT * 0.30
    left_x = OUT * 0.105
    right_x = OUT * 0.575
    if bleed:
        b = stroke_layer(SEAL_ZHU, left_x + 4, ty + 5, scale, width * 1.7, color, bleed_alpha)
        b = b.filter(ImageFilter.GaussianBlur(radius=OUT * 0.007))
        canvas.alpha_composite(b)
        b2 = stroke_layer(SEAL_WU, right_x + 4, ty + 5, scale, width * 1.7, color, bleed_alpha)
        b2 = b2.filter(ImageFilter.GaussianBlur(radius=OUT * 0.007))
        canvas.alpha_composite(b2)
    body_w = width * (1.15 if soft else 1.0)
    body = stroke_layer(SEAL_ZHU, left_x, ty, scale, body_w, color, 250)
    body2 = stroke_layer(SEAL_WU, right_x, ty, scale, body_w, color, 250)
    if soft:
        body = body.filter(ImageFilter.GaussianBlur(radius=0.7))
        body2 = body2.filter(ImageFilter.GaussianBlur(radius=0.7))
    canvas.alpha_composite(body)
    canvas.alpha_composite(body2)
    if soft:
        # 飞白：稍偏的细线
        canvas.alpha_composite(
            stroke_layer(SEAL_ZHU, left_x - 1, ty - 1, scale, width * 0.35, color, 70)
        )
        canvas.alpha_composite(
            stroke_layer(SEAL_WU, right_x - 1, ty - 1, scale, width * 0.35, color, 70)
        )
    else:
        canvas.alpha_composite(stroke_layer(SEAL_ZHU, left_x, ty, scale, width * 0.45, color, 90))
        canvas.alpha_composite(stroke_layer(SEAL_WU, right_x, ty, scale, width * 0.45, color, 90))


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


# ─── Theme: 水墨 ─────────────────────────────────────────────


def theme_ink(side: str) -> Image.Image:
    """纸上的一枚钱影 — 大留白，字是唯一实笔。"""
    paper = np.array([252, 248, 238], dtype=np.float32)
    ink = (18, 14, 12)
    # Flat paper + faint tooth only
    rgb = np.zeros((OUT, OUT, 3), dtype=np.float32)
    rgb[:] = paper
    rgb += noise(7, 1.6)[..., None]
    # Two soft ink blooms far from glyphs (气氛，不抢字)
    yy, xx = np.mgrid[0:OUT, 0:OUT]
    for cx, cy, rad, a in (
        (OUT * 0.22, OUT * 0.78, OUT * 0.18, 0.045),
        (OUT * 0.78, OUT * 0.24, OUT * 0.14, 0.035),
    ):
        d = np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2) / rad
        w = np.clip(1 - d, 0, 1) ** 2
        rgb = rgb * (1 - w[..., None] * a) + np.array([40, 34, 28]) * w[..., None] * a

    canvas = Image.fromarray(np.clip(rgb, 0, 255).astype(np.uint8), "RGB").convert("RGBA")

    # 枯笔外郭 — broken, not a clean ring
    rim = Image.new("RGBA", (OUT, OUT), (0, 0, 0, 0))
    d = ImageDraw.Draw(rim)
    r = OUT * 0.455
    # Draw arc segments with varying opacity
    rng = np.random.default_rng(9)
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

    # Faint 内郭 suggestion — only corners of square frame
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
        place_seals(
            canvas, ink, scale=OUT / 340, width=OUT * 0.015, bleed=True, bleed_alpha=70, soft=True
        )
    else:
        star_moon(canvas, ink, alpha=120)

    arr = np.asarray(canvas).astype(np.float32)
    return finish(arr[..., :3], OUT * 0.46, OUT * 0.195)


# ─── Theme: 碑拓 ─────────────────────────────────────────────


def theme_rubbing(side: str) -> Image.Image:
    """拓片 — 墨海为地，字口露白，硬边物件。"""
    ground = np.array([32, 30, 28], dtype=np.float32)
    chalk = (232, 226, 214)
    rgb = np.zeros((OUT, OUT, 3), dtype=np.float32)
    rgb[:] = ground
    # 拓包麻点
    rgb += noise(21, 5.5)[..., None]
    # Slight radial darken
    yy, xx = np.mgrid[0:OUT, 0:OUT]
    dist = np.sqrt((xx - C) ** 2 + (yy - C) ** 2) / (OUT * 0.45)
    rgb *= 1.0 - np.clip(dist - 0.55, 0, 1)[..., None] * 0.12

    canvas = Image.fromarray(np.clip(rgb, 0, 255).astype(np.uint8), "RGB").convert("RGBA")

    # Solid outer rim (拓边)
    rim = Image.new("RGBA", (OUT, OUT), (0, 0, 0, 0))
    d = ImageDraw.Draw(rim)
    r = OUT * 0.458
    d.ellipse((C - r, C - r, C + r, C + r), outline=(*chalk, 90), width=max(3, int(OUT * 0.008)))
    # Inner 郭 — complete square, chalk on ink
    hs = OUT * 0.112
    d.rectangle(
        (C - hs, C - hs, C + hs, C + hs),
        outline=(*chalk, 140),
        width=max(2, int(OUT * 0.007)),
    )
    canvas.alpha_composite(rim)

    if side == "obverse":
        # White raised glyphs on ink — 碑拓字口
        place_seals(canvas, chalk, scale=OUT / 335, width=OUT * 0.0145, bleed=False, soft=False)
        # Speckle the glyph edges (拓不实)
        g = Image.new("L", (OUT, OUT), 0)
        # Approximate: use existing alpha from seals by redrawing to mask
        tmp = Image.new("RGBA", (OUT, OUT), (0, 0, 0, 0))
        place_seals(tmp, (255, 255, 255), scale=OUT / 335, width=OUT * 0.016, bleed=False, soft=False)
        mask = np.asarray(tmp)[..., 3]
        speck = noise(24, 1.0)
        knock = (speck > 0.55) & (mask > 40)
        arr = np.asarray(canvas).copy()
        arr[knock, :3] = ground.astype(np.uint8)
        canvas = Image.fromarray(arr, "RGBA")
    else:
        star_moon(canvas, chalk, alpha=150)

    # Paper edge soft — outside stays transparent via finish
    arr = np.asarray(canvas).astype(np.float32)
    return finish(arr[..., :3], OUT * 0.462, OUT * 0.195)


# ─── Theme: 印章 ─────────────────────────────────────────────


def theme_seal(side: str) -> Image.Image:
    """朱文印面 — 朱红地、留白铁线篆、印边栏。"""
    vermilion = np.array([174, 42, 36], dtype=np.float32)
    paper = (248, 240, 226)
    rgb = np.zeros((OUT, OUT, 3), dtype=np.float32)
    rgb[:] = vermilion
    rgb += noise(31, 2.8)[..., None]
    # 印泥不匀：边缘略深、中心略亮
    yy, xx = np.mgrid[0:OUT, 0:OUT]
    dist = np.sqrt((xx - C) ** 2 + (yy - C) ** 2) / (OUT * 0.45)
    rgb = rgb * (1 + (0.06 - dist * 0.1)[..., None])
    # Sparse印泥斑
    blot = noise(32, 1.0)
    rgb[blot > 1.4] *= 0.88

    canvas = Image.fromarray(np.clip(rgb, 0, 255).astype(np.uint8), "RGB").convert("RGBA")

    # Double 印边栏
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
    # 中宫方框（印格）
    hs = OUT * 0.118
    d.rectangle(
        (C - hs, C - hs, C + hs, C + hs),
        outline=(*paper, 200),
        width=max(2, int(OUT * 0.008)),
    )
    canvas.alpha_composite(rim)

    if side == "obverse":
        # 铁线篆 — thinner, sharper (刀刻)
        place_seals(canvas, paper, scale=OUT / 350, width=OUT * 0.0095, bleed=False, soft=False)
        # Tiny second outline for carved edge
        place_seals(canvas, (255, 250, 240), scale=OUT / 350, width=OUT * 0.004, bleed=False, soft=False)
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


def contact_sheet(faces: dict[str, Image.Image]) -> Image.Image:
    """三主题并排，便于一眼比较「三种物件」。"""
    pad = 24
    cell = OUT
    w = cell * 3 + pad * 4
    h = cell + pad * 2 + 48
    sheet = Image.new("RGB", (w, h), (18, 16, 14))
    labels = {"ink": "水墨 · 纸上钱影", "rubbing": "碑拓 · 墨海字口", "seal": "印章 · 朱文印面"}
    draw = ImageDraw.Draw(sheet)
    for i, key in enumerate(("ink", "rubbing", "seal")):
        x = pad + i * (cell + pad)
        y = pad + 36
        face = faces[key]
        # Checker under hole so transparency reads
        bg = Image.new("RGBA", (OUT, OUT), (40, 38, 36, 255))
        bg.alpha_composite(face)
        sheet.paste(bg.convert("RGB"), (x, y))
        draw.text((x + 8, 10), labels[key], fill=(200, 190, 170))
    return sheet


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    themes = {
        "ink": theme_ink,
        "rubbing": theme_rubbing,
        "seal": theme_seal,
    }
    faces: dict[str, Image.Image] = {}
    for name, fn in themes.items():
        print(f"→ {name}")
        ob = fn("obverse")
        bk = fn("reverse")
        bump = make_bump(ob)
        ob.save(OUT_DIR / f"{name}.png", optimize=True)
        bk.save(OUT_DIR / f"{name}-back.png", optimize=True)
        bump.save(OUT_DIR / f"{name}-bump.png", optimize=True)
        faces[name] = ob
        a = np.asarray(ob)[..., 3]
        print(f"  alpha center={a[OUT // 2, OUT // 2]} body={a[OUT // 2, int(OUT * 0.3)]}")

    contact_sheet(faces).save(OUT_DIR / "contact-sheet.png", optimize=True)
    (OUT_DIR / "README.md").write_text(
        """# 汉五铢 · 设计稿三主题

从零绘制，**无照片像素**。三种「物件」并排见 `contact-sheet.png`。

| 主题 | 物件语义 | 字 | 地 | 穿 |
|------|----------|----|----|-----|
| `ink` | 纸上钱影 | 湿墨篆 + 洇 | 骨纸大留白 | 透明留白 |
| `rubbing` | 碑拓纸 | 字口露白 | 墨海麻点 | 透明 |
| `seal` | 朱文印面 | 铁线篆留白 | 朱红印泥 | 透明中宫 |

```bash
python3 apps/coin-cast-app/scripts/design-wuzhu-themes.py
```
""",
        encoding="utf-8",
    )
    print(f"done → {OUT_DIR}")


if __name__ == "__main__":
    main()
