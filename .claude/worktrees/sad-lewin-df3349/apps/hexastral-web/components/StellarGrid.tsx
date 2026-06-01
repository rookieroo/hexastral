/**
 * StellarGrid — 4×3 responsive 12-palace grid for public chart display.
 *
 * Renders Stellar Chart palaces with star brightness + 四化 indicators.
 * Consumes color tokens from @zhop/hexastral-tokens/palette.
 */

import { brightnessColors, mutagenColors, palaceColors } from '@zhop/hexastral-tokens/palette'

interface MajorStar {
  name: string
  brightness: string
  mutagen: string | null
}

interface MinorStar {
  name: string
  type: string
  mutagen: string | null
}

interface Palace {
  index: number
  name: string
  heavenlyStem: string
  earthlyBranch: string
  isBodyPalace?: boolean
  majorStars: MajorStar[]
  minorStars: MinorStar[]
  decadal?: {
    range: [number, number]
    heavenlyStem: string
    earthlyBranch: string
  }
}

interface ChartMeta {
  soul: string
  body: string
  soulPalace: string
  bodyPalace: string
  fiveElementType: string
}

interface StellarGridProps {
  palaces: Palace[]
  meta?: ChartMeta
}

/**
 * Standard 4×3 Zi Wei grid layout.
 *
 * The 12 palaces are arranged clockwise starting from 命宮:
 *
 *   [ 巳 ]  [ 午 ]  [ 未 ]  [ 申 ]
 *   [ 辰 ]                  [ 酉 ]
 *   [ 卯 ]                  [ 戌 ]
 *   [ 寅 ]  [ 丑 ]  [ 子 ]  [ 亥 ]
 *
 * Grid positions map palace index → CSS grid area.
 */
const GRID_POSITIONS: Record<number, { row: number; col: number }> = {
  0: { row: 4, col: 2 }, // 寅
  1: { row: 4, col: 1 }, // 丑 (actually display index maps may vary)
  2: { row: 4, col: 4 }, // 子 → bottom row
  3: { row: 4, col: 3 },
  4: { row: 1, col: 1 }, // 巳 → top-left
  5: { row: 1, col: 2 },
  6: { row: 1, col: 3 },
  7: { row: 1, col: 4 },
  8: { row: 2, col: 4 },
  9: { row: 3, col: 4 },
  10: { row: 3, col: 1 },
  11: { row: 2, col: 1 },
}

/**
 * Traditional Zi Wei grid:
 * Earthly branches in counter-clockwise order starting from 寅 (index 0).
 * Palace assignment depends on the chart, but the grid cell → branch mapping is fixed.
 *
 * We use the earthlyBranch from each palace to position them.
 */
const BRANCH_TO_GRID: Record<string, { row: number; col: number }> = {
  寅: { row: 4, col: 1 },
  卯: { row: 3, col: 1 },
  辰: { row: 2, col: 1 },
  巳: { row: 1, col: 1 },
  午: { row: 1, col: 2 },
  未: { row: 1, col: 3 },
  申: { row: 1, col: 4 },
  酉: { row: 2, col: 4 },
  戌: { row: 3, col: 4 },
  亥: { row: 4, col: 4 },
  子: { row: 4, col: 3 },
  丑: { row: 4, col: 2 },
}

function StarPill({ star }: { star: MajorStar }) {
  const brightnessColor = brightnessColors[star.brightness] ?? '#6B7280'
  const mutagen = star.mutagen ? mutagenColors[star.mutagen] : null

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 3,
        fontSize: '0.7rem',
        lineHeight: 1,
      }}
    >
      <span style={{ color: brightnessColor, fontWeight: 500 }}>{star.name}</span>
      <span style={{ color: brightnessColor, fontSize: '0.55rem', opacity: 0.7 }}>
        {star.brightness}
      </span>
      {mutagen && (
        <span
          style={{
            fontSize: '0.55rem',
            padding: '1px 3px',
            borderRadius: 2,
            background: mutagen.bg,
            color: mutagen.text,
            fontWeight: 600,
          }}
        >
          {star.mutagen}
        </span>
      )}
    </span>
  )
}

function PalaceCell({ palace }: { palace: Palace }) {
  const headerColor = palaceColors[palace.name] ?? 'var(--color-ivory-dim)'
  const pos = BRANCH_TO_GRID[palace.earthlyBranch]
  if (!pos) return null

  return (
    <div
      style={{
        gridRow: pos.row,
        gridColumn: pos.col,
        border: '1px solid var(--color-border)',
        padding: '0.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        minHeight: 100,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Palace name header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span style={{ fontSize: '0.72rem', fontWeight: 600, color: headerColor }}>
          {palace.name}
          {palace.isBodyPalace && (
            <span style={{ fontSize: '0.55rem', opacity: 0.6, marginLeft: 2 }}>身</span>
          )}
        </span>
        <span style={{ fontSize: '0.6rem', color: 'var(--color-ivory-dim)', opacity: 0.5 }}>
          {palace.heavenlyStem}
          {palace.earthlyBranch}
        </span>
      </div>

      {/* Major stars */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {palace.majorStars.map((star) => (
          <StarPill key={star.name} star={star} />
        ))}
      </div>

      {/* Minor stars — compact, dimmer */}
      {palace.minorStars.length > 0 && (
        <div
          style={{
            fontSize: '0.55rem',
            color: 'var(--color-ivory-dim)',
            opacity: 0.6,
            lineHeight: 1.4,
          }}
        >
          {palace.minorStars.map((s) => s.name).join(' ')}
        </div>
      )}

      {/* Decadal age range */}
      {palace.decadal && (
        <span
          style={{
            fontSize: '0.5rem',
            color: 'var(--color-ivory-dim)',
            opacity: 0.4,
            marginTop: 'auto',
          }}
        >
          {palace.decadal.range[0]}–{palace.decadal.range[1]}
        </span>
      )}
    </div>
  )
}

export function StellarGrid({ palaces, meta }: StellarGridProps) {
  if (!palaces || palaces.length === 0) return null

  return (
    <div>
      {/* Meta summary — soul + body stars */}
      {meta && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '1.5rem',
            marginBottom: '0.75rem',
            fontSize: '0.75rem',
            color: 'var(--color-ivory-muted)',
          }}
        >
          <span>
            命主 <span style={{ color: 'var(--color-gold)', fontWeight: 500 }}>{meta.soul}</span>
          </span>
          <span>
            身主 <span style={{ color: 'var(--color-gold)', fontWeight: 500 }}>{meta.body}</span>
          </span>
          <span>{meta.fiveElementType}</span>
        </div>
      )}

      {/* 4×3 grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gridTemplateRows: 'repeat(4, auto)',
          gap: 0,
        }}
      >
        {palaces.map((palace) => (
          <PalaceCell key={palace.index} palace={palace} />
        ))}

        {/* Center area (rows 2-3, cols 2-3) — chart title */}
        <div
          style={{
            gridRow: '2 / 4',
            gridColumn: '2 / 4',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid var(--color-border)',
            padding: '1rem',
            textAlign: 'center',
            gap: 6,
          }}
        >
          <span
            style={{
              fontSize: '0.65rem',
              letterSpacing: '0.2em',
              color: 'var(--color-ivory-dim)',
              textTransform: 'uppercase',
            }}
          >
            星宫命理
          </span>
          <span
            style={{
              fontSize: '1.1rem',
              fontWeight: 300,
              color: 'var(--color-gold)',
              letterSpacing: '0.1em',
            }}
          >
            命盘
          </span>
        </div>
      </div>
    </div>
  )
}
