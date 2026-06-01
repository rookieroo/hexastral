'use client'

/**
 * HexastralPlanetLogo — web SVG version.
 *
 * Smooth full-circle gradient — no clipping path, no hard terminator edge.
 * Matches icon.png's diagonal illumination with 22° tilt.
 */

import { getLunarPhase } from '@zhop/hexastral-tokens/lunar'
import { getSphereColors } from '@zhop/hexastral-tokens/palette'
import { useId } from 'react'

interface HexastralPlanetLogoProps {
  size?: number
  phase?: number
  isDark?: boolean
}

const TILT_DEG = 22

export function HexastralPlanetLogo({
  size = 80,
  phase: phaseProp,
  isDark = true,
}: HexastralPlanetLogoProps) {
  const uid = useId().replace(/:/g, '')
  const phase = phaseProp ?? getLunarPhase()
  const cx = size / 2
  const cy = size / 2
  const R = size * 0.42

  const { void: voidColor, lit, stroke } = getSphereColors()

  // Phase geometry
  const p = ((phase % 1) + 1) % 1
  const isWaning = p > 0.5
  const effectiveP = isWaning ? 1 - p : p
  const cosPhase = Math.cos(2 * Math.PI * effectiveP)
  const isCrescent = cosPhase > 0
  const effRx = R * Math.abs(cosPhase)
  const termPos = isCrescent ? (R - effRx) / (2 * R) : (R + effRx) / (2 * R)

  // Gradient direction with tilt
  const tilt = (TILT_DEG * Math.PI) / 180
  const sign = isWaning ? -1 : 1
  const gx1 = cx - sign * R * Math.cos(tilt)
  const gy1 = cy - R * Math.sin(tilt)
  const gx2 = cx + sign * R * Math.cos(tilt)
  const gy2 = cy + R * Math.sin(tilt)

  // S-curve opacity stops
  const pw = 0.42
  const s0 = Math.max(0, termPos - pw * 0.55)
  const s1 = Math.max(0, termPos - pw * 0.12)
  const s2 = Math.min(1, termPos + pw * 0.12)
  const s3 = Math.min(1, termPos + pw * 0.5)

  const ogId = `${uid}og`
  const ldId = `${uid}ld`

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-label='HexAstral moon logo'
    >
      <defs>
        <linearGradient
          id={ogId}
          x1={String(gx1)}
          y1={String(gy1)}
          x2={String(gx2)}
          y2={String(gy2)}
          gradientUnits='userSpaceOnUse'
        >
          <stop offset='0' stopColor={voidColor} stopOpacity={1} />
          <stop offset={String(s0)} stopColor={voidColor} stopOpacity={1} />
          <stop offset={String(s1)} stopColor={voidColor} stopOpacity={0.55} />
          <stop offset={String(s2)} stopColor={voidColor} stopOpacity={0.12} />
          <stop offset={String(s3)} stopColor={voidColor} stopOpacity={0} />
          <stop offset='1' stopColor={voidColor} stopOpacity={0} />
        </linearGradient>
        <radialGradient
          id={ldId}
          cx={String(cx)}
          cy={String(cy)}
          r={String(R)}
          gradientUnits='userSpaceOnUse'
        >
          <stop offset='0' stopColor='black' stopOpacity={0} />
          <stop offset='0.72' stopColor='black' stopOpacity={0} />
          <stop offset='1' stopColor='black' stopOpacity={isDark ? 0.15 : 0.08} />
        </radialGradient>
      </defs>

      <circle cx={cx} cy={cy} r={R} fill={lit} stroke={stroke} strokeWidth={1} />
      <circle cx={cx} cy={cy} r={R} fill={`url(#${ogId})`} />
      <circle cx={cx} cy={cy} r={R} fill={`url(#${ldId})`} />
    </svg>
  )
}
