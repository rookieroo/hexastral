#!/usr/bin/env python3
"""
Generate branded Hexastral app icons and splash screen.

Brand identity:
- Background: Deep space black #080812
- Symbol: ☰✦ (trigram + star)
- Primary: Star purple #9B59B6
- Accent: Cyber gold #D4AF37
"""

import os
from PIL import Image, ImageDraw, ImageFont

BASE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'assets')
os.makedirs(BASE, exist_ok=True)

BG = (8, 8, 18)        # #080812
PURPLE = (155, 89, 182)  # #9B59B6
GOLD = (212, 175, 55)    # #D4AF37

def draw_hexastral_icon(size: int) -> Image.Image:
    """Draw the ☰✦ brand icon on deep space background."""
    img = Image.new('RGB', (size, size), BG)
    draw = ImageDraw.Draw(img)

    cx, cy = size // 2, size // 2

    # Draw trigram (☰) — three horizontal bars on the left side
    bar_width = int(size * 0.25)
    bar_height = int(size * 0.04)
    bar_gap = int(size * 0.07)
    bar_x = cx - int(size * 0.15)

    for i in range(3):
        y = cy - bar_gap + i * bar_gap - bar_height // 2
        draw.rounded_rectangle(
            [bar_x - bar_width // 2, y, bar_x + bar_width // 2, y + bar_height],
            radius=bar_height // 2,
            fill=GOLD
        )

    # Draw four-pointed star (✦) on the right side
    star_x = cx + int(size * 0.15)
    star_size = int(size * 0.12)

    # Diamond shape for ✦
    points = [
        (star_x, cy - star_size),
        (star_x + star_size * 0.5, cy),
        (star_x, cy + star_size),
        (star_x - star_size * 0.5, cy),
    ]
    draw.polygon(points, fill=PURPLE)

    # Inner small diamond for sparkle effect
    inner = star_size * 0.3
    inner_points = [
        (star_x, cy - inner),
        (star_x + inner * 0.5, cy),
        (star_x, cy + inner),
        (star_x - inner * 0.5, cy),
    ]
    draw.polygon(inner_points, fill=(200, 160, 220))

    return img


def draw_splash(width: int, height: int) -> Image.Image:
    """Draw splash screen: icon + brand text."""
    img = Image.new('RGB', (width, height), BG)
    draw = ImageDraw.Draw(img)

    cx, cy = width // 2, height // 2
    icon_size = min(width, height) // 5

    # Trigram bars
    bar_width = int(icon_size * 0.6)
    bar_height = max(4, int(icon_size * 0.06))
    bar_gap = int(icon_size * 0.14)

    for i in range(3):
        y = cy - int(height * 0.08) - bar_gap + i * bar_gap
        draw.rounded_rectangle(
            [cx - bar_width // 2 - int(icon_size * 0.3), y,
             cx - bar_width // 2 - int(icon_size * 0.3) + bar_width, y + bar_height],
            radius=bar_height // 2,
            fill=GOLD
        )

    # Star
    star_x = cx + int(icon_size * 0.3)
    star_y = cy - int(height * 0.08)
    star_sz = int(icon_size * 0.25)
    points = [
        (star_x, star_y - star_sz),
        (star_x + star_sz * 0.5, star_y),
        (star_x, star_y + star_sz),
        (star_x - star_sz * 0.5, star_y),
    ]
    draw.polygon(points, fill=PURPLE)

    # Brand text
    try:
        font_paths = [
            '/System/Library/Fonts/PingFang.ttc',
            '/System/Library/Fonts/STHeiti Light.ttc',
        ]
        font_large = None
        for fp in font_paths:
            if os.path.exists(fp):
                font_large = ImageFont.truetype(fp, int(icon_size * 0.6))
                font_small = ImageFont.truetype(fp, int(icon_size * 0.18))
                break
        if not font_large:
            font_large = ImageFont.load_default()
            font_small = ImageFont.load_default()
    except Exception:
        font_large = ImageFont.load_default()
        font_small = font_large

    text_y = cy + int(height * 0.02)
    draw.text((cx, text_y), '玄易', fill=PURPLE, font=font_large, anchor='mt')

    sub_y = text_y + int(icon_size * 0.7)
    draw.text((cx, sub_y), 'HEXASTRAL', fill=GOLD, font=font_small, anchor='mt')

    return img


if __name__ == '__main__':
    icon = draw_hexastral_icon(1024)
    icon.save(os.path.join(BASE, 'icon.png'))
    print('✓ icon.png (1024x1024)')

    icon.save(os.path.join(BASE, 'adaptive-icon.png'))
    print('✓ adaptive-icon.png (1024x1024)')

    favicon = draw_hexastral_icon(48)
    favicon.save(os.path.join(BASE, 'favicon.png'))
    print('✓ favicon.png (48x48)')

    splash = draw_splash(1284, 2778)
    splash.save(os.path.join(BASE, 'splash.png'))
    print('✓ splash.png (1284x2778)')

    print(f'\nAll assets saved to {BASE}')
