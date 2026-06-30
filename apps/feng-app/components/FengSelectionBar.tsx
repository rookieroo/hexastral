/**
 * FengSelectionBar — the 划词 toolbar. Slides up when a report sentence is
 * long-pressed; offers 复制 / 问AI / 划重点 (Yuel's 3-action model). A dark 墨
 * bar floating over the 宣纸 report. Actions render only when a handler is given.
 */

import { Copy, Highlighter, MessageCircle, X } from 'lucide-react-native'
import { Pressable, Text, View } from 'react-native'
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { FENG_PALETTE, spacing } from '@/lib/theme'

interface FengSelectionBarProps {
  /** Picked sentence; null hides the bar. */
  quote: string | null
  labels: { copy: string; chat: string; highlight: string }
  highlighted?: boolean
  onCopy?: () => void
  onChat?: () => void
  onHighlight?: () => void
  onClose: () => void
}

export function FengSelectionBar({
  quote,
  labels,
  highlighted,
  onCopy,
  onChat,
  onHighlight,
  onClose,
}: FengSelectionBarProps) {
  const insets = useSafeAreaInsets()
  if (quote === null) return null

  const action = (
    icon: React.ReactNode,
    label: string,
    onPress: (() => void) | undefined,
    active?: boolean
  ) =>
    onPress ? (
      <Pressable
        onPress={onPress}
        accessibilityRole='button'
        accessibilityLabel={label}
        hitSlop={8}
        style={{ alignItems: 'center', gap: 4, paddingHorizontal: spacing.md }}
      >
        {icon}
        <Text
          style={{ color: active ? FENG_PALETTE.cinnabar : FENG_PALETTE.riceMute, fontSize: 11 }}
        >
          {label}
        </Text>
      </Pressable>
    ) : null

  return (
    <Animated.View
      entering={FadeInDown.duration(180)}
      exiting={FadeOutDown.duration(140)}
      style={{
        position: 'absolute',
        left: spacing.lg,
        right: spacing.lg,
        bottom: insets.bottom + spacing.md,
        backgroundColor: FENG_PALETTE.nightRaised,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: FENG_PALETTE.hairline,
        paddingHorizontal: spacing.md,
        paddingTop: spacing.sm,
        paddingBottom: spacing.sm,
        shadowColor: '#000',
        shadowOpacity: 0.4,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 6 },
        elevation: 10,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          marginBottom: spacing.sm,
        }}
      >
        <Text numberOfLines={1} style={{ flex: 1, color: FENG_PALETTE.rice, fontSize: 13 }}>
          “{quote}”
        </Text>
        <Pressable onPress={onClose} accessibilityRole='button' hitSlop={8}>
          <X color={FENG_PALETTE.riceMute} size={16} />
        </Pressable>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' }}>
        {action(<Copy color={FENG_PALETTE.rice} size={18} />, labels.copy, onCopy)}
        {action(<MessageCircle color={FENG_PALETTE.rice} size={18} />, labels.chat, onChat)}
        {action(
          <Highlighter color={highlighted ? FENG_PALETTE.cinnabar : FENG_PALETTE.rice} size={18} />,
          labels.highlight,
          onHighlight,
          highlighted
        )}
      </View>
    </Animated.View>
  )
}
