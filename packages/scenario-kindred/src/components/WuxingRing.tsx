/**
 * WuxingRing — the 五行 生克 pentagram, data-driven.
 *
 * Perimeter edges = 相生 (generation); inner star = 相克 (control, faint). The
 * bridge a→用神→b is highlighted in cinnabar — the "互补之处" centrepiece showing
 * how 用神 turns the two day masters' clash into a generative chain.
 *
 * Geometry ported verbatim from the design study (viewBox 1010×640), so it
 * renders identically to the mock.
 */

import { kindredPaper } from '@zhop/hexastral-tokens/kindred'
import Svg, { Circle, G, Line, Text as SvgText } from 'react-native-svg'

type Wx = '木' | '火' | '土' | '金' | '水'

export interface WuxingRingProps {
  /** Rendered width in px (height follows the 1010×640 aspect). */
  width: number
  /** Person A / B day-master elements (marked on the ring). */
  aElement: Wx
  bElement: Wx
  /** The report's 通关用神 — the highlighted bridge node. */
  yongshen: Wx
}

// 相生 order, clockwise from top.
const ORDER: Wx[] = ['火', '土', '金', '水', '木']
// each → the element it 克s (the inner star).
const OVERCOME: Record<Wx, Wx> = { 火: '金', 金: '木', 木: '土', 土: '水', 水: '火' }

const CX = 505
const CY = 330
const R = 205

function pos(el: Wx): [number, number] {
  const i = ORDER.indexOf(el)
  const a = ((-90 + i * 72) * Math.PI) / 180
  return [CX + R * Math.cos(a), CY + R * Math.sin(a)]
}

function pairKey(a: Wx, b: Wx) {
  return [a, b].sort().join('')
}

export function WuxingRing({ width, aElement, bElement, yongshen }: WuxingRingProps) {
  const ink = kindredPaper.ink
  const hair = kindredPaper.hair
  const cin = kindredPaper.cinnabar
  const paper = kindredPaper.bg

  // Highlighted bridge edges: a→用神 and 用神→b.
  const hot = new Set([pairKey(aElement, yongshen), pairKey(yongshen, bElement)])
  const isDayMaster = (el: Wx) => el === aElement || el === bElement
  const whoLabel = (el: Wx) => (el === aElement ? '她' : el === bElement ? '他' : '')

  return (
    <Svg width={width} height={(width * 640) / 1010} viewBox='0 0 1010 640'>
      {/* 相克 inner star (faint dashed) */}
      {ORDER.map((el) => {
        const [x1, y1] = pos(el)
        const [x2, y2] = pos(OVERCOME[el])
        return (
          <Line
            key={`k${el}`}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={hair}
            strokeWidth={1}
            strokeDasharray='3 6'
          />
        )
      })}

      {/* 相生 perimeter; bridge edges in cinnabar */}
      {ORDER.map((el, i) => {
        const next = ORDER[(i + 1) % ORDER.length] as Wx
        const [x1, y1] = pos(el)
        const [x2, y2] = pos(next)
        const hl = hot.has(pairKey(el, next))
        return (
          <Line
            key={`s${el}`}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={hl ? cin : ink}
            strokeWidth={hl ? 3.4 : 1.8}
            opacity={hl ? 1 : 0.55}
          />
        )
      })}

      {/* nodes */}
      {ORDER.map((el) => {
        const [x, y] = pos(el)
        const big = isDayMaster(el) || el === yongshen
        const accent = el === yongshen || isDayMaster(el)
        return (
          <G key={`n${el}`}>
            <Circle
              cx={x}
              cy={y}
              r={big ? 34 : 26}
              fill={paper}
              stroke={accent ? cin : hair}
              strokeWidth={big ? 2.2 : 1.4}
            />
            <SvgText
              x={x}
              y={y}
              fontSize={big ? 38 : 30}
              fontWeight='700'
              fill={ink}
              textAnchor='middle'
              alignmentBaseline='central'
            >
              {el}
            </SvgText>
            {isDayMaster(el) && (
              <SvgText x={x} y={y - 50} fontSize={20} fill={cin} textAnchor='middle'>
                {whoLabel(el)}
              </SvgText>
            )}
          </G>
        )
      })}

      {/* centre caption */}
      <SvgText x={CX} y={CY + 590 - 330 + 30} fontSize={14} fill={cin} textAnchor='middle'>
        {`${aElement} → ${yongshen} → ${bElement} · 以${yongshen}相生`}
      </SvgText>
    </Svg>
  )
}
