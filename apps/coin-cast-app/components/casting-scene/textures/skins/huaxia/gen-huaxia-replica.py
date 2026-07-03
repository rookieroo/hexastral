"""DEPRECATED — font/bitmap 临摹版已弃用。

华夏史币的碑拓/印章请使用:
  python3 gen-huaxia-tracing.py   → dist/tracing/  (DoG 线稿 + original 墨拓滤镜)
  python3 gen-seal-from-tracing.py → dist/seal-photo/

不复刻照片像素，不使用现代字体。照片仅作对读布局与笔画形态参考。
"""
import sys

print(__doc__, file=sys.stderr)
sys.exit(1)
