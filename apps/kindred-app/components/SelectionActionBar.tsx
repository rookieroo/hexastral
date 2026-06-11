/**
 * SelectionActionBar — the 划词 "冒泡任务栏" for the report.
 *
 * The report has no native text-range selection (RN doesn't expose selection
 * geometry to position an at-cursor popover reliably). Instead — matching the
 * solo reader's established 划词 pattern — long-pressing a report SENTENCE
 * "picks" it as the quote (ChapterCard splits each paragraph into long-pressable
 * sentences), and this bar slides up from the bottom with a minimal one-row of
 * SENTENCE-scoped icons: copy / chat / highlight. (Make-if + timeline used to
 * live here too, but they're BOND-level — already on the thread-row swipe — so
 * in a sentence bar they were redundant + off-concept; 2026-06 they're dropped,
 * leaving the clean loop: copy/highlight to keep, chat to ask = the engagement →
 * free-taste cap → paywall path.) The meanings are taught once in the reading
 * primer + Symbol Glossary, so the bar stays icon-only with a11y labels.
 *
 * Presentational only — the host (bond detail) owns the quote state + wires the
 * handlers (clipboard, chat route, highlight persistence).
 */

import { kindredDark, kindredSpacing, kindredType } from '@zhop/hexastral-tokens/kindred'
import { Copy, Highlighter, type LucideIcon, MessageCircle } from 'lucide-react-native'
import { Pressable, Text, View } from 'react-native'
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated'

export interface SelectionActionBarProps {
  /** The picked sentence; null hides the bar. */
  quote: string | null
  labels: { copy: string; chat: string; highlight: string }
  /** Whether the picked quote is already highlighted (toggles the icon tone). */
  highlighted?: boolean
  /** Each action renders only when its handler is provided (e.g. chat is omitted
   *  until a pair reading exists). */
  onCopy?: () => void
  onChat?: () => void
  onHighlight?: () => void
  onClose: () => void
}

export function SelectionActionBar({
  quote,
  labels,
  highlighted,
  onCopy,
  onChat,
  onHighlight,
  onClose,
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
        // Lift it off the page.
        shadowColor: '#000',
        shadowOpacity: 0.35,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 6 },
      }}
    >
      {/* Picked snippet — one line, so the user sees what the action applies to. */}
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

      {/* Action row — a minimal row of icons (meanings live in the primer/glossary). */}
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
