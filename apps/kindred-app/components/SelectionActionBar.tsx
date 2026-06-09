/**
 * SelectionActionBar — the 划词 "冒泡任务栏" for the report.
 *
 * The report has no native text-range selection (RN doesn't expose selection
 * geometry to position an at-cursor popover reliably). Instead — matching the
 * solo reader's established 划词 pattern (long-press a paragraph) — long-pressing
 * a report paragraph "picks" it as the quote, and this bar slides up from the
 * bottom with the actions: 复制 / chat / highlight / make-if.
 *
 * Presentational only — the host (bond detail) owns the quote state + wires the
 * handlers (clipboard, chat route, highlight persistence, make-if route).
 */

import { kindredDark, kindredSpacing, kindredType } from '@zhop/hexastral-tokens/kindred'
import { Pressable, Text, View } from 'react-native'
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated'

export interface SelectionActionBarProps {
  /** The picked paragraph; null hides the bar. */
  quote: string | null
  labels: { copy: string; chat: string; highlight: string; makeif: string }
  /** Whether the picked quote is already highlighted (toggles the label tone). */
  highlighted?: boolean
  /** Each action renders only when its handler is provided (e.g. copy is omitted
   *  until expo-clipboard is added). */
  onCopy?: () => void
  onChat?: () => void
  onHighlight?: () => void
  onMakeif?: () => void
  onClose: () => void
}

export function SelectionActionBar({
  quote,
  labels,
  highlighted,
  onCopy,
  onChat,
  onHighlight,
  onMakeif,
  onClose,
}: SelectionActionBarProps) {
  if (!quote) return null

  const actions = [
    { key: 'copy', label: labels.copy, onPress: onCopy },
    { key: 'chat', label: labels.chat, onPress: onChat },
    { key: 'highlight', label: labels.highlight, onPress: onHighlight, active: highlighted },
    { key: 'makeif', label: labels.makeif, onPress: onMakeif },
  ].filter((a): a is { key: string; label: string; onPress: () => void; active?: boolean } =>
    Boolean(a.onPress)
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

      {/* Action row. */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        {actions.map((a) => (
          <Pressable
            key={a.key}
            onPress={a.onPress}
            hitSlop={8}
            accessibilityRole='button'
            accessibilityLabel={a.label}
            style={{ flex: 1, alignItems: 'center', paddingVertical: kindredSpacing.xs }}
          >
            <Text
              style={[
                kindredType.caption,
                { color: a.active ? kindredDark.accent : kindredDark.text, fontWeight: '600' },
              ]}
            >
              {a.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </Animated.View>
  )
}
