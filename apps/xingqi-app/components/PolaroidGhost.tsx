/**
 * Empty well — a faint ink-wash "paper grain" so the empty slot reads as an
 * inviting empty frame (and, on the home/draft row, a tappable "new period"),
 * never as a broken image. Corner brackets keep the die-cut chrome.
 *
 * `hint` renders a small centered label (e.g. 新一期) on the draft well.
 */

import { useTheme } from '@zhop/core-ui'
import { Text, View } from 'react-native'

function Corner({
  color,
  top,
  left,
  right,
  bottom,
  flipX,
  flipY,
}: {
  color: string
  top?: number
  left?: number
  right?: number
  bottom?: number
  flipX?: boolean
  flipY?: boolean
}) {
  return (
    <View
      pointerEvents='none'
      style={{
        position: 'absolute',
        top,
        left,
        right,
        bottom,
        width: 11,
        height: 11,
        borderColor: color,
        borderTopWidth: flipY ? 0 : 1,
        borderBottomWidth: flipY ? 1 : 0,
        borderLeftWidth: flipX ? 0 : 1,
        borderRightWidth: flipX ? 1.5 : 0,
        opacity: 0.5,
      }}
    />
  )
}

/** Diagonal paper-grain — a few rotated translucent bars, clipped to the well. */
function PaperGrain({ color }: { color: string }) {
  return (
    <View
      pointerEvents='none'
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        overflow: 'hidden',
        opacity: 0.5,
      }}
    >
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <View
          key={i}
          style={{
            position: 'absolute',
            left: -20,
            right: -20,
            top: -20 + i * 26,
            height: 10,
            backgroundColor: color,
            opacity: 0.05,
            transform: [{ rotate: '-18deg' }],
          }}
        />
      ))}
    </View>
  )
}

export function PolaroidGhost({ hint }: { hint?: string }) {
  const { colors } = useTheme()
  const wellFill = colors.cardElevated ?? colors.card
  return (
    <View style={{ flex: 1 }}>
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: wellFill,
          opacity: 0.45,
        }}
      />
      <PaperGrain color={colors.separator} />
      {hint ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text
            style={{
              color: colors.dim,
              fontSize: 11,
              letterSpacing: 2,
              textAlign: 'center',
            }}
            numberOfLines={2}
          >
            {hint}
          </Text>
        </View>
      ) : null}
      <Corner color={colors.separator} top={8} left={8} />
      <Corner color={colors.separator} top={8} right={8} flipX />
      <Corner color={colors.separator} bottom={8} left={8} flipY />
      <Corner color={colors.separator} bottom={8} right={8} flipX flipY />
    </View>
  )
}
