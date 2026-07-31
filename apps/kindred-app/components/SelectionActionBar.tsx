/**
 * SelectionActionBar — the 划词 "冒泡任务栏" for the report.
 *
 * Long-pressing a report SENTENCE picks it as the quote; this bar slides up with
 * sentence-scoped icons: copy / chat / highlight / make-if. Chat + make-if are
 * Pro depth surfaces — hosts navigate into free taste first; paywall after
 * server exhaustion. Copy + highlight stay free.
 *
 * Presentational only — the host owns quote state + handlers.
 */

import { kindredDark, kindredSpacing, kindredType } from '@zhop/hexastral-tokens/kindred'
import { Copy, GitBranch, Highlighter, type LucideIcon, MessageCircle } from 'lucide-react-native'
import { Pressable, Text, View } from 'react-native'
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated'

export interface SelectionActionBarProps {
  /** The picked sentence; null hides the bar. */
  quote: string | null
  labels: { copy: string; chat: string; highlight: string; makeif?: string }
  /** Whether the picked quote is already highlighted (toggles the icon tone). */
  highlighted?: boolean
  onCopy: () => void
  onChat: () => void
  onHighlight: () => void
  /** Optional — bond reports only (personal 命书 routes make-if to Yuun). */
  onMakeIf?: () => void
  onClose: () => void
}

export function SelectionActionBar({
  quote,
  labels,
  highlighted,
  onCopy,
  onChat,
  onHighlight,
  onMakeIf,
  onClose,
}: SelectionActionBarProps) {
  if (!quote) return null

  const actions: Array<{
    key: string
    label: string
    Icon: LucideIcon
    onPress: () => void
    active?: boolean
  }> = [
    { key: 'copy', label: labels.copy, Icon: Copy, onPress: onCopy },
    { key: 'chat', label: labels.chat, Icon: MessageCircle, onPress: onChat },
    {
      key: 'highlight',
      label: labels.highlight,
      Icon: Highlighter,
      onPress: onHighlight,
      active: highlighted,
    },
    ...(onMakeIf && labels.makeif
      ? [
          {
            key: 'makeif',
            label: labels.makeif,
            Icon: GitBranch,
            onPress: onMakeIf,
          },
        ]
      : []),
  ]

  return (
    <Animated.View
      entering={FadeInDown.duration(180)}
      exiting={FadeOutDown.duration(140)}
      style={{
        position: 'absolute',
        left: kindredSpacing.md,
        right: kindredSpacing.md,
        bottom: kindredSpacing.xl,
        backgroundColor: kindredDark.card,
        borderRadius: 14,
        borderWidth: 0.5,
        borderColor: kindredDark.borderStrong,
        paddingHorizontal: kindredSpacing.md,
        paddingTop: kindredSpacing.sm,
        paddingBottom: kindredSpacing.sm,
        gap: kindredSpacing.sm,
        shadowColor: '#000',
        shadowOpacity: 0.35,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 6 },
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: kindredSpacing.sm }}>
        <View style={{ width: 2, alignSelf: 'stretch', backgroundColor: kindredDark.accent }} />
        <Text
          numberOfLines={1}
          style={[kindredType.caption, { color: kindredDark.textSecondary, flex: 1 }]}
        >
          {quote}
        </Text>
        <Pressable onPress={onClose} hitSlop={10} accessibilityRole='button'>
          <Text style={{ color: kindredDark.textMuted, fontSize: 18, lineHeight: 18 }}>×</Text>
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
            style={{ flex: 1, alignItems: 'center', paddingVertical: kindredSpacing.sm }}
          >
            <a.Icon
              size={20}
              strokeWidth={1.6}
              color={a.active ? kindredDark.accent : kindredDark.text}
            />
          </Pressable>
        ))}
      </View>
    </Animated.View>
  )
}
