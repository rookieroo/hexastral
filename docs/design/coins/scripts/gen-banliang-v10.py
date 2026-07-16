#!/usr/bin/env python3
"""Generate 秦半两 themed faces (v10h): texture-as-background from rubbing / seal refs."""

from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter, ImageOps

ROOT = Path(__file__).resolve().parents[4]
FACE = ROOT / 'apps/coin-cast-app/assets/coins/faces/qin-banliang.png'
TEX = ROOT / 'docs/design/coins/textures'
OUT = TEX / 'study' / 'coins-v10'
SIZE = 1024


def array(im: Image.Image) -> np.ndarray:
    return np.array(im, dtype=np.float32)


def fit(path: Path, box: tuple[float, float, float, float], size: int = SIZE) -> Image.Image:
    im = Image.open(path).convert('RGB')
    w, h = im.size
    x0, y0, x1, y1 = box
    return ImageOps.fit(
        im.crop((int(w * x0), int(h * y0), int(w * x1), int(h * y1))),
        (size, size),
        Image.Resampling.LANCZOS,
    )


def stretch_luma(tex: np.ndarray, p_lo: float = 6, p_hi: float = 94) -> np.ndarray:
    l = tex.mean(2)
    lo, hi = np.percentile(l, [p_lo, p_hi])
    return np.clip((l - lo) / (hi - lo + 1e-6), 0, 1)


def build_masks() -> dict[str, np.ndarray]:
    coin = Image.open(FACE).convert('RGBA').resize((SIZE, SIZE), Image.Resampling.LANCZOS)
    ca = np.array(coin)
    alpha_src = ca[..., 3].astype(np.float32) / 255.0
    rgb = ca[..., :3].astype(np.float32)
    luma = rgb.mean(2)
    yy, xx = np.mgrid[0:SIZE, 0:SIZE]
    c = SIZE / 2
    dist = np.sqrt((xx - c) ** 2 + (yy - c) ** 2)
    hole = (
        (alpha_src < 0.08)
        & (np.abs(xx - c) < SIZE * 0.14)
        & (np.abs(yy - c) < SIZE * 0.14)
    ).astype(np.float32)

    body_core = (alpha_src > 0.90).astype(np.float32)
    body_core = (
        array(Image.fromarray((body_core * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.8)))
        / 255.0
    )
    body_core = np.clip(body_core * (dist < 491).astype(np.float32), 0, 1)
    disc_alpha = body_core * (1 - hole)

    blur = array(Image.fromarray(luma.astype(np.uint8)).filter(ImageFilter.GaussianBlur(20)))
    rel = luma - blur
    hole_zone = (dist < SIZE * 0.11).astype(np.float32)
    raised = np.clip((rel - 5) / 30.0, 0, 1) * body_core * (1 - hole) * (1 - hole_zone)

    g_img = Image.fromarray((np.clip(raised, 0, 1) * 255).astype(np.uint8))
    g_img = g_img.filter(ImageFilter.GaussianBlur(2.0))
    g_bin = g_img.point(lambda v: 255 if v > 58 else 0)
    g_bin = g_bin.filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.MinFilter(5))
    g_bin = g_bin.filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.MinFilter(3))
    arr = np.array(g_bin)
    left_boost = xx < c - SIZE * 0.02
    dilated = np.array(Image.fromarray(arr).filter(ImageFilter.MaxFilter(3)))
    arr = np.where(left_boost, np.maximum(arr, dilated), arr)
    g_bin = Image.fromarray(arr)
    glyph_hard = (np.array(g_bin, dtype=np.float32) / 255.0) > 0.5
    glyph_protect = array(g_bin.filter(ImageFilter.GaussianBlur(14))) / 255.0

    pits_raw = np.clip((-rel - 4) / 26.0, 0, 1) * body_core * (1 - hole) * (1 - glyph_protect)
    pits = (
        array(Image.fromarray((pits_raw * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(12)))
        / 255.0
    )

    return {
        'hole': hole,
        'disc_alpha': disc_alpha,
        'glyph_hard': glyph_hard,
        'glyph_protect': glyph_protect,
        'pits': pits,
    }


def export_rgba(face_rgb: np.ndarray, disc_alpha: np.ndarray) -> Image.Image:
    out = np.zeros((SIZE, SIZE, 4), dtype=np.float32)
    out[..., :3] = np.clip(face_rgb, 0, 255)
    out[..., 3] = disc_alpha * 255
    return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8))


def body_mask(disc_alpha: np.ndarray, hole: np.ndarray, glyph_protect: np.ndarray) -> np.ndarray:
    return disc_alpha * (1 - hole) * (1 - glyph_protect * 0.99)


def load_rubbing_field() -> np.ndarray:
    """碑拓墨海：参考图即底，blur 抹平字口保留拓纸纤维与墨渍走向。"""
    # 左缘墨海 + 拓片纸边，无整字
    raw = fit(TEX / 'tex-rubbing-body.jpg', (0.0, 0.03, 0.14, 0.97))
    raw = raw.filter(ImageFilter.GaussianBlur(10))
    tex = array(raw)
    t = stretch_luma(tex, 5, 96)
    ink_lo = np.array([14.0, 13.0, 12.0], dtype=np.float32)
    ink_hi = np.array([58.0, 54.0, 50.0], dtype=np.float32)
    face = ink_lo + (ink_hi - ink_lo) * t[..., None]
    # 保留少量原图冷暖（纸纤维色偏）
    chroma = tex - tex.mean(2, keepdims=True)
    face = face + chroma * 0.18
    return np.clip(face, 0, 255)


def load_seal_field() -> np.ndarray:
    """印泥膏面：瓷盒朱红即底，保留膏体厚薄与纤维。"""
    raw = fit(TEX / 'skin' / 'seal-paste.jpg', (0.22, 0.38, 0.78, 0.78))
    raw = raw.filter(ImageFilter.GaussianBlur(6))
    tex = array(raw)
    t = stretch_luma(tex, 8, 92)
    deep = np.array([118.0, 36.0, 30.0], dtype=np.float32)
    mid = np.array([168.0, 58.0, 46.0], dtype=np.float32)
    face = deep + (mid - deep) * t[..., None]
    # 叠一点原膏色相，避免变成平涂红
    face = face * 0.72 + tex * 0.28
    face[..., 0] = np.clip(face[..., 0] * 1.06, 0, 255)
    face[..., 1] *= 0.96
    face[..., 2] *= 0.94
    return np.clip(face, 0, 255)


def paint_paper(m: dict[str, np.ndarray], rub_body: np.ndarray) -> Image.Image:
    paper_hi = np.array([246.0, 242.0, 234.0], dtype=np.float32)
    ink_edge = np.array([12.0, 11.0, 10.0], dtype=np.float32)
    bm = body_mask(m['disc_alpha'], m['hole'], m['glyph_protect'])

    face = rub_body.copy()
    # 实图坑洼只做极轻压印（结构，不是噪点）
    face = face * (0.96 + 0.04 * (1 - m['pits'])[..., None])
    face = face * bm[..., None] + (1 - bm[..., None]) * 0

    glyph_hard = m['glyph_hard']
    face[glyph_hard] = paper_hi
    edge = array(Image.fromarray((glyph_hard.astype(np.uint8) * 255)).filter(ImageFilter.FIND_EDGES)) / 255
    lip = (edge > 0.2) & (bm > 0.5)
    face[lip] = face[lip] * 0.25 + ink_edge * 0.75
    return export_rgba(face, m['disc_alpha'])


def paint_seal(m: dict[str, np.ndarray], seal_body: np.ndarray) -> Image.Image:
    cut = np.array([246.0, 240.0, 230.0], dtype=np.float32)
    deep = np.array([108.0, 32.0, 26.0], dtype=np.float32)
    bm = body_mask(m['disc_alpha'], m['hole'], m['glyph_protect'])

    face = seal_body.copy()
    face = face * (0.97 + 0.03 * (1 - m['pits'])[..., None])
    face = face * bm[..., None]

    glyph_hard = m['glyph_hard']
    face[glyph_hard] = cut
    edge = array(Image.fromarray((glyph_hard.astype(np.uint8) * 255)).filter(ImageFilter.FIND_EDGES)) / 255
    lip = (edge > 0.16) & (bm > 0.5)
    face[lip] = face[lip] * 0.72 + deep * 0.28
    return export_rgba(face, m['disc_alpha'])


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    m = build_masks()
    Image.fromarray((m['glyph_hard'] * 255).astype(np.uint8)).save(OUT / 'mask-glyph.png')
    Image.fromarray((m['disc_alpha'] * 255).astype(np.uint8)).save(OUT / 'mask-disc.png')

    rub_body = load_rubbing_field()
    seal_body = load_seal_field()
    paper_img = paint_paper(m, rub_body)
    seal_img = paint_seal(m, seal_body)
    paper_img.save(OUT / 'banliang-paper.png')
    seal_img.save(OUT / 'banliang-seal.png')
    paper_img.save(OUT / 'banliang-rubbing.png')
    paper_img.save(OUT / 'banliang-ink.png')

    a = np.array(paper_img)[..., 3]
    print(f'v10h transparent={(a < 8).mean():.3f} corner={a[0, 0]}')
    print('wrote', OUT)


if __name__ == '__main__':
    main()
