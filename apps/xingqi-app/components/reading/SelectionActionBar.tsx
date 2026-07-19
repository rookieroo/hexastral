/**
 * SelectionActionBar — Yuel-style 划词 bar (copy / chat / highlight).
 */

import { Copy, Highlighter, type LucideIcon, MessageCircle } from 'lucide-react-native'
import { Pressable, Text, View } from 'react-native'
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated'

export interface SelectionActionBarProps {
  quote: string | null
  labels: { copy: string; chat: string; highlight: string }
  highlighted?: boolean
  onCopy?: () => void
  onChat?: () => void
  onHighlight?: () => void
  onClose: () => void
  colors: {
    card: string
    border: string
    text: string
    secondary: string
    muted: string
    accent: string
  }
  bottomInset: number
}

export function SelectionActionBar({
  quote,
  labels,
  highlighted,
  onCopy,
  onChat,
  onHighlight,
  onClose,
  colors,
  bottomInset,
}: SelectionActionBarProps) {
  if (!quote) return null

  const actions = [
    { key: 'copy', label: labels.copy, Icon: Copy, onPress: onCopy },
    { key: 'chat', label: labels.chat, Icon: MessageCircle, onPress: onChat },
    {
      key: 'highlight',
      label: labels.highlight,
      Icon: Highlighter,
      onPress: onHighlight,
      active: highlighted,
    },
  ].filter(
    (
      a
    ): a is {
      key: string
      label: string
      Icon: LucideIcon
      onPress: () => void
      active?: boolean
    } => Boolean(a.onPress)
  )

  return (
    <Animated.View
      entering={FadeInDown.duration(180)}
      exiting={FadeOutDown.duration(140)}
      style={{
        position: 'absolute',
        left: 16,
        right: 16,
        bottom: bottomInset + 16,
        backgroundColor: colors.card,
        borderWidth: 0.5,
        borderColor: colors.border,
        paddingHorizontal: 14,
        paddingTop: 10,
        paddingBottom: 10,
        gap: 10,
        zIndex: 30,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ width: 2, alignSelf: 'stretch', backgroundColor: colors.accent }} />
        <Text numberOfLines={1} style={{ color: colors.secondary, flex: 1, fontSize: 13 }}>
          {quote}
        </Text>
        <Pressable onPress={onClose} hitSlop={10} accessibilityRole='button'>
          <Text style={{ color: colors.muted, fontSize: 18, lineHeight: 18 }}>×</Text>
        </Pressable>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
        {actions.map((a) => (
          <Pressable
            key={a.key}
            onPress={a.onPress}
            hitSlop={8}
            accessibilityRole='button'
            accessibilityLabel={a.label}
            style={{ flex: 1, alignItems: 'center', paddingVertical: 8 }}
          >
            <a.Icon size={20} strokeWidth={1.6} color={a.active ? colors.accent : colors.text} />
          </Pressable>
        ))}
      </View>
    </Animated.View>
  )
}
