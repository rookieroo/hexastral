/**
 * 宜 / 忌 two-column block — the core 黄历 affordance. Verbs render as wrapped
 * chips; reused by Today and the day-detail screen.
 *
 * Header is a soft colored text label (no aggressive Check/X icon) — per
 * user feedback 2026-06: the icons read as too literal / aggressive for a
 * 黄历 surface. Color alone (green for 宜, cinnabar for 忌) carries the
 * semantic. Chip text uses display mode; explain/analytics keep canonical CJK.
 */

import { yijiExplainField, type YijiVocabularyMode } from '@zhop/astro-core'
import { useTheme } from '@zhop/core-ui'
import { Pressable, Text, View } from 'react-native'
import { useStrings } from '@/lib/i18n-context'
import { useYijiDisplayMode } from '@/lib/yiji-mode-context'
import { displayYijiVerb } from '@/lib/yiji-vocab'
import type { Locale } from '@/lib/i18n'

function Column({
  label,
  side,
  items,
  color,
  onSelect,
  locale,
  mode,
}: {
  /** Localized header text (e.g. "宜" / "Good for") — renders in the column's color. */
  label: string
  side: 'good' | 'avoid'
  items: string[]
  /** Column accent color — drives header text color (and only that, for the gentle look). */
  color: string
  onSelect?: (field: string) => void
  locale: Locale
  mode: YijiVocabularyMode
}) {
  const { colors, spacing } = useTheme()
  return (
    <View style={{ flex: 1, gap: spacing.sm }}>
      <Text
        style={{
          color,
          fontSize: 13,
          fontWeight: '700',
          letterSpacing: 2,
          textTransform: 'uppercase',
        }}
      >
        {label}
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
        {items.length === 0 ? (
          <Text style={{ color: colors.dim, fontSize: 14 }}>—</Text>
        ) : (
          items.map((v) => (
            <Pressable
              key={v}
              onPress={onSelect ? () => onSelect(yijiExplainField(side, v)) : undefined}
              style={{
                paddingHorizontal: spacing.sm,
                paddingVertical: 4,
                borderRadius: 8,
                backgroundColor: colors.card,
                borderWidth: 0.5,
                borderColor: colors.separator,
              }}
            >
              <Text style={{ color: colors.text, fontSize: 14 }}>
                {displayYijiVerb(v, locale, mode)}
              </Text>
            </Pressable>
          ))
        )}
      </View>
    </View>
  )
}

export function YiJiBlock({
  goodFor,
  avoid,
  onSelect,
}: {
  goodFor: string[]
  avoid: string[]
  /** Tap a verb → open the deep reading for that field (e.g. "宜 动土"). */
  onSelect?: (field: string) => void
}) {
  const { colors, spacing } = useTheme()
  const { t, locale } = useStrings()
  const { mode } = useYijiDisplayMode()

  return (
    <View style={{ flexDirection: 'row', gap: spacing.lg }}>
      <Column
        label={t.suitable}
        side='good'
        items={goodFor}
        color={colors.success}
        onSelect={onSelect}
        locale={locale}
        mode={mode}
      />
      <Column
        label={t.avoid}
        side='avoid'
        items={avoid}
        color={colors.danger}
        onSelect={onSelect}
        locale={locale}
        mode={mode}
      />
    </View>
  )
}
