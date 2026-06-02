/**
 * 爻卦图标 — 离卦 ☲ 风格（阳 · 阴 · 阳）
 *
 * 用于卜卦 Tab 与 Onboarding 卡片，保持视觉一致。
 * 上爻：实线（阳）
 * 中爻：断线（阴）— 与汉堡菜单图标的视觉区别
 * 下爻：实线（阳）
 */

import Svg, { Line } from 'react-native-svg'

interface TrigramIconProps {
  color: string
  size: number
}

export function TrigramIcon({ color, size }: TrigramIconProps) {
  const strokeWidth = size * 0.1
  const x1 = size * 0.17
  const x2 = size * 0.83
  const midGap = size * 0.09
  const midCx = size * 0.5
  const y1 = size * 0.2
  const y2 = size * 0.5
  const y3 = size * 0.8

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Top — solid yang line */}
      <Line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y1}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap='round'
      />
      {/* Middle — broken yin line */}
      <Line
        x1={x1}
        y1={y2}
        x2={midCx - midGap}
        y2={y2}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap='round'
      />
      <Line
        x1={midCx + midGap}
        y1={y2}
        x2={x2}
        y2={y2}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap='round'
      />
      {/* Bottom — solid yang line */}
      <Line
        x1={x1}
        y1={y3}
        x2={x2}
        y2={y3}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap='round'
      />
    </Svg>
  )
}
