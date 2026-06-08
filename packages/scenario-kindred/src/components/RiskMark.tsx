/**
 * RiskMark — the 暗礁 (reef) severity as a 朱批: a hand-drawn cinnabar annotation
 * circle whose ink weight + closure IS the level (low → thin open arc, high →
 * bold closed ring), plus a tiny LOW/MID/HIGH so a single card is unambiguous.
 * Replaces the web-y "rating dots".
 */

import { kindredPaper } from '@zhop/hexastral-tokens/kindred'
import { Text, View } from 'react-native'
import Svg, { Path } from 'react-native-svg'
import { kindredFonts } from '../kindredFonts'
import type { ReefSeverity } from '../types'

const MARKS: Record<ReefSeverity, { d: string; sw: number; op: number; label: string }> = {
  low: { d: 'M29,13 C18,7 9,15 10,23 C11,31 21,35 28,30', sw: 2.4, op: 0.85, label: 'LOW' },
  mid: {
    d: 'M30,10 C17,4 6,13 7,23 C8,33 25,37 31,28 C35,22 32,13 24,10',
    sw: 3.6,
    op: 1,
    label: 'MID',
  },
  high: {
    d: 'M31,7 C16,2 4,11 5,22 C6,34 26,39 33,29 C37,23 35,13 27,9 C21,6 14,8 11,13',
    sw: 5,
    op: 1,
    label: 'HIGH',
  },
}

export function RiskMark({
  severity = 'mid',
  size = 30,
}: {
  severity?: ReefSeverity
  size?: number
}) {
  const m = MARKS[severity]
  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={size} height={size} viewBox='0 0 40 40'>
        <Path
          d={m.d}
          stroke={kindredPaper.cinnabar}
          strokeWidth={m.sw}
          opacity={m.op}
          fill='none'
          strokeLinecap='round'
        />
      </Svg>
      <Text
        style={{
          marginTop: 3,
          fontFamily: kindredFonts.mono,
          fontSize: 8,
          letterSpacing: 1,
          color: kindredPaper.cinnabar,
        }}
      >
        {m.label}
      </Text>
    </View>
  )
}
