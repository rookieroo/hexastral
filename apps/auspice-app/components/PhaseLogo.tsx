/**
 * PhaseLogo — RN port of WidgetKit `YuunPhaseLogo` / HexastralPlanetLogo.
 *
 * Smooth terminator sphere (not water-ink). Use for home mark + widget/watch
 * chrome. Loading rituals use `MoonLoader` (`AutoMoonPhaseLoader`).
 *
 * Phase math (must match Swift + `computePhaseGradient` in hexastral-tokens):
 *   0 = 朔 (new, full void) · 0.25 = 上弦 · 0.5 = 望 (full, full lit) · 0.75 = 下弦
 *   termPos = (1 + cos(2πp)) / 2  → 1 at new, 0 at full
 *   Do NOT fold with abs(cos(effectiveP)) — that made 朔 and 望 identical.
 */

import { Canvas, Circle, LinearGradient, RadialGradient, vec } from '@shopify/react-native-skia'
import { useTheme } from '@zhop/core-ui'
import { useMemo } from 'react'
import { View } from 'react-native'

const TILT_DEG = 22

type Props = {
  size: number
  /** Fractional lunar phase [0, 1). 0 = new, 0.5 = full. */
  phase: number
  /** Force light/dark chrome; defaults to app theme. */
  scheme?: 'light' | 'dark'
}

function chrome(scheme: 'light' | 'dark') {
  if (scheme === 'light') {
    return {
      lit: '#EDE6D8',
      void: '#3C2415',
      void55: 'rgba(60,36,21,0.55)',
      void12: 'rgba(60,36,21,0.12)',
      stroke: 'rgba(60,36,21,0.18)',
    }
  }
  return {
    lit: '#FAFAFA',
    void: '#121218',
    void55: 'rgba(18,18,24,0.55)',
    void12: 'rgba(18,18,24,0.12)',
    stroke: 'rgba(128,128,128,0.25)',
  }
}

/** Shared terminator geometry — exported for golden checks. */
export function phaseTerminator(phase: number, size: number) {
  const cx = size / 2
  const cy = size / 2
  const R = size * 0.42
  let p = phase % 1
  if (p < 0) p += 1
  const isWaning = p > 0.5
  // +1 at 朔 (new), -1 at 望 (full). Shadow coverage follows (1+cos)/2.
  const cosPhase = Math.cos(2 * Math.PI * p)
  const termPos = (1 + cosPhase) / 2
  const tilt = (TILT_DEG * Math.PI) / 180
  const sign = isWaning ? -1 : 1
  const pw = 0.42
  return {
    cx,
    cy,
    R,
    termPos,
    isWaning,
    gx1: cx - sign * R * Math.cos(tilt),
    gy1: cy - R * Math.sin(tilt),
    gx2: cx + sign * R * Math.cos(tilt),
    gy2: cy + R * Math.sin(tilt),
    s0: Math.max(0, termPos - pw * 0.55),
    s1: Math.max(0, termPos - pw * 0.12),
    s2: Math.min(1, termPos + pw * 0.12),
    s3: Math.min(1, termPos + pw * 0.5),
  }
}

export function PhaseLogo({ size, phase, scheme: schemeProp }: Props) {
  const { mode } = useTheme()
  const scheme = schemeProp ?? (mode === 'light' ? 'light' : 'dark')
  const c = chrome(scheme)
  const geo = useMemo(() => phaseTerminator(phase, size), [size, phase])
  const strokeW = Math.max(0.5, size * 0.012)

  return (
    <View style={{ width: size, height: size }} accessibilityLabel='Moon phase'>
      <Canvas style={{ width: size, height: size }}>
        <Circle cx={geo.cx} cy={geo.cy} r={geo.R} color={c.lit} />
        <Circle cx={geo.cx} cy={geo.cy} r={geo.R}>
          <LinearGradient
            start={vec(geo.gx1, geo.gy1)}
            end={vec(geo.gx2, geo.gy2)}
            colors={[c.void, c.void, c.void55, c.void12, 'transparent', 'transparent']}
            positions={[0, geo.s0, geo.s1, geo.s2, geo.s3, 1]}
          />
        </Circle>
        <Circle cx={geo.cx} cy={geo.cy} r={geo.R}>
          <RadialGradient
            c={vec(geo.cx, geo.cy)}
            r={geo.R}
            colors={['transparent', 'transparent', 'rgba(0,0,0,0.1)']}
            positions={[0, 0.72, 1]}
          />
        </Circle>
        <Circle
          cx={geo.cx}
          cy={geo.cy}
          r={geo.R}
          style='stroke'
          strokeWidth={strokeW}
          color={c.stroke}
        />
      </Canvas>
    </View>
  )
}
