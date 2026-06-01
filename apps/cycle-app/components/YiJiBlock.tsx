/**
 * 宜 / 忌 two-column block — the core 黄历 affordance. Verbs render as wrapped
 * chips; reused by Today and the day-detail screen.
 *
 * Header is a soft colored text label (no aggressive Check/X icon) — per
 * user feedback 2026-06: the icons read as too literal / aggressive for a
 * 黄历 surface. Color alone (green for 宜, cinnabar for 忌) carries the
 * semantic. Chip text runs through `localizeYijiVerb` so the verb reads
 * in the user's language; unknown verbs fall back to the source CJK.
 */

import { useTheme } from '@zhop/core-ui'
import { Pressable, Text, View } from 'react-native'
import { useStrings } from '@/lib/i18n-context'
import { localizeYijiVerb } from '@/lib/yiji-vocab'

function Column({
  label,
  items,
  color,
  onSelect,
  locale,
}: {
  /** Localized header text (e.g. "宜" / "Good for") — renders in the column's color. */
  label: string
  items: string[]
  /** Column accent color — drives header text color (and only that, for the gentle look). */
  color: string
  onSelect?: (field: string) => void
  /** Drives chip-text translation via `localizeYijiVerb`. */
  locale: Parameters<typeof localizeYijiVerb>[1]
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
              onPress={onSelect ? () => onSelect(`${label} ${v}`) : undefined}
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
                {localizeYijiVerb(v, locale)}
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

  return (
    <View style={{ flexDirection: 'row', gap: spacing.lg }}>
      <Column
        label={t.suitable}
        items={goodFor}
        color={colors.success}
        onSelect={onSelect}
        locale={locale}
      />
      <Column
        label={t.avoid}
        items={avoid}
        color={colors.danger}
        onSelect={onSelect}
        locale={locale}
      />
    </View>
  )
}
