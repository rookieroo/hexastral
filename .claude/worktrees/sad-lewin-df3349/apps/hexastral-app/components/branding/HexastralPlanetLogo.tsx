/**
 * HexastralPlanetLogo — Lunar sphere with smooth gradient phase rendering.
 *
 * Rendering layers:
 *   1. Base circle: filled with lit color (visible surface)
 *   2. Shadow overlay: linear gradient of void color, opacity 1→0,
 *      S-curve falloff for smooth three-zone terminator
 *   3. Limb darkening: radial gradient darkening the outer rim
 *
 * No clipping path — the gradient covers the full circle, eliminating
 * hard terminator edges. The 22° tilt matches icon.png's diagonal
 * illumination direction.
 */

import type { LunarPhaseName } from '@zhop/hexastral-tokens/lunar'
import { getLunarPhase, getLunarPhaseName, LUNAR_PHASE_CJK } from '@zhop/hexastral-tokens/lunar'
import { getSphereColors } from '@zhop/hexastral-tokens/palette'
import { useId } from 'react'
import { View } from 'react-native'
import Svg, { Circle, Defs, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg'

// ── React hook wrappers ────────────────────────────────────────────────────────

/** Returns today's lunar phase in [0, 1): 0 = new, 0.5 = full. */
export function useLunarPhase(): number {
  return getLunarPhase()
}

// Re-export for backward compat
export type { LunarPhaseName as LunarPhase }
export { getLunarPhaseName as getMoonPhaseName, LUNAR_PHASE_CJK }

/** Brand phase matching icon.png: waxing gibbous, ~38% shadow. */
export const BRAND_PHASE = 0.29

/** Gradient tilt in degrees — matches icon.png's diagonal illumination. */
const TILT_DEG = 22

// ─── Props ─────────────────────────────────────────────────────────────────────
interface HexastralPlanetLogoProps {
  size?: number
  /** Fractional lunar phase [0,1). Omit to auto-compute from today. */
  phase?: number
  /** Override lit color (visible surface). */
  lightColor?: string
  /** Override void color (shadow / fading side). */
  darkColor?: string
  /** Override stroke color. */
  strokeColor?: string
  /** Override stroke width. */
  strokeWidth?: number
  /** Render with a dark (#09090B) circular background matching icon.png. */
  withBackground?: boolean
}

export function HexastralPlanetLogo({
  size = 80,
  phase: phaseProp,
  lightColor,
  darkColor,
  strokeColor,
  strokeWidth = 1,
  withBackground = false,
}: HexastralPlanetLogoProps) {
  const uid = useId().replace(/:/g, '')

  const phase = phaseProp ?? getLunarPhase()
  const cx = size / 2
  const cy = size / 2
  const R = size * 0.42

  // ── Theme-independent moon colours ──────────────────────────────────────────
  // The moon's illuminated face is always bright, shadow always dark —
  // celestial bodies don't invert with UI theme.
  const sphereColors = getSphereColors()
  const voidColor = darkColor ?? sphereColors.void
  const litColor = lightColor ?? sphereColors.lit
  const strokeVal = strokeColor ?? sphereColors.stroke

  // ── Phase geometry ──────────────────────────────────────────────────────────
  const p = ((phase % 1) + 1) % 1
  const isWaning = p > 0.5
  const effectiveP = isWaning ? 1 - p : p
  const cosPhase = Math.cos(2 * Math.PI * effectiveP)
  const effRx = R * Math.abs(cosPhase)

  // Terminator position along gradient axis: 0 = full shadow, 1 = no shadow.
  // For crescent phases the shadow-limb recedes across the disc; for gibbous
  // phases the illuminated limb expands — both converge at 0 (edge) near full
  // and new moon. Using a single formula avoids the gibbous-regime bug where
  // (R + effRx) / 2R → 1.0 left 77% of the disc in shadow at full moon.
  const termPos = (R - effRx) / (2 * R)

  // Gradient direction with tilt (shadow end → lit end)
  const tilt = (TILT_DEG * Math.PI) / 180
  const sign = isWaning ? -1 : 1
  const gx1 = cx - sign * R * Math.cos(tilt)
  const gy1 = cy - R * Math.sin(tilt)
  const gx2 = cx + sign * R * Math.cos(tilt)
  const gy2 = cy + R * Math.sin(tilt)

  // ── Shadow overlay stops (S-curve opacity falloff) ──────────────────────────
  const pw = 0.42
  const s0 = Math.max(0, termPos - pw * 0.55)
  const s1 = Math.max(0, termPos - pw * 0.12)
  const s2 = Math.min(1, termPos + pw * 0.12)
  const s3 = Math.min(1, termPos + pw * 0.5)

  const ogId = `${uid}og`
  const ldId = `${uid}ld`

  // When withBackground is set, scale the moon smaller inside a dark bg
  const outerSize = size
  const moonR = withBackground ? size * 0.34 : R
  const moonCx = cx
  const moonCy = cy

  // Recalculate gradient endpoints for moon radius
  const gradR = withBackground ? moonR : R
  const mgx1 = cx - sign * gradR * Math.cos(tilt)
  const mgy1 = cy - gradR * Math.sin(tilt)
  const mgx2 = cx + sign * gradR * Math.cos(tilt)
  const mgy2 = cy + gradR * Math.sin(tilt)

  return (
    <View style={{ width: outerSize, height: outerSize }}>
      <Svg width={outerSize} height={outerSize} viewBox={`0 0 ${outerSize} ${outerSize}`}>
        <Defs>
          <LinearGradient
            id={ogId}
            x1={String(withBackground ? mgx1 : gx1)}
            y1={String(withBackground ? mgy1 : gy1)}
            x2={String(withBackground ? mgx2 : gx2)}
            y2={String(withBackground ? mgy2 : gy2)}
            gradientUnits='userSpaceOnUse'
          >
            <Stop offset='0' stopColor={voidColor} stopOpacity={1} />
            <Stop offset={String(s0)} stopColor={voidColor} stopOpacity={1} />
            <Stop offset={String(s1)} stopColor={voidColor} stopOpacity={0.55} />
            <Stop offset={String(s2)} stopColor={voidColor} stopOpacity={0.12} />
            <Stop offset={String(s3)} stopColor={voidColor} stopOpacity={0} />
            <Stop offset='1' stopColor={voidColor} stopOpacity={0} />
          </LinearGradient>
          <RadialGradient
            id={ldId}
            cx={String(cx)}
            cy={String(cy)}
            rx={String(withBackground ? moonR : R)}
            ry={String(withBackground ? moonR : R)}
            gradientUnits='userSpaceOnUse'
          >
            <Stop offset='0' stopColor='black' stopOpacity={0} />
            <Stop offset='0.72' stopColor='black' stopOpacity={0} />
            <Stop offset='1' stopColor='black' stopOpacity={0.1} />
          </RadialGradient>
        </Defs>

        {/* Dark background rounded rect (icon.png style) */}
        {withBackground && (
          <Rect
            x={size * 0.02}
            y={size * 0.02}
            width={size * 0.96}
            height={size * 0.96}
            rx={size * 0.22}
            ry={size * 0.22}
            fill='#09090B'
          />
        )}
        {/* Base lit surface */}
        <Circle
          cx={moonCx}
          cy={moonCy}
          r={withBackground ? moonR : R}
          fill={litColor}
          stroke={strokeVal}
          strokeWidth={strokeWidth}
        />
        {/* Shadow overlay: void color fading from opaque → transparent */}
        <Circle cx={moonCx} cy={moonCy} r={withBackground ? moonR : R} fill={`url(#${ogId})`} />
        {/* Limb darkening */}
        <Circle cx={moonCx} cy={moonCy} r={withBackground ? moonR : R} fill={`url(#${ldId})`} />
      </Svg>
    </View>
  )
}
