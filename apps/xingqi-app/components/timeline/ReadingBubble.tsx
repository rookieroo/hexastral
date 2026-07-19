/**
 * ReadingBubble — node detail under the life-axis graph (Yuun grammar).
 */

import { verdictColors } from '@zhop/hexastral-tokens/palette'
import { Text, View } from 'react-native'

import type { PersonalFit } from '@/lib/cycle-types'

type Colors = {
  text: string
  secondary: string
  dim: string
  accent: string
  separator: string
  bg: string
}

export function ReadingBubble({
  heading,
  body,
  fit,
  colors,
}: {
  heading: string
  body: string
  fit: PersonalFit | null
  colors: Colors
}) {
  return (
    <View
      style={{
        backgroundColor: colors.bg,
        borderWidth: 0.5,
        borderColor: colors.separator,
        paddingHorizontal: 14,
        paddingVertical: 12,
        gap: 6,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        {fit ? (
          <View
            style={{
              width: 7,
              height: 7,
              borderRadius: 3.5,
              backgroundColor: verdictColors[fit],
            }}
          />
        ) : null}
        <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600', flex: 1 }}>
          {heading}
        </Text>
      </View>
      <Text style={{ color: colors.secondary, fontSize: 13, lineHeight: 20 }}>{body}</Text>
    </View>
  )
}
