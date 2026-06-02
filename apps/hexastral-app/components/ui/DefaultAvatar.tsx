/**
 * DefaultAvatar — 8 metaphysics SVG avatars at uniform visual weight
 *
 * Redesigned for consistent complexity and clarity at all sizes (28–80 pt).
 * Bold strokes, balanced element count, distinctive silhouettes from a distance.
 *
 * Designs (all geometric, monochrome, zinc palette):
 *   0 · 月 Crescent   — waxing crescent arc (brand echo)
 *   1 · 斗 Dipper     — 7 refined constellation dots with path
 *   2 · 日 Sun        — circle with radiating strokes
 *   3 · 山 Mountain   — single clean peak silhouette
 *   4 · 乾 Qian       — three solid trigram lines
 *   5 · 坎 Kan        — broken-solid-broken trigram
 *   6 · 雲 Cloud      — soft curved cloud outline
 *   7 · 蓮 Lotus      — minimal 3-petal silhouette
 *
 * Usage:
 *   import { DefaultAvatar } from '@/components/ui/DefaultAvatar'
 *   import { getAvatarIndex } from '@/lib/ux/avatar'
 *
 *   <DefaultAvatar index={getAvatarIndex(userId)} size={36} isDark={isDark} />
 */

import { View } from 'react-native'
import Svg, { Circle, G, Line, Path } from 'react-native-svg'

interface DefaultAvatarProps {
  /** 0–7 — maps to one of the 8 abstract designs */
  index: number
  /** Container diameter in points (default: 36) */
  size?: number
  isDark?: boolean
}

export function DefaultAvatar({ index, size = 36, isDark = true }: DefaultAvatarProps) {
  const bg = isDark ? '#18181B' : '#E4E4E7'
  const stroke = isDark ? '#52525B' : '#A1A1AA'
  const fg = isDark ? '#D4D4D8' : '#3F3F46'

  const iconSize = size * 0.68
  const design = ((index % 8) + 8) % 8

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: bg,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 0.5,
        borderColor: stroke,
      }}
    >
      <Svg width={iconSize} height={iconSize} viewBox='0 0 24 24'>
        {design === 0 && (
          /* 月 Crescent — waxing crescent arc echoing the HexAstral moon brand */
          <G>
            <Path
              d='M 14.5,3 A 9,9 0 1,0 14.5,21 A 6.5,6.5 0 1,1 14.5,3'
              fill='none'
              stroke={fg}
              strokeWidth={1.5}
              strokeLinecap='round'
            />
          </G>
        )}

        {design === 1 && (
          /* 斗 Dipper — 7 constellation dots with refined connecting path */
          <G>
            <Path
              d='M 5,17 L 8,18 L 11,16 L 13,13'
              fill='none'
              stroke={fg}
              strokeWidth={1.2}
              strokeLinecap='round'
              strokeLinejoin='round'
            />
            <Path
              d='M 13,13 L 15,10 L 18,8 L 19,5'
              fill='none'
              stroke={fg}
              strokeWidth={1.2}
              strokeLinecap='round'
              strokeLinejoin='round'
            />
            {[
              [5, 17],
              [8, 18],
              [11, 16],
              [13, 13],
              [15, 10],
              [18, 8],
              [19, 5],
            ].map(([cx, cy], i) => (
              <Circle key={i} cx={cx} cy={cy} r={1.4} fill={fg} />
            ))}
          </G>
        )}

        {design === 2 && (
          /* 日 Sun — circle with 8 radiating strokes */
          <G>
            <Circle cx={12} cy={12} r={4.5} fill='none' stroke={fg} strokeWidth={1.5} />
            {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => {
              const rad = (angle * Math.PI) / 180
              const x1 = 12 + 6.5 * Math.cos(rad)
              const y1 = 12 + 6.5 * Math.sin(rad)
              const x2 = 12 + 9 * Math.cos(rad)
              const y2 = 12 + 9 * Math.sin(rad)
              return (
                <Line
                  key={angle}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={fg}
                  strokeWidth={1.4}
                  strokeLinecap='round'
                />
              )
            })}
          </G>
        )}

        {design === 3 && (
          /* 山 Mountain — single clean peak silhouette */
          <G>
            <Path
              d='M 3,19 L 9,7 L 12,11 L 15,7 L 21,19 Z'
              fill='none'
              stroke={fg}
              strokeWidth={1.5}
              strokeLinecap='round'
              strokeLinejoin='round'
            />
          </G>
        )}

        {design === 4 && (
          /* 乾 Qian — three solid trigram lines (Heaven) */
          <G>
            {[8, 12, 16].map((y) => (
              <Line
                key={y}
                x1={5}
                y1={y}
                x2={19}
                y2={y}
                stroke={fg}
                strokeWidth={2}
                strokeLinecap='round'
              />
            ))}
          </G>
        )}

        {design === 5 && (
          /* 坎 Kan — broken-solid-broken trigram (Water) */
          <G>
            {/* Top: broken line */}
            <Line
              x1={5}
              y1={8}
              x2={10.5}
              y2={8}
              stroke={fg}
              strokeWidth={2}
              strokeLinecap='round'
            />
            <Line
              x1={13.5}
              y1={8}
              x2={19}
              y2={8}
              stroke={fg}
              strokeWidth={2}
              strokeLinecap='round'
            />
            {/* Middle: solid line */}
            <Line
              x1={5}
              y1={12}
              x2={19}
              y2={12}
              stroke={fg}
              strokeWidth={2}
              strokeLinecap='round'
            />
            {/* Bottom: broken line */}
            <Line
              x1={5}
              y1={16}
              x2={10.5}
              y2={16}
              stroke={fg}
              strokeWidth={2}
              strokeLinecap='round'
            />
            <Line
              x1={13.5}
              y1={16}
              x2={19}
              y2={16}
              stroke={fg}
              strokeWidth={2}
              strokeLinecap='round'
            />
          </G>
        )}

        {design === 6 && (
          /* 菱 Diamond — clean geometric marker */
          <G>
            <Path
              d='M 12,4 L 19,12 L 12,20 L 5,12 Z'
              fill='none'
              stroke={fg}
              strokeWidth={1.5}
              strokeLinecap='round'
              strokeLinejoin='round'
            />
          </G>
        )}

        {design === 7 && (
          /* 蓮 Lotus — minimal 3-petal silhouette */
          <G>
            {/* Center petal */}
            <Path
              d='M 12,5 Q 15,10 12,18 Q 9,10 12,5'
              fill='none'
              stroke={fg}
              strokeWidth={1.4}
              strokeLinecap='round'
            />
            {/* Left petal */}
            <Path
              d='M 12,18 Q 5,13 7,7'
              fill='none'
              stroke={fg}
              strokeWidth={1.4}
              strokeLinecap='round'
            />
            {/* Right petal */}
            <Path
              d='M 12,18 Q 19,13 17,7'
              fill='none'
              stroke={fg}
              strokeWidth={1.4}
              strokeLinecap='round'
            />
          </G>
        )}
      </Svg>
    </View>
  )
}
