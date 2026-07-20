/**
 * Home hero for the latest form reading — generous padding, editorial type.
 */

import { Trash2 } from 'lucide-react-native'
import { Pressable, Text, View } from 'react-native'
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable'

export function FeaturedReadingCard({
  title,
  meta,
  hint,
  onPress,
  onDelete,
  colors,
  spacing,
  deleteLabel,
}: {
  title: string
  meta: string
  hint: string
  onPress: () => void
  onDelete: () => void
  colors: { text: string; dim: string; accent: string; secondary: string; separator: string; bg: string }
  spacing: { md: number; lg: number; sm: number; xl: number }
  deleteLabel: string
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
          paddingVertical: spacing.xl + 4,
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
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: colors.accent,
            opacity: 0.9,
          }}
        />
        <Text
          style={{
            fontFamily: 'CrimsonPro',
            color: colors.text,
            fontSize: 28,
            lineHeight: 34,
          }}
          numberOfLines={2}
        >
          {title}
        </Text>
        <Text
          style={{
            fontFamily: 'IBMPlexMono',
            color: colors.dim,
            fontSize: 11,
            letterSpacing: 1.1,
            textTransform: 'uppercase',
          }}
          numberOfLines={1}
        >
          {meta}
        </Text>
        <Text style={{ color: colors.secondary, fontSize: 13, lineHeight: 18, marginTop: 2 }}>
          {hint}
        </Text>
      </Pressable>
    </ReanimatedSwipeable>
  )
}
