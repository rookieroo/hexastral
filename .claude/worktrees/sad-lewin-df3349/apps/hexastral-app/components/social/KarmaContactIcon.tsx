/**
 * KarmaContactIcon — Intricate geometric SVG badges per Five Element (五行)
 *
 * Each of the five Chinese metaphysical elements maps to a distinct
 * sacred‑geometry pattern rendered in ultra‑thin strokes.
 *
 *   金 Metal  → Octagram  (2 overlapping squares, 8‑pointed star)
 *   木 Wood   → Triforce  (3 stacked ascending equilateral triangles)
 *   水 Water  → Concentric Circles + center dot + 4 axis ticks
 *   火 Fire   → Nested Diamonds (outer + inner, 45° rotated square lattice)
 *   土 Earth  → Hexagram  (Star of David — heaven meets earth)
 */

import Svg, { Circle, Line, Polygon } from 'react-native-svg'

export type FiveElement = '金' | '木' | '水' | '火' | '土'

/** Element accent colours — subdued for dark mode brutalism */
export const ELEMENT_COLORS: Record<FiveElement, string> = {
  金: '#AEAEC4', // silver‑purple
  木: '#4EC994', // jade
  水: '#5BA8D4', // cerulean
  火: '#E8734C', // ember
  土: '#D4AF37', // cyber gold
}

interface Props {
  element: FiveElement
  size?: number
}

// ─── helpers ────────────────────────────────────────────────────────────────

function octagramPoints(size: number): string {
  const c = size / 2
  const outerR = size * 0.42
  const innerR = size * 0.18
  const pts: string[] = []
  for (let i = 0; i < 16; i++) {
    const angle = (i * 22.5 - 90) * (Math.PI / 180)
    const r = i % 2 === 0 ? outerR : innerR
    pts.push(`${(c + r * Math.cos(angle)).toFixed(2)},${(c + r * Math.sin(angle)).toFixed(2)}`)
  }
  return pts.join(' ')
}

function trianglePoints(cx: number, cy: number, r: number): string {
  return [0, 1, 2]
    .map((i) => {
      const a = (i * 120 - 90) * (Math.PI / 180)
      return `${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`
    })
    .join(' ')
}

function _hexagramPath(cx: number, cy: number, r: number): string {
  // Up triangle
  const up = ([0, 1, 2] as const)
    .map((i) => {
      const a = (i * 120 - 90) * (Math.PI / 180)
      return `${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`
    })
    .join(' ')
  // Down triangle (rotated 180°)
  const dn = ([0, 1, 2] as const)
    .map((i) => {
      const a = (i * 120 + 90) * (Math.PI / 180)
      return `${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`
    })
    .join(' ')
  return `${up} | ${dn}` // returned separately for two <Polygon> elements
}

// ─── icon renderers ──────────────────────────────────────────────────────────

function MetalIcon({ size, color }: { size: number; color: string }) {
  const sw = Math.max(0.7, size * 0.023)
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Outer octagram */}
      <Polygon
        points={octagramPoints(size)}
        fill='none'
        stroke={color}
        strokeWidth={sw}
        strokeLinejoin='miter'
      />
      {/* Inner tight octagram */}
      <Polygon
        points={octagramPoints(size * 0.52)}
        fill='none'
        stroke={color}
        strokeWidth={sw * 0.7}
        strokeLinejoin='miter'
        x={size * 0.24}
        y={size * 0.24}
      />
      {/* Center dot */}
      <Circle cx={size / 2} cy={size / 2} r={size * 0.05} fill={color} />
    </Svg>
  )
}

function WoodIcon({ size, color }: { size: number; color: string }) {
  const sw = Math.max(0.7, size * 0.023)
  const cx = size / 2
  // Three ascending triangles: large base, shrinks toward top
  const tiers = [
    { cy: size * 0.72, r: size * 0.38 },
    { cy: size * 0.5, r: size * 0.24 },
    { cy: size * 0.32, r: size * 0.13 },
  ]
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {tiers.map(({ cy, r }, idx) => (
        <Polygon
          key={idx}
          points={trianglePoints(cx, cy, r)}
          fill='none'
          stroke={color}
          strokeWidth={sw}
          strokeLinejoin='miter'
        />
      ))}
    </Svg>
  )
}

function WaterIcon({ size, color }: { size: number; color: string }) {
  const sw = Math.max(0.7, size * 0.023)
  const cx = size / 2
  const cy = size / 2
  const radii = [size * 0.14, size * 0.26, size * 0.4]
  // 4 axis tick marks outside the outer ring
  const tickOuter = size * 0.48
  const tickInner = size * 0.43
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {radii.map((r, idx) => (
        <Circle
          key={idx}
          cx={cx}
          cy={cy}
          r={r}
          fill='none'
          stroke={color}
          strokeWidth={sw * (idx === 0 ? 0.6 : 1)}
        />
      ))}
      {/* Axis ticks at N/E/S/W */}
      {[0, 90, 180, 270].map((deg) => {
        const rad = (deg * Math.PI) / 180
        return (
          <Line
            key={deg}
            x1={cx + tickInner * Math.cos(rad)}
            y1={cy + tickInner * Math.sin(rad)}
            x2={cx + tickOuter * Math.cos(rad)}
            y2={cy + tickOuter * Math.sin(rad)}
            stroke={color}
            strokeWidth={sw}
          />
        )
      })}
      {/* Center dot */}
      <Circle cx={cx} cy={cy} r={size * 0.04} fill={color} />
    </Svg>
  )
}

function FireIcon({ size, color }: { size: number; color: string }) {
  const sw = Math.max(0.7, size * 0.023)
  const cx = size / 2
  const cy = size / 2
  // Outer diamond
  const outerR = size * 0.42
  // Inner diamond
  const innerR = size * 0.22
  const diamond = (r: number) => `${cx},${cy - r} ${cx + r},${cy} ${cx},${cy + r} ${cx - r},${cy}`
  // Cross‑hatch: connect outer corners through center
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Polygon
        points={diamond(outerR)}
        fill='none'
        stroke={color}
        strokeWidth={sw}
        strokeLinejoin='miter'
      />
      <Polygon
        points={diamond(innerR)}
        fill='none'
        stroke={color}
        strokeWidth={sw}
        strokeLinejoin='miter'
      />
      {/* 4 connecting lines: outer mid-sides to inner mid-sides (lattice) */}
      <Line
        x1={cx}
        y1={cy - outerR}
        x2={cx}
        y2={cy - innerR}
        stroke={color}
        strokeWidth={sw * 0.6}
      />
      <Line
        x1={cx}
        y1={cy + outerR}
        x2={cx}
        y2={cy + innerR}
        stroke={color}
        strokeWidth={sw * 0.6}
      />
      <Line
        x1={cx - outerR}
        y1={cy}
        x2={cx - innerR}
        y2={cy}
        stroke={color}
        strokeWidth={sw * 0.6}
      />
      <Line
        x1={cx + outerR}
        y1={cy}
        x2={cx + innerR}
        y2={cy}
        stroke={color}
        strokeWidth={sw * 0.6}
      />
      <Circle cx={cx} cy={cy} r={size * 0.04} fill={color} />
    </Svg>
  )
}

function EarthIcon({ size, color }: { size: number; color: string }) {
  const sw = Math.max(0.7, size * 0.023)
  const cx = size / 2
  const cy = size / 2
  const r = size * 0.38
  // Upward triangle — apex at top
  const upPts = ([0, 1, 2] as const)
    .map((i) => {
      const a = (i * 120 - 90) * (Math.PI / 180)
      return `${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`
    })
    .join(' ')
  // Downward triangle — apex at bottom
  const dnPts = ([0, 1, 2] as const)
    .map((i) => {
      const a = (i * 120 + 90) * (Math.PI / 180)
      return `${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`
    })
    .join(' ')
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Polygon points={upPts} fill='none' stroke={color} strokeWidth={sw} strokeLinejoin='miter' />
      <Polygon points={dnPts} fill='none' stroke={color} strokeWidth={sw} strokeLinejoin='miter' />
      <Circle cx={cx} cy={cy} r={size * 0.06} fill='none' stroke={color} strokeWidth={sw * 0.8} />
    </Svg>
  )
}

// ─── public component ────────────────────────────────────────────────────────

export function KarmaContactIcon({ element, size = 38 }: Props) {
  const color = ELEMENT_COLORS[element]
  switch (element) {
    case '金':
      return <MetalIcon size={size} color={color} />
    case '木':
      return <WoodIcon size={size} color={color} />
    case '水':
      return <WaterIcon size={size} color={color} />
    case '火':
      return <FireIcon size={size} color={color} />
    case '土':
      return <EarthIcon size={size} color={color} />
  }
}
