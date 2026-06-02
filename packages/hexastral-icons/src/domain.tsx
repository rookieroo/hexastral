/**
 * Metaphysics domain icons — Five Elements, Yin-Yang, seals, timeline.
 *
 * These icons are used inside reading screens, charts, and reports.
 * They carry heavier symbolic weight than tab icons and may be
 * rendered at larger sizes (32-64px).
 */
import Svg, { Circle, Path } from 'react-native-svg'
import type { IconProps } from './types'

/* -------------------------------------------------------------------------- */
/*  Five Elements (五行)                                                       */
/* -------------------------------------------------------------------------- */

/**
 * WuxingMetalIcon (金)
 *
 * Angular crystal / ingot shape — two mirrored facets meeting at a ridge.
 * Metal is sharp, decisive, contracting.
 */
export function WuxingMetalIcon({
  size = 24,
  color = 'currentColor',
  strokeWidth = 1.5,
  ...rest
}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox='0 0 24 24' fill='none' {...rest}>
      <Path
        d='M12 3l7 8-3 10H8L5 11l7-8z'
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinejoin='round'
      />
      {/* inner facet line — asymmetric, left of centre */}
      <Path
        d='M12 3v10L8 21'
        stroke={color}
        strokeWidth={strokeWidth * 0.6}
        strokeLinecap='round'
        opacity={0.4}
      />
    </Svg>
  )
}

/**
 * WuxingWoodIcon (木)
 *
 * Single tree — vertical trunk, two asymmetric branches reaching up,
 * roots reaching down. Growth, expansion, upward energy.
 * Traced from seal-script 木.
 */
export function WuxingWoodIcon({
  size = 24,
  color = 'currentColor',
  strokeWidth = 1.5,
  ...rest
}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox='0 0 24 24' fill='none' {...rest}>
      {/* trunk */}
      <Path d='M12 3v18' stroke={color} strokeWidth={strokeWidth} strokeLinecap='round' />
      {/* branches — asymmetric: left longer, right higher */}
      <Path d='M12 8L6 4.5' stroke={color} strokeWidth={strokeWidth} strokeLinecap='round' />
      <Path d='M12 7l5.5-2' stroke={color} strokeWidth={strokeWidth} strokeLinecap='round' />
      {/* roots — spread asymmetrically */}
      <Path d='M12 18l-5 3' stroke={color} strokeWidth={strokeWidth * 0.9} strokeLinecap='round' />
      <Path
        d='M12 18l4.5 2.5'
        stroke={color}
        strokeWidth={strokeWidth * 0.9}
        strokeLinecap='round'
      />
    </Svg>
  )
}

/**
 * WuxingWaterIcon (水)
 *
 * Three flowing waves — horizontal, stacked, each with different
 * amplitude. Water is yielding, downward, adaptive.
 * Traced from seal-script 水 (central stroke + side flows).
 */
export function WuxingWaterIcon({
  size = 24,
  color = 'currentColor',
  strokeWidth = 1.5,
  ...rest
}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox='0 0 24 24' fill='none' {...rest}>
      {/* central drop / vertical stroke (seal-script 水 has this) */}
      <Path d='M12 3v5' stroke={color} strokeWidth={strokeWidth} strokeLinecap='round' />
      {/* three waves — increasing amplitude */}
      <Path
        d='M4 11c2-1.5 4.5-1.5 8 0s6 1.5 8 0'
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap='round'
      />
      <Path
        d='M3 15.5c2.5-2 5-2 9 0s6.5 2 9 0'
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap='round'
      />
      <Path
        d='M4 20c2-1.5 4.5-1.5 8 0s6 1.5 8 0'
        stroke={color}
        strokeWidth={strokeWidth * 0.8}
        strokeLinecap='round'
        opacity={0.6}
      />
    </Svg>
  )
}

/**
 * WuxingFireIcon (火)
 *
 * Flame — teardrop body with an inner tongue. Fire is ascending,
 * expanding, illuminating. The outer shape is organic, not symmetric.
 */
export function WuxingFireIcon({
  size = 24,
  color = 'currentColor',
  strokeWidth = 1.5,
  ...rest
}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox='0 0 24 24' fill='none' {...rest}>
      {/* outer flame */}
      <Path
        d='M12 2c-1 3-5 6-5 11 0 4 2.5 7.5 5 8.5 2.5-1 5-4.5 5-8.5 0-5-3.5-8-5-11z'
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinejoin='round'
      />
      {/* inner tongue — smaller, offset left */}
      <Path
        d='M11 12c-.5 1.5-2 2.5-2 4.5 0 1.5 1 3 2.5 3.5'
        stroke={color}
        strokeWidth={strokeWidth * 0.7}
        strokeLinecap='round'
        opacity={0.4}
      />
    </Svg>
  )
}

/**
 * WuxingEarthIcon (土)
 *
 * Mountain / mound — a grounded shape. One primary peak with a
 * secondary shoulder (asymmetry). Earth is stable, centring, nurturing.
 * Traced from seal-script 土 (cross shape) combined with 山 (mountain).
 */
export function WuxingEarthIcon({
  size = 24,
  color = 'currentColor',
  strokeWidth = 1.5,
  ...rest
}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox='0 0 24 24' fill='none' {...rest}>
      {/* primary peak */}
      <Path
        d='M3 19L10 6l4 7 4-3 4 9'
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinejoin='round'
        strokeLinecap='round'
      />
      {/* ground line */}
      <Path d='M2 19h20' stroke={color} strokeWidth={strokeWidth} strokeLinecap='round' />
    </Svg>
  )
}

/* -------------------------------------------------------------------------- */
/*  Yin-Yang / Taiji                                                           */
/* -------------------------------------------------------------------------- */

/**
 * YinYangIcon (太极)
 *
 * Classic taiji symbol — S-curve dividing light and dark, each containing
 * a seed dot of the other. Drawn as strokes, not filled regions.
 */
export function YinYangIcon({
  size = 24,
  color = 'currentColor',
  strokeWidth = 1.5,
  ...rest
}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox='0 0 24 24' fill='none' {...rest}>
      {/* outer circle */}
      <Circle cx={12} cy={12} r={10} stroke={color} strokeWidth={strokeWidth} />
      {/* S-curve divider */}
      <Path d='M12 2c0 5.5-3 5.5-3 10s3 4.5 3 10' stroke={color} strokeWidth={strokeWidth} />
      {/* yang seed (in yin half) */}
      <Circle cx={9.5} cy={7.5} r={1.3} fill={color} />
      {/* yin seed (in yang half) — hollow */}
      <Circle cx={14.5} cy={16.5} r={1.3} stroke={color} strokeWidth={strokeWidth * 0.8} />
    </Svg>
  )
}

/* -------------------------------------------------------------------------- */
/*  Seal / Stamp                                                               */
/* -------------------------------------------------------------------------- */

/**
 * SealStampIcon (印)
 *
 * Square seal impression — outer border with rounded corners (carved seal
 * edge), and an inner abstract character mark. Used for reading confirmation.
 */
export function SealStampIcon({
  size = 24,
  color = 'currentColor',
  strokeWidth = 1.5,
  ...rest
}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox='0 0 24 24' fill='none' {...rest}>
      {/* seal border — slightly rough (not perfectly aligned) */}
      <Path
        d='M4.5 3.5h15v17h-15z'
        stroke={color}
        strokeWidth={strokeWidth * 1.2}
        strokeLinejoin='round'
      />
      {/* inner character mark — abstract brushstrokes suggesting 信 (trust) */}
      <Path
        d='M8 8h8M12 8v8M8.5 13h7'
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap='round'
      />
    </Svg>
  )
}

/* -------------------------------------------------------------------------- */
/*  Timeline                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * DaYunIcon (大运 — decadal fortune)
 *
 * Timeline arrow spanning a decade — a horizontal axis with tick marks
 * and a highlighted segment. Represents 10-year cycles.
 */
export function DaYunIcon({
  size = 24,
  color = 'currentColor',
  strokeWidth = 1.5,
  ...rest
}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox='0 0 24 24' fill='none' {...rest}>
      {/* timeline axis */}
      <Path d='M3 12h18' stroke={color} strokeWidth={strokeWidth} strokeLinecap='round' />
      {/* arrow tip */}
      <Path
        d='M18 8.5l3 3.5-3 3.5'
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap='round'
        strokeLinejoin='round'
      />
      {/* decade tick marks */}
      <Path
        d='M6 9v6M10 10v4M14 10v4M18 9v6'
        stroke={color}
        strokeWidth={strokeWidth * 0.8}
        strokeLinecap='round'
      />
      {/* active segment highlight */}
      <Path
        d='M6 12h8'
        stroke={color}
        strokeWidth={strokeWidth * 2.5}
        strokeLinecap='round'
        opacity={0.2}
      />
    </Svg>
  )
}

/**
 * LiuNianIcon (流年 — annual fortune)
 *
 * Single year marker on a timeline — a vertical stroke with a
 * radiating dot, suggesting a point in time.
 */
export function LiuNianIcon({
  size = 24,
  color = 'currentColor',
  strokeWidth = 1.5,
  ...rest
}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox='0 0 24 24' fill='none' {...rest}>
      {/* timeline axis */}
      <Path
        d='M3 16h18'
        stroke={color}
        strokeWidth={strokeWidth * 0.7}
        strokeLinecap='round'
        opacity={0.4}
      />
      {/* year marker — prominent vertical */}
      <Path d='M12 6v10' stroke={color} strokeWidth={strokeWidth} strokeLinecap='round' />
      {/* radiating dot at top */}
      <Circle cx={12} cy={5} r={2} fill={color} />
      {/* subtle surrounding ticks */}
      <Path
        d='M6 14v2M9 13.5v2.5M15 13.5v2.5M18 14v2'
        stroke={color}
        strokeWidth={strokeWidth * 0.6}
        strokeLinecap='round'
        opacity={0.3}
      />
    </Svg>
  )
}

/**
 * TrigramIcon (八卦 — generic trigram)
 *
 * Three parallel lines — all solid (乾/qian trigram, pure yang).
 * Use as a generic I Ching / divination symbol.
 */
export function TrigramIcon({
  size = 24,
  color = 'currentColor',
  strokeWidth = 1.5,
  ...rest
}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox='0 0 24 24' fill='none' {...rest}>
      <Path d='M5 7h14' stroke={color} strokeWidth={strokeWidth * 1.6} strokeLinecap='round' />
      <Path d='M5 12h14' stroke={color} strokeWidth={strokeWidth * 1.6} strokeLinecap='round' />
      <Path d='M5 17h14' stroke={color} strokeWidth={strokeWidth * 1.6} strokeLinecap='round' />
    </Svg>
  )
}
