/**
 * Schematic 流年 age scale overlaid on palm photos.
 * Canonical arcs (not a trace of the photographed line) — labeled 示意.
 */

import { useMemo } from 'react'
import { Text, View } from 'react-native'
import Svg, { Circle, G, Polyline, Text as SvgText } from 'react-native-svg'

import { isCjkZh, pickZh } from '@/lib/locale-zh'
import { PALM_LINE_PATHS, type PalmLinePath, pointAtAge } from '@/lib/palm-layout'

function pathToPointsAttr(path: PalmLinePath, w: number, h: number): string {
  return path.points.map((p) => `${p.x * w},${p.y * h}`).join(' ')
}

export function PalmAgeScale({
  part,
  stageW,
  stageH,
  currentAge,
  isAcquired,
  locale,
  accent,
  dim,
}: {
  part: 'palm_l' | 'palm_r'
  stageW: number
  stageH: number
  currentAge: number | null
  /** 后天掌 — stronger stroke / current-age highlight. */
  isAcquired: boolean
  locale: string
  accent: string
  dim: string
}) {
  const paths = PALM_LINE_PATHS[part]
  const caption = useMemo(() => {
    if (locale.startsWith('ja')) return '流年示意'
    if (isCjkZh(locale)) return pickZh(locale, '流年示意', '流年示意')
    return 'Age guide (schematic)'
  }, [locale])

  if (stageW <= 0 || stageH <= 0) return null

  const strokeOpacity = isAcquired ? 0.55 : 0.28
  const tickOpacity = isAcquired ? 0.7 : 0.35
  const strokeW = isAcquired ? 1.4 : 1

  return (
    <View pointerEvents='none' style={{ position: 'absolute', inset: 0 }}>
      <Svg width={stageW} height={stageH} style={{ position: 'absolute', inset: 0 }}>
        {paths.map((path) => {
          const pts = pathToPointsAttr(path, stageW, stageH)
          const now = currentAge !== null && isAcquired ? pointAtAge(path, currentAge) : null
          return (
            <G key={path.kind}>
              <Polyline
                points={pts}
                fill='none'
                stroke={accent}
                strokeWidth={strokeW}
                strokeOpacity={strokeOpacity}
                strokeDasharray='4 3'
                strokeLinejoin='round'
                strokeLinecap='round'
              />
              {path.anchors.map((a) => (
                <G key={`${path.kind}-${a.age}`}>
                  <Circle
                    cx={a.point.x * stageW}
                    cy={a.point.y * stageH}
                    r={2}
                    fill={accent}
                    opacity={tickOpacity}
                  />
                  <SvgText
                    x={a.point.x * stageW + 5}
                    y={a.point.y * stageH + 3}
                    fill={dim}
                    fontSize={8}
                    opacity={tickOpacity}
                    fontFamily='IBMPlexMono'
                  >
                    {String(a.age)}
                  </SvgText>
                </G>
              ))}
              {now ? (
                <Circle
                  cx={now.x * stageW}
                  cy={now.y * stageH}
                  r={4.5}
                  fill={accent}
                  opacity={0.9}
                />
              ) : null}
            </G>
          )
        })}
      </Svg>
      <Text
        style={{
          position: 'absolute',
          left: 8,
          bottom: 6,
          color: dim,
          fontSize: 9,
          letterSpacing: 0.6,
          opacity: isAcquired ? 0.85 : 0.45,
          fontFamily: 'IBMPlexMono',
        }}
      >
        {caption}
        {currentAge !== null && isAcquired ? ` · ${currentAge}` : ''}
      </Text>
    </View>
  )
}

/** Gender-based acquired palm: 男 right / 女 left. */
export function isAcquiredPalm(part: 'palm_l' | 'palm_r', gender: 'M' | 'F' | null): boolean {
  if (!gender) return part === 'palm_r'
  return gender === 'F' ? part === 'palm_l' : part === 'palm_r'
}
