/**
 * InterpretationSections — long-form AI prose for a pair (合盘) reading.
 *
 * Renders the rich fields that hehun.ts already produces and persists in
 * `pairReadings.interpretation`: overview, day-master resonance, year/month/day
 * branch, highlights, warnings, advice, summary. Used by both
 * /(settings)/history/pair/[id] and /(bonds)/bond-detail so the same prose is
 * surfaced wherever the user lands.
 *
 * Locked mode (`canSeeAll = false`) keeps the freebie window — overview and
 * summary stay visible, the rest collapse to a single paywall hint.
 */

import { Lock } from 'lucide-react-native'
import { Text, View } from 'react-native'
import type { PairInterpretation } from '@/lib/hooks/usePairReadingQuery'
import { type TranslationKeys, useI18n } from '@/lib/i18n'
import type { IosPalette } from '@/lib/theme'

interface SectionDef {
  key: keyof PairInterpretation
  labelKey: TranslationKeys
  /** Sections marked freeForLocked stay visible to a non-unlocked viewer. */
  freeForLocked?: boolean
}

const SECTIONS: SectionDef[] = [
  { key: 'overview', labelKey: 'pair_section_overview', freeForLocked: true },
  { key: 'dayMasterRelation', labelKey: 'pair_section_day_master' },
  { key: 'yearBranch', labelKey: 'pair_section_year_branch' },
  { key: 'monthBranch', labelKey: 'pair_section_month_branch' },
  { key: 'dayBranch', labelKey: 'pair_section_day_branch' },
  { key: 'highlights', labelKey: 'pair_section_highlights' },
  { key: 'warnings', labelKey: 'pair_section_warnings' },
  { key: 'advice', labelKey: 'pair_section_advice' },
  { key: 'summary', labelKey: 'pair_section_summary', freeForLocked: true },
]

interface Props {
  interpretation: PairInterpretation | null | undefined
  ios: IosPalette
  /** When false, only `freeForLocked` sections render and a single paywall hint replaces the rest. */
  canSeeAll?: boolean
}

export function InterpretationSections({ interpretation, ios, canSeeAll = true }: Props) {
  const { t } = useI18n()

  if (!interpretation) return null

  const visible = SECTIONS.filter((s) => {
    const v = interpretation[s.key]
    if (typeof v !== 'string') return false
    if (!v.trim()) return false
    if (!canSeeAll && !s.freeForLocked) return false
    return true
  })

  if (visible.length === 0 && canSeeAll) return null

  const lockedRemainder = !canSeeAll
    ? SECTIONS.filter((s) => {
        if (s.freeForLocked) return false
        const v = interpretation[s.key]
        return typeof v === 'string' && v.trim().length > 0
      }).length
    : 0

  return (
    <View style={{ gap: 16, marginBottom: 24 }}>
      {visible.map((section) => {
        const value = interpretation[section.key]
        if (typeof value !== 'string') return null
        return (
          <View
            key={section.key}
            style={{
              borderWidth: 0.5,
              borderColor: ios.separator,
              padding: 18,
              gap: 8,
            }}
          >
            <Text
              style={{
                fontSize: 10,
                fontWeight: '300',
                color: ios.secondary,
                letterSpacing: 4,
                textTransform: 'uppercase',
              }}
            >
              {t(section.labelKey)}
            </Text>
            <Text
              style={{
                fontSize: 14,
                fontWeight: '300',
                color: ios.text,
                lineHeight: 22,
              }}
            >
              {value.trim()}
            </Text>
          </View>
        )
      })}

      {lockedRemainder > 0 ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            paddingVertical: 12,
            paddingHorizontal: 18,
            borderWidth: 0.5,
            borderColor: ios.separator,
          }}
        >
          <Lock size={12} color={ios.secondary} strokeWidth={1.2} />
          <Text
            style={{
              fontSize: 11,
              fontWeight: '300',
              color: ios.secondary,
              letterSpacing: 1,
              flex: 1,
            }}
          >
            {t('pair_section_locked_hint', { count: lockedRemainder })}
          </Text>
        </View>
      ) : null}
    </View>
  )
}
