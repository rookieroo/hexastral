/**
 * Lightweight yesterday stub for the tear-off upper leaf.
 */

import { Text, View } from 'react-native'
import type { AlmanacPalette } from '@/lib/almanac-palette'

export function AlmanacTearStub({
  dayNum,
  ganZhi,
  P,
}: {
  dayNum: number
  ganZhi?: string
  P: AlmanacPalette
}) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: P.bg,
        paddingTop: 48,
        paddingHorizontal: 24,
        alignItems: 'center',
      }}
    >
      <View
        style={{
          borderWidth: 2,
          borderColor: P.ink,
          padding: 3,
          width: '100%',
          maxWidth: 420,
        }}
      >
        <View
          style={{
            borderWidth: 0.5,
            borderColor: P.ink,
            paddingVertical: 48,
            alignItems: 'center',
            backgroundColor: P.card,
          }}
        >
          <Text
            style={{
              color: P.ink,
              fontSize: 96,
              lineHeight: 108,
              fontWeight: '700',
              letterSpacing: 2,
            }}
          >
            {dayNum}
          </Text>
          {ganZhi ? (
            <Text style={{ color: P.dim, fontSize: 16, letterSpacing: 4, marginTop: 8 }}>
              {ganZhi}
            </Text>
          ) : null}
        </View>
      </View>
    </View>
  )
}
