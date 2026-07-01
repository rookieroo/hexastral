/**
 * SealNumeral — 碑拓 chapter seal with a hand-drawn 甲骨文-style numeral.
 *
 * A 朱砂 印章 on the 宣纸 ground; the number is carved in the oracle-bone form
 * (1–4 = stacked bars, 5 = ✕, 6 = ∧) in rice-paper white, matching Yuel's
 * 甲骨体 numerals. Pure react-native-svg.
 */

import { Text, View } from 'react-native'
import Svg, { Line } from 'react-native-svg'
import { FENG_PALETTE, FENG_PAPER } from '@/lib/theme'

// Oracle-bone numerals 1–6 in a 24×24 box (stroke endpoints x1,y1,x2,y2).
const STROKES: Record<number, ReadonlyArray<readonly [number, number, number, number]>> = {
  1: [[5, 12, 19, 12]],
  2: [
    [5, 9, 19, 9],
    [5, 15, 19, 15],
  ],
  3: [
    [5, 7, 19, 7],
    [5, 12, 19, 12],
    [5, 17, 19, 17],
  ],
  4: [
    [5, 6, 19, 6],
    [5, 10.7, 19, 10.7],
    [5, 15.3, 19, 15.3],
    [5, 19, 19, 19],
  ],
  5: [
    [6, 6, 18, 18],
    [18, 6, 6, 18],
  ],
  6: [
    [12, 5, 6, 19],
    [12, 5, 18, 19],
  ],
}

interface SealNumeralProps {
  n: number
  size?: number
}

export function SealNumeral({ n, size = 44 }: SealNumeralProps) {
  const strokes = STROKES[n]
  const inner = Math.round(size * 0.52)
  return (
    <View
      accessibilityRole='image'
      accessibilityLabel={`Chapter ${n}`}
      style={{
        width: size,
        height: size,
        borderRadius: 8,
        backgroundColor: FENG_PAPER.ink,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.18,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
      }}
    >
      {strokes ? (
        <Svg width={inner} height={inner} viewBox='0 0 24 24'>
          {strokes.map(([x1, y1, x2, y2], i) => (
            <Line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={FENG_PALETTE.rice}
              strokeWidth={2.4}
              strokeLinecap='round'
            />
          ))}
        </Svg>
      ) : (
        <Text style={{ color: FENG_PALETTE.rice, fontSize: size * 0.42, fontWeight: '700' }}>
          {n}
        </Text>
      )}
    </View>
  )
}
