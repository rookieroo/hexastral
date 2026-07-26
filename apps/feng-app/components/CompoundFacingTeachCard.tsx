/**
 * CompoundFacingTeachCard — shared 兼向 / 替卦 teaching (calibrator, review, report).
 */

import { isCompoundFacing, mountainAtDegree, sitMountainForFacing } from '@zhop/astro-core'
import { Pressable, Text, View } from 'react-native'
import { type Strings } from '@/lib/i18n'
import { spacing, useFengTheme } from '@/lib/theme'

export function CompoundFacingTeachCard({
  facingDegTrue,
  t,
  expanded,
  onToggle,
  compact,
}: {
  facingDegTrue: number
  t: Strings
  expanded?: boolean
  onToggle?: () => void
  /** One-line review style when collapsed. */
  compact?: boolean
}) {
  const { colors } = useFengTheme()
  if (!isCompoundFacing(facingDegTrue)) return null

  const face = mountainAtDegree(facingDegTrue)
  const sit = sitMountainForFacing(facingDegTrue)
  const chartLabel = t.compound_teach_chart_ti

  const body = (
    <View style={{ gap: spacing.xs }}>
      <Text style={{ color: colors.warning, fontSize: 13, fontWeight: '700', lineHeight: 19 }}>
        {t.compound_teach_title
          .replace('{face}', face.name)
          .replace('{sit}', sit.name)
          .replace('{method}', chartLabel)}
      </Text>
      {expanded || !compact ? (
        <>
          <Text style={{ color: colors.textMute, fontSize: 12, lineHeight: 18 }}>
            {t.compound_teach_why}
          </Text>
          <Text style={{ color: colors.textMute, fontSize: 12, lineHeight: 18 }}>
            {t.compound_teach_diff}
          </Text>
        </>
      ) : null}
      {onToggle ? (
        <Pressable onPress={onToggle} hitSlop={8} accessibilityRole='button'>
          <Text style={{ color: colors.accent, fontSize: 12, fontWeight: '600' }}>
            {expanded ? t.compound_teach_collapse : t.compound_teach_expand}
          </Text>
        </Pressable>
      ) : null}
    </View>
  )

  return (
    <View
      style={{
        borderWidth: 0.5,
        borderColor: colors.border,
        borderRadius: 0,
        padding: spacing.md,
        gap: spacing.xs,
        backgroundColor: colors.surface,
      }}
    >
      {body}
    </View>
  )
}
