/**
 * BondRadarChart — 4-axis SVG radar chart for bond dimensions
 *
 * Renders a diamond-shaped radar chart (rotated square) for the 4
 * bond dimensions: long_term, attraction, communication, emotional.
 */

import { useMemo } from 'react'
import { View } from 'react-native'
import Svg, { Circle, Line, Polygon, Text as SvgText } from 'react-native-svg'
import type {
  BondRadarDimension,
  BondRadarDimensionKey,
  BondRadarLabels,
  BondRadarPalette,
} from './types'

const AXIS_KEYS: BondRadarDimensionKey[] = ['long_term', 'attraction', 'communication', 'emotional']

export type BondRadarChartProps = {
  dimensions: BondRadarDimension[]
  labels: BondRadarLabels
  palette: BondRadarPalette
  size?: number
}

export function BondRadarChart({ dimensions, labels, palette, size = 240 }: BondRadarChartProps) {
  const cx = size / 2
  const cy = size / 2
  const maxR = size * 0.36
  const labelPad = size * 0.1

  const axisAngles = [-90, 0, 90, 180]

  function polarToXY(angle: number, r: number) {
    const rad = (angle * Math.PI) / 180
    return {
      x: cx + r * Math.cos(rad),
      y: cy + r * Math.sin(rad),
    }
  }

  const dataPoints = useMemo(() => {
    return AXIS_KEYS.map((key, i) => {
      const dim = dimensions.find((d) => d.key === key)
      const ratio =
        dim && dim.score != null && dim.maxScore != null && dim.maxScore > 0
          ? Math.min(dim.score / dim.maxScore, 1)
          : 0
      const pt = polarToXY(axisAngles[i] ?? 0, ratio * maxR)
      return `${pt.x},${pt.y}`
    })
  }, [dimensions, maxR])

  const gridLevels = [0.25, 0.5, 0.75, 1]
  const gridPolygons = gridLevels.map((level) =>
    axisAngles
      .map((angle) => {
        const pt = polarToXY(angle ?? 0, level * maxR)
        return `${pt.x},${pt.y}`
      })
      .join(' ')
  )

  const labelPositions = AXIS_KEYS.map((key, i) => {
    const pt = polarToXY(axisAngles[i] ?? 0, maxR + labelPad)
    return { key, x: pt.x, y: pt.y, angle: axisAngles[i] }
  })

  const svgSize = size + labelPad * 2.2

  return (
    <View style={{ alignItems: 'center', paddingVertical: 8 }}>
      <Svg
        width={svgSize}
        height={svgSize}
        viewBox={`${-labelPad * 1.1} ${-labelPad * 1.1} ${svgSize} ${svgSize}`}
      >
        {gridPolygons.map((pts, i) => (
          <Polygon key={i} points={pts} fill='none' stroke={palette.separator} strokeWidth={0.5} />
        ))}

        {axisAngles.map((angle, i) => {
          const end = polarToXY(angle, maxR)
          return (
            <Line
              key={i}
              x1={cx}
              y1={cy}
              x2={end.x}
              y2={end.y}
              stroke={palette.separator}
              strokeWidth={0.5}
            />
          )
        })}

        <Polygon
          points={dataPoints}
          fill={`${palette.accent}33`}
          stroke={palette.accent}
          strokeWidth={1.5}
        />

        {AXIS_KEYS.map((key, i) => {
          const dim = dimensions.find((d) => d.key === key)
          const ratio =
            dim && dim.score != null && dim.maxScore != null && dim.maxScore > 0
              ? Math.min(dim.score / dim.maxScore, 1)
              : 0
          const pt = polarToXY(axisAngles[i] ?? 0, ratio * maxR)
          return <Circle key={key} cx={pt.x} cy={pt.y} r={3} fill={palette.accent} stroke='none' />
        })}

        {labelPositions.map(({ key, x, y, angle }) => {
          let textAnchor: 'start' | 'middle' | 'end' = 'middle'
          if (angle === 0) textAnchor = 'start'
          else if (angle === 180) textAnchor = 'end'

          return (
            <SvgText
              key={key}
              x={x}
              y={y}
              textAnchor={textAnchor}
              dy={angle === -90 ? -2 : angle === 90 ? 10 : 4}
              fontSize={10}
              fontWeight='300'
              fill={palette.secondary}
            >
              {labels[key]}
            </SvgText>
          )
        })}
      </Svg>
    </View>
  )
}
