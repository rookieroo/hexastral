/**
 * Hexastral 品牌 Logo — 六芒星（两个等边三角形叠加）
 *
 * 紫色三角（上指）+ 金色三角（下指）= 六角星象
 * 无文字、无 emoji，纯 SVG 几何
 */

import Svg, { Defs, LinearGradient, Polygon, Stop } from 'react-native-svg'

interface HexastralLogoProps {
  size?: number
  /** 主色（紫）— 默认深空紫 */
  primaryColor?: string
  /** 辅色（金）— 默认赛博金 */
  goldColor?: string
}

export function HexastralLogo({
  size = 80,
  primaryColor = '#9B59B6',
  goldColor = '#D4AF37',
}: HexastralLogoProps) {
  const cx = size / 2
  const cy = size / 2
  const R = size * 0.44

  const pt = (angleDeg: number) => {
    const rad = ((angleDeg - 90) * Math.PI) / 180
    return `${(cx + R * Math.cos(rad)).toFixed(2)},${(cy + R * Math.sin(rad)).toFixed(2)}`
  }

  // 上指三角（乾 · 天）
  const triUp = `${pt(0)} ${pt(120)} ${pt(240)}`
  // 下指三角（坤 · 地）
  const triDown = `${pt(60)} ${pt(180)} ${pt(300)}`

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Defs>
        <LinearGradient id='gradUp' x1='0' y1='0' x2='1' y2='1'>
          <Stop offset='0' stopColor={primaryColor} stopOpacity='1' />
          <Stop offset='1' stopColor={primaryColor} stopOpacity='0.7' />
        </LinearGradient>
        <LinearGradient id='gradDown' x1='1' y1='0' x2='0' y2='1'>
          <Stop offset='0' stopColor={goldColor} stopOpacity='0.9' />
          <Stop offset='1' stopColor={goldColor} stopOpacity='0.5' />
        </LinearGradient>
      </Defs>
      {/* 下指（坤 · 地）先绘，形成背景层 */}
      <Polygon points={triDown} fill='url(#gradDown)' />
      {/* 上指（乾 · 天）叠加，中心产生自然混色 */}
      <Polygon points={triUp} fill='url(#gradUp)' opacity={0.85} />
    </Svg>
  )
}
