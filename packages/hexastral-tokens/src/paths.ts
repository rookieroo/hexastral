/**
 * SVG path data library — the "ink-stone" decorative asset bank.
 *
 * All values are raw SVG `d` attribute strings or viewBox-relative coordinate
 * arrays. Platform renderers wrap them in <Path> (RN) or <path> (web).
 *
 * Categories:
 *   - 八卦 trigrams (decorative background matrix)
 *   - 篆刻 seal frames (stamp borders)
 *   - 山水 landscape silhouettes (mountain ridges)
 *   - 纹理 texture patterns (concentric rings, topo lines, ink wash)
 */

// ── Bagua trigrams (八卦) ────────────────────────────────────────────────────
// Each trigram as 3 horizontal lines (solid = yang, broken = yin).
// Lines at y=0, y=10, y=20 within a 24×24 viewBox.
// Solid line: M2,y H22    Broken line: M2,y H10 M14,y H22

export interface TrigramDef {
  name: string
  cjk: string
  /** 3 lines from bottom to top: true = yang (solid), false = yin (broken) */
  lines: [boolean, boolean, boolean]
}

export const TRIGRAMS: TrigramDef[] = [
  { name: 'qian', cjk: '乾', lines: [true, true, true] },
  { name: 'dui', cjk: '兑', lines: [true, true, false] },
  { name: 'li', cjk: '離', lines: [true, false, true] },
  { name: 'zhen', cjk: '震', lines: [true, false, false] },
  { name: 'xun', cjk: '巽', lines: [false, true, true] },
  { name: 'kan', cjk: '坎', lines: [false, true, false] },
  { name: 'gen', cjk: '艮', lines: [false, false, true] },
  { name: 'kun', cjk: '坤', lines: [false, false, false] },
]

/** Generate SVG path `d` for a single trigram within a 24×24 viewBox. */
export function trigramToPath(lines: [boolean, boolean, boolean]): string {
  const yPositions = [18, 10, 2] // bottom to top
  return lines
    .map((solid, i) => {
      const y = yPositions[i]
      return solid ? `M3,${y} H21` : `M3,${y} H10 M14,${y} H21`
    })
    .join(' ')
}

/** 8×8 trigram matrix positions (64 hexagram grid) for background decoration. */
export function trigramMatrixPositions(
  cols: number,
  rows: number,
  cellSize: number,
  padding: number
): Array<{ x: number; y: number; trigramIndex: number }> {
  const result: Array<{ x: number; y: number; trigramIndex: number }> = []
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      result.push({
        x: padding + col * cellSize,
        y: padding + row * cellSize,
        trigramIndex: (row * cols + col) % 8,
      })
    }
  }
  return result
}

// ── Seal frames (篆刻印框) ──────────────────────────────────────────────────
// Slightly irregular rectangles simulating stone-carved edges.

/** Outer seal border — irregular square. ViewBox 0 0 100 100. */
export const SEAL_FRAME_PATH =
  'M8,4 L93,3 Q97,3 97,7 L98,92 Q98,97 94,97 L7,98 Q3,98 3,94 L4,8 Q4,4 8,4 Z'

/** Inner seal border (double-frame style). ViewBox 0 0 100 100. */
export const SEAL_INNER_PATH =
  'M14,11 L87,10 Q89,10 89,12 L90,88 Q90,90 88,90 L13,91 Q11,91 11,89 L10,13 Q10,11 14,11 Z'

// ── Mountain ridges (山脊线) ─────────────────────────────────────────────────
// Career report background — continuous mountain silhouette.
// ViewBox 0 0 400 80.

export const MOUNTAIN_RIDGE_1 =
  'M0,70 Q30,45 60,55 T120,40 T180,52 T240,35 T300,48 T360,30 L400,42 L400,80 L0,80 Z'

export const MOUNTAIN_RIDGE_2 =
  'M0,75 Q50,60 80,65 T150,50 T210,58 T280,42 T340,55 L400,48 L400,80 L0,80 Z'

// ── Concentric rings (年轮) ──────────────────────────────────────────────────
// Decadal report overlay — rings emanating from center.

/**
 * Generate concentric ring SVG circles as path data.
 * Returns array of `d` strings for concentric circle paths.
 */
export function concentricRings(
  cx: number,
  cy: number,
  count: number,
  minR: number,
  maxR: number
): string[] {
  const step = (maxR - minR) / (count - 1 || 1)
  return Array.from({ length: count }, (_, i) => {
    const r = minR + i * step
    // SVG arc circle: M cx-r,cy a r,r 0 1,1 2r,0 a r,r 0 1,1 -2r,0
    return `M${cx - r},${cy} a${r},${r} 0 1,1 ${r * 2},0 a${r},${r} 0 1,1 ${-r * 2},0`
  })
}

// ── Topographic contours (等高线) ────────────────────────────────────────────
// Wealth report — converging toward center.

export const TOPO_CONTOURS = [
  'M20,60 Q80,20 160,45 T300,30 T380,50',
  'M15,68 Q90,32 170,52 T310,38 T385,55',
  'M25,76 Q100,44 180,60 T320,46 T390,62',
  'M30,82 Q110,56 185,68 T325,54 T395,68',
]

// ── Entwined threads (缠丝) ─────────────────────────────────────────────────
// Synastry/love report — two sinusoidal paths crossing.

export const THREAD_RED = 'M0,50 C60,20 120,80 200,50 C280,20 340,80 400,50'

export const THREAD_WHITE = 'M0,50 C60,80 120,20 200,50 C280,80 340,20 400,50'

// ── Scatter dots (星散) ──────────────────────────────────────────────────────
// Pseudo-random star field for constellation / daily fortune overlays.

/**
 * Generate deterministic scatter positions from a seed.
 * Returns fractional [0,1) coordinates for each dot.
 */
export function scatterPositions(
  count: number,
  seed = 42
): Array<{ x: number; y: number; r: number }> {
  // Simple LCG for determinism
  let s = seed
  function next(): number {
    s = (s * 1103515245 + 12345) & 0x7fffffff
    return s / 0x7fffffff
  }
  return Array.from({ length: count }, () => ({
    x: next(),
    y: next(),
    r: next() * 1.2 + 0.3,
  }))
}

// ── Ink wash blob (墨晕) ─────────────────────────────────────────────────────
// Annual report — diffused blob at lower-right corner.
// ViewBox 0 0 200 200, positioned at ~(0.6, 0.6) of the card.

export const INK_WASH_BLOB =
  'M140,120 Q160,100 170,130 T180,160 Q170,185 145,180 T115,165 Q105,145 120,130 T140,120 Z'

// ── Grid overlay (正交网格) ──────────────────────────────────────────────────
// Used below mountain ridges in career report.

export function orthogonalGrid(width: number, height: number, cellSize: number): string {
  const lines: string[] = []
  for (let x = cellSize; x < width; x += cellSize) {
    lines.push(`M${x},0 V${height}`)
  }
  for (let y = cellSize; y < height; y += cellSize) {
    lines.push(`M0,${y} H${width}`)
  }
  return lines.join(' ')
}
