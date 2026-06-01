/**
 * Tab bar icons for all HexAstral satellite apps.
 *
 * Design language:
 *   - 24x24 viewBox, stroke-based, strokeLinecap/Linejoin round
 *   - Authentic 古字 traces where possible, prefer asymmetry, keep minimal
 *   - Each icon should be recognisable at 20-28px rendered size
 *
 * Naming: <ConceptIcon> — matches the satellite or tab it represents.
 */
import Svg, { Circle, Path } from 'react-native-svg'
import type { IconProps } from './types'

/* -------------------------------------------------------------------------- */
/*  fate-app                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * BaziIcon (八字 tab)
 *
 * Essence of 命 (fate): a heaven-bar at top, a vertical axis of destiny
 * dropping down, and an open wedge at the bottom representing the human
 * receiving heaven's mandate. Three strokes, asymmetric weight.
 */
export function BaziIcon({ size = 24, color = 'currentColor', strokeWidth = 1.5, ...rest }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...rest}>
      {/* heaven bar — slightly off-centre, thicker feel */}
      <Path d="M5 5h14" stroke={color} strokeWidth={strokeWidth * 1.15} strokeLinecap="round" />
      {/* axis of destiny */}
      <Path d="M12 5v10" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      {/* human receiving — open wedge, left stroke slightly longer (asymmetry) */}
      <Path d="M6.5 21l5.5-6 4.5 5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

/**
 * ZiweiIcon (紫微 tab)
 *
 * The Purple Forbidden Enclosure — Polaris (紫微星) at centre, six
 * constellation stars around it in an organic, asymmetric scatter.
 * Faint connecting lines evoke star-chart aesthetics.
 */
export function ZiweiIcon({ size = 24, color = 'currentColor', strokeWidth = 1.5, ...rest }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...rest}>
      {/* Polaris — central, larger */}
      <Circle cx={12} cy={10} r={2.2} fill={color} />
      {/* surrounding constellation (asymmetric placement) */}
      <Circle cx={5} cy={6} r={1.3} fill={color} />
      <Circle cx={18.5} cy={4.5} r={1} fill={color} />
      <Circle cx={20} cy={13} r={1.1} fill={color} />
      <Circle cx={15.5} cy={19} r={1.2} fill={color} />
      <Circle cx={6} cy={17} r={1} fill={color} />
      {/* faint connecting lines — star chart feel */}
      <Path
        d="M5 6l7 4M18.5 4.5L12 10M20 13l-8-3M15.5 19l-3.5-9M6 17l6-7"
        stroke={color}
        strokeWidth={strokeWidth * 0.5}
        strokeLinecap="round"
        opacity={0.3}
      />
    </Svg>
  )
}

/**
 * ProfileIcon (我 tab) — used across all apps
 *
 * Minimal standing figure: circle head, single brushstroke body curve.
 * Inspired by seal-script 人 but with a circular head for modernity.
 */
export function ProfileIcon({ size = 24, color = 'currentColor', strokeWidth = 1.5, ...rest }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...rest}>
      <Circle cx={12} cy={7.5} r={3.5} stroke={color} strokeWidth={strokeWidth} />
      {/* body — single organic curve, slightly asymmetric shoulders */}
      <Path
        d="M6 21c0-4.5 2.5-7.5 6-7.5s6 3 6 7.5"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
    </Svg>
  )
}

/* -------------------------------------------------------------------------- */
/*  cycle-app                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * AlmanacIcon (今日 tab)
 *
 * Calendar page with a seal-dot marking "today". The page has a torn top
 * edge (traditional tear-off calendar / 日历) and a prominent dot.
 */
export function AlmanacIcon({ size = 24, color = 'currentColor', strokeWidth = 1.5, ...rest }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...rest}>
      {/* page body */}
      <Path
        d="M5 4h14v17H5V4z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
      {/* top binding holes — two small marks */}
      <Path d="M9 4v-1.5M15 4v-1.5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      {/* today seal — slightly off-centre dot */}
      <Circle cx={12} cy={13} r={2.5} fill={color} />
      {/* top text line suggestion */}
      <Path d="M8 8h8" stroke={color} strokeWidth={strokeWidth * 0.8} strokeLinecap="round" opacity={0.5} />
    </Svg>
  )
}

/**
 * MonthViewIcon (月 tab)
 *
 * Crescent moon — the character 月 evolved from a crescent pictograph.
 * Asymmetric crescent with a subtle inner arc for depth.
 */
export function MonthViewIcon({ size = 24, color = 'currentColor', strokeWidth = 1.5, ...rest }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...rest}>
      {/* outer crescent arc */}
      <Path
        d="M16 3.5C10 3.5 5.5 8 5.5 13.5S10 22 16 22c-3 0-7-3-7-9s3.5-9.5 7-9.5z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
      {/* inner detail — two short horizontal lines evoking ancient 月 glyph */}
      <Path
        d="M10 10.5h3M10 14.5h2.5"
        stroke={color}
        strokeWidth={strokeWidth * 0.7}
        strokeLinecap="round"
        opacity={0.4}
      />
    </Svg>
  )
}

/* -------------------------------------------------------------------------- */
/*  yuan-app                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * BondIcon (缘 tab)
 *
 * Two rings linked by a curved thread — the red thread of fate (红线).
 * Left ring slightly larger (self), right slightly higher (other).
 */
export function BondIcon({ size = 24, color = 'currentColor', strokeWidth = 1.5, ...rest }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...rest}>
      {/* self ring — left, slightly larger */}
      <Circle cx={9} cy={12} r={4.5} stroke={color} strokeWidth={strokeWidth} />
      {/* other ring — right, slightly smaller, offset up */}
      <Circle cx={16} cy={10.5} r={3.8} stroke={color} strokeWidth={strokeWidth} />
      {/* red thread connecting — subtle curve underneath */}
      <Path
        d="M4.5 16c2 3 5 4.5 8 3.5s5.5-3.5 7-6"
        stroke={color}
        strokeWidth={strokeWidth * 0.7}
        strokeLinecap="round"
        strokeDasharray="2 2.5"
        opacity={0.45}
      />
    </Svg>
  )
}

/* -------------------------------------------------------------------------- */
/*  feng-app                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * DwellingIcon (宅 tab / sites list)
 *
 * Traditional Chinese roof silhouette — curved eaves, central ridge,
 * two pillars. Evokes 宅 without being a literal house icon.
 */
export function DwellingIcon({ size = 24, color = 'currentColor', strokeWidth = 1.5, ...rest }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...rest}>
      {/* curved roof eaves */}
      <Path
        d="M2 11c1-1 3-2 4.5-5.5L12 3l5.5 2.5C19 9 21 10 22 11"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* ridge line */}
      <Path d="M6.5 10v10M17.5 10v10" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      {/* floor */}
      <Path d="M5 20h14" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      {/* door opening */}
      <Path d="M10.5 20v-5h3v5" stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round" />
    </Svg>
  )
}

/**
 * LuopanIcon (罗盘 tab / compass)
 *
 * Feng-shui compass — concentric rings with a central needle and
 * four cardinal tick marks. The needle is slightly off-north (asymmetry).
 */
export function LuopanIcon({ size = 24, color = 'currentColor', strokeWidth = 1.5, ...rest }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...rest}>
      {/* outer ring */}
      <Circle cx={12} cy={12} r={9.5} stroke={color} strokeWidth={strokeWidth} />
      {/* inner ring */}
      <Circle cx={12} cy={12} r={5} stroke={color} strokeWidth={strokeWidth * 0.7} opacity={0.5} />
      {/* cardinal ticks */}
      <Path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      {/* needle — slightly tilted (not perfectly vertical) */}
      <Path d="M12 7l1 5-1 5-1-5z" fill={color} opacity={0.7} />
    </Svg>
  )
}

/**
 * ReadingsIcon (命书 tab)
 *
 * A hanging scroll (立軸) inscribed with a small constellation — 命书 as it
 * historically was: a brush-written destiny scroll, not a Western codex. The
 * three stars (a larger 命/soul star with two attendants, joined by a faint
 * line) read the scroll's content as the heavens, tying it to the app's
 * celestial 命理 theme and echoing ZiweiIcon's star language. Stroked scroll
 * + filled stars, matching the set. Top/bottom rollers are intentionally a
 * touch asymmetric for an organic, brushed feel.
 */
export function ReadingsIcon({ size = 24, color = 'currentColor', strokeWidth = 1.5, ...rest }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...rest}>
      {/* top roller — wider than the silk, knobbed (round) ends */}
      <Path d="M5 4.5h14.5" stroke={color} strokeWidth={strokeWidth * 1.15} strokeLinecap="round" />
      {/* silk sides */}
      <Path d="M7.5 4.5v14" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Path d="M16.5 4.5v14" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      {/* bottom roller — gentle weighted bow, like hanging fabric */}
      <Path
        d="M5.5 18.5q6.5 2.6 13 0"
        stroke={color}
        strokeWidth={strokeWidth * 1.15}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* constellation inscribed on the silk — faint connecting line */}
      <Path
        d="M9.2 8.6 12 11l3 2.2"
        stroke={color}
        strokeWidth={strokeWidth * 0.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.4}
      />
      {/* soul star (centre, larger) + two attendants */}
      <Circle cx={12} cy={11} r={1.5} fill={color} />
      <Circle cx={9.2} cy={8.6} r={0.85} fill={color} />
      <Circle cx={15} cy={13.2} r={0.85} fill={color} />
    </Svg>
  )
}

/* -------------------------------------------------------------------------- */
/*  numerology-app                                                             */
/* -------------------------------------------------------------------------- */

/**
 * NumerologyIcon (数 tab)
 *
 * Inspired by ancient Chinese counting rods (算筹):
 * 5 rods in a pattern — 1 horizontal crossing 4 vertical, the traditional
 * way to represent "5". Asymmetric spacing.
 */
export function NumerologyIcon({ size = 24, color = 'currentColor', strokeWidth = 1.5, ...rest }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...rest}>
      {/* four vertical rods — irregular spacing */}
      <Path
        d="M7 6v12M10.5 6v12M14 6v12M18 6v12"
        stroke={color}
        strokeWidth={strokeWidth * 1.1}
        strokeLinecap="round"
      />
      {/* one horizontal rod crossing — the "five" marker */}
      <Path
        d="M5 12.5h15"
        stroke={color}
        strokeWidth={strokeWidth * 1.3}
        strokeLinecap="round"
      />
    </Svg>
  )
}

/* -------------------------------------------------------------------------- */
/*  coin-cast-app                                                              */
/* -------------------------------------------------------------------------- */

/**
 * HexagramIcon (卦 tab)
 *
 * Three horizontal lines — a trigram (八卦). Middle line is broken (yin),
 * top and bottom are solid (yang). Represents the fundamental unit of
 * the I Ching divination system.
 */
export function HexagramIcon({ size = 24, color = 'currentColor', strokeWidth = 1.5, ...rest }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...rest}>
      {/* yang line (solid) — top */}
      <Path d="M5 6h14" stroke={color} strokeWidth={strokeWidth * 1.4} strokeLinecap="round" />
      {/* yin line (broken) — middle */}
      <Path d="M5 12h5M14 12h5" stroke={color} strokeWidth={strokeWidth * 1.4} strokeLinecap="round" />
      {/* yang line (solid) — bottom */}
      <Path d="M5 18h14" stroke={color} strokeWidth={strokeWidth * 1.4} strokeLinecap="round" />
    </Svg>
  )
}

/* -------------------------------------------------------------------------- */
/*  dream-oracle-app                                                           */
/* -------------------------------------------------------------------------- */

/**
 * DreamIcon (梦 tab)
 *
 * Crescent moon nestled in a cloud — the liminal space of dreams.
 * Cloud is organic (not bubbly), moon is a thin crescent.
 */
export function DreamIcon({ size = 24, color = 'currentColor', strokeWidth = 1.5, ...rest }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...rest}>
      {/* cloud — organic, asymmetric humps */}
      <Path
        d="M4 17c0-2 1.5-3.5 3.5-3.5.5-2.5 2.5-4.5 5.5-4.5 2.5 0 4.5 1.5 5 3.5 1.5.5 2.5 2 2.5 3.5 0 2-1.5 3-3.5 3H7c-2 0-3-1.2-3-2.5z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
      {/* crescent moon peeking from cloud */}
      <Path
        d="M14.5 5c-1.5.5-2.5 2-2.5 3.5.8-.3 1.8-.5 2.5-.5"
        stroke={color}
        strokeWidth={strokeWidth * 0.8}
        strokeLinecap="round"
        opacity={0.5}
      />
      {/* tiny star */}
      <Circle cx={17.5} cy={5} r={0.8} fill={color} opacity={0.4} />
    </Svg>
  )
}

/* -------------------------------------------------------------------------- */
/*  face-oracle-app                                                            */
/* -------------------------------------------------------------------------- */

/**
 * FaceIcon (相 tab)
 *
 * Minimalist face in three-quarter view — oval outline with suggestion
 * of brow, nose bridge, and jaw. Not a full portrait; an abstract reading.
 */
export function FaceIcon({ size = 24, color = 'currentColor', strokeWidth = 1.5, ...rest }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...rest}>
      {/* face oval — slightly narrower at chin (asymmetric) */}
      <Path
        d="M8 4c-3 1-5 4.5-5 8s1.5 6 4 7.5c1.5 1 3.5 1.5 5 1.5 4.5 0 8-4 8-9S16.5 3 12 3c-1.5 0-3 .3-4 1z"
        stroke={color}
        strokeWidth={strokeWidth}
      />
      {/* brow suggestion */}
      <Path d="M8.5 9.5h2.5M13 9.5h2.5" stroke={color} strokeWidth={strokeWidth * 0.8} strokeLinecap="round" />
      {/* nose bridge — single vertical stroke */}
      <Path d="M12 10.5v3.5" stroke={color} strokeWidth={strokeWidth * 0.7} strokeLinecap="round" />
      {/* mouth — subtle curve */}
      <Path d="M10 17c.8.5 1.5.7 2.5.5" stroke={color} strokeWidth={strokeWidth * 0.7} strokeLinecap="round" />
    </Svg>
  )
}
