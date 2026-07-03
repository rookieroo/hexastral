#!/usr/bin/env python3
"""Download OFL / open-data fonts for huaxia type-skin pipeline.

Run from repo: python3 apps/coin-cast-app/.../huaxia/fonts/setup-fonts.py
"""
from __future__ import annotations

import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))

# url, output filename
ASSETS: list[tuple[str, str]] = [
    (
        "https://github.com/lxgw/LxgwWenKai/releases/download/v1.521/LXGWWenKai-Regular.ttf",
        "LXGWWenKai-Regular.ttf",
    ),
    (
        "https://github.com/lxgw/lxgwzhenkai/releases/download/v0.825/LXGWZhenKaiGB-Regular.ttf",
        "LXGWZhenKaiGB-Regular.ttf",
    ),
    (
        "https://raw.githubusercontent.com/AlexanderMisel/font-test/gh-pages/EBAS.ttf",
        "Shuowen.ttf",
    ),
]


def main() -> None:
    os.makedirs(HERE, exist_ok=True)
    for url, name in ASSETS:
        dest = os.path.join(HERE, name)
        if os.path.isfile(dest) and os.path.getsize(dest) > 10_000:
            print(f"  skip {name} (present)")
            continue
        print(f"  fetch {name}")
        subprocess.run(["curl", "-fsSL", "-o", dest, url], check=True)
    missing = [n for _, n in ASSETS if not os.path.isfile(os.path.join(HERE, n))]
    if missing:
        print("missing:", ", ".join(missing), file=sys.stderr)
        sys.exit(1)
    print(f"fonts ready → {HERE}/")


if __name__ == "__main__":
    main()
