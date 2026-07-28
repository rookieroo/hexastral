/**
 * WidgetSurface — textured chrome for widget / watch previews.
 * Light: 宣纸 soft wash only (no fibre lines — real rice paper has none).
 * Dark: 星空 void + soft stars.
 */

import { ricePaper, rubbing, zinc } from '@zhop/hexastral-tokens'
import { useMemo, type ReactNode } from 'react'
import { StyleSheet, View, type ViewStyle } from 'react-native'

function hash(n: number): number {
  const x = Math.sin(n * 12.9898) * 43758.5453
  return x - Math.floor(x)
}

/** Soft radial washes only — no strokes. */
function PaperWash({ w, h }: { w: number; h: number }) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents='none'>
      <View
        style={{
          position: 'absolute',
          left: w * 0.05,
          top: -h * 0.15,
          width: w * 0.9,
          height: h * 0.75,
          borderRadius: Math.max(w, h),
          backgroundColor: ricePaper.warm,
          opacity: 0.22,
        }}
      />
      <View
        style={{
          position: 'absolute',
          right: -w * 0.15,
          bottom: -h * 0.1,
          width: w * 0.55,
          height: h * 0.5,
          borderRadius: Math.max(w, h),
          backgroundColor: ricePaper.aged,
          opacity: 0.12,
        }}
      />
    </View>
  )
}

function StarDots({ w, h }: { w: number; h: number }) {
  const stars = useMemo(() => {
    const out: Array<{ left: number; top: number; size: number; opacity: number }> = []
    for (let i = 0; i < 36; i++) {
      const size = 1 + hash(i * 2.9) * 2
      out.push({
        left: hash(i * 1.7 + 2) * w,
        top: hash(i * 4.3 + 9) * h,
        size,
        opacity: 0.25 + hash(i * 6.1) * 0.55,
      })
    }
    return out
  }, [w, h])

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents='none'>
      <View
        style={{
          position: 'absolute',
          left: w * 0.05,
          top: -h * 0.15,
          width: w * 0.9,
          height: h * 0.55,
          borderRadius: w,
          backgroundColor: zinc[800],
          opacity: 0.35,
        }}
      />
      {stars.map((s, i) => (
        <View
          key={i}
          style={{
            position: 'absolute',
            left: s.left,
            top: s.top,
            width: s.size,
            height: s.size,
            borderRadius: s.size,
            backgroundColor: zinc[300],
            opacity: s.opacity,
          }}
        />
      ))}
    </View>
  )
}

export type WidgetSurfaceMode = 'light' | 'dark'

export function widgetSurfaceBg(mode: WidgetSurfaceMode): string {
  return mode === 'light' ? ricePaper.ivory : rubbing.void
}

export function WidgetSurface({
  mode,
  width,
  height,
  style,
  children,
}: {
  mode: WidgetSurfaceMode
  width: number
  height: number
  style?: ViewStyle
  children?: ReactNode
}) {
  const bg = widgetSurfaceBg(mode)
  return (
    <View style={[{ width, height, backgroundColor: bg, overflow: 'hidden' }, style]}>
      {mode === 'light' ? <PaperWash w={width} h={height} /> : <StarDots w={width} h={height} />}
      <View style={StyleSheet.absoluteFill} pointerEvents='box-none'>
        {children}
      </View>
    </View>
  )
}
