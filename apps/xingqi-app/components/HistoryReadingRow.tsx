/**
 * History list row — tap to open; swipe left to reveal delete (Yuel/Kindred pattern).
 */

import { Trash2 } from 'lucide-react-native'
import { Pressable, Text, View } from 'react-native'
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable'

export function HistoryReadingRow({
  title,
  meta,
  onPress,
  onDelete,
  colors,
  spacing,
  showTopBorder,
  deleteLabel,
}: {
  title: string
  meta: string
  onPress: () => void
  onDelete: () => void
  colors: { text: string; dim: string; accent: string; separator: string; bg: string }
  spacing: { md: number; lg: number; sm: number }
  showTopBorder: boolean
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
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
          paddingVertical: spacing.lg,
          backgroundColor: colors.bg,
          borderBottomWidth: 0.5,
          borderBottomColor: colors.separator,
          borderTopWidth: showTopBorder ? 0.5 : 0,
          borderTopColor: colors.separator,
        }}
      >
        <View
          style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: colors.accent,
            opacity: 0.85,
          }}
        />
        <View style={{ flex: 1, minWidth: 0, gap: 5 }}>
          <Text
            style={{
              fontFamily: 'CrimsonPro',
              color: colors.text,
              fontSize: 21,
              lineHeight: 27,
            }}
            numberOfLines={1}
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
        </View>
      </Pressable>
    </ReanimatedSwipeable>
  )
}
