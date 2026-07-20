/**
 * Home hero — the latest reading's verdict: one-line 断语 + three-axis chips.
 * Whole card opens the full report; swipe-left deletes (Yuun/Yuel grammar).
 */

import { Trash2 } from 'lucide-react-native'
import { Pressable, Text, View } from 'react-native'
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable'

import type { VerdictAxis } from '@/lib/verdict'

export function HomeVerdictCard({
  latestLabel,
  goldenLine,
  meta,
  axes,
  openHint,
  onPress,
  onDelete,
  deleteLabel,
  colors,
  spacing,
}: {
  latestLabel: string
  goldenLine: string
  meta: string
  axes: VerdictAxis[]
  openHint: string
  onPress: () => void
  onDelete: () => void
  deleteLabel: string
  colors: {
    text: string
    dim: string
    accent: string
    secondary: string
    separator: string
    bg: string
  }
  spacing: { md: number; lg: number; sm: number; xl: number }
}) {
  return (
    <ReanimatedSwipeable
      friction={2}
      rightThreshold={40}
      overshootRight={false}
      renderRightActions={(_progress, _translation, methods) => (
        <Pressable
          onPress={() => {
            methods.close()
            onDelete()
          }}
          accessibilityRole='button'
          accessibilityLabel={deleteLabel}
          style={{
            width: 76,
            backgroundColor: colors.accent,
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
          }}
        >
          <Trash2 size={18} color={colors.bg} strokeWidth={1.6} />
          <Text style={{ color: colors.bg, fontSize: 11, fontWeight: '600' }} numberOfLines={1}>
            {deleteLabel}
          </Text>
        </Pressable>
      )}
    >
      <Pressable
        onPress={onPress}
        accessibilityRole='button'
        style={{
          paddingVertical: spacing.xl,
          paddingHorizontal: 2,
          backgroundColor: colors.bg,
          borderTopWidth: 0.5,
          borderBottomWidth: 0.5,
          borderColor: colors.separator,
          gap: spacing.md,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: spacing.md,
          }}
        >
          <Text
            style={{
              fontFamily: 'IBMPlexMono',
              color: colors.accent,
              fontSize: 11,
              letterSpacing: 1.4,
              textTransform: 'uppercase',
            }}
          >
            {latestLabel}
          </Text>
          <Text
            style={{
              fontFamily: 'IBMPlexMono',
              color: colors.dim,
              fontSize: 10,
              letterSpacing: 1,
              textTransform: 'uppercase',
              flexShrink: 1,
            }}
            numberOfLines={1}
          >
            {meta}
          </Text>
        </View>

        <Text
          style={{
            fontFamily: 'CrimsonPro',
            color: colors.text,
            fontSize: 27,
            lineHeight: 36,
          }}
          numberOfLines={4}
        >
          {goldenLine}
        </Text>

        {axes.length > 0 ? (
          <View style={{ gap: spacing.sm, marginTop: 2 }}>
            {axes.map((axis) => (
              <View
                key={axis.key}
                style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm }}
              >
                <Text
                  style={{
                    fontFamily: 'IBMPlexMono',
                    color: colors.secondary,
                    fontSize: 11,
                    letterSpacing: 0.6,
                    width: 52,
                    paddingTop: 1,
                  }}
                >
                  {axis.label}
                </Text>
                <Text
                  style={{ color: colors.secondary, fontSize: 13, lineHeight: 19, flex: 1 }}
                  numberOfLines={2}
                >
                  {axis.note}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        <Text style={{ color: colors.dim, fontSize: 12, lineHeight: 17, marginTop: 2 }}>
          {openHint}
        </Text>
      </Pressable>
    </ReanimatedSwipeable>
  )
}
