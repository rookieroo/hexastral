/**
 * BondCard — Card list item for the redesigned Bonds page
 *
 * Clean layout: name + relationship label on the left,
 * locale-aware bond-tier label + delete button on the right.
 * No avatar, no numeric scores.
 */

import { Trash2 } from 'lucide-react-native'
import { Alert, Pressable, Text, View } from 'react-native'
import type { BondData } from '@/lib/domain/bonds'
import { useI18n } from '@/lib/i18n'
import { useIosPalette, useTheme } from '@/lib/theme'
import type { ArchetypeCategory } from '@/lib/ui-mapping'
import { archetypeCategoryColor } from '@/lib/ui-mapping'

interface BondCardProps {
  bond: BondData
  onPress: (bond: BondData) => void
  onDelete?: (bond: BondData) => void
}

export function BondCard({ bond, onPress, onDelete }: BondCardProps) {
  const { isDark } = useTheme()
  const ios = useIosPalette()
  const { t, locale } = useI18n()

  const isPending = bond.status === 'pending_invite'
  const hasScore = bond.score != null
  const categoryColor = bond.archetypeCategory
    ? archetypeCategoryColor(bond.archetypeCategory as ArchetypeCategory, isDark)
    : ios.secondary

  const tierLabel = hasScore ? scoreTier(bond.score!, locale) : null

  const handleDelete = () => {
    Alert.alert(
      t('bond_delete_title'),
      t('bond_delete_confirm', { name: bond.targetName }),
      [
        { text: t('cancel'), style: 'cancel' },
        { text: t('bond_delete_action'), style: 'destructive', onPress: () => onDelete?.(bond) },
      ],
    )
  }

  return (
    <Pressable
      onPress={() => onPress(bond)}
      style={({ pressed }) => ({
        alignSelf: 'stretch',
        paddingVertical: 14,
        paddingHorizontal: 16,
        opacity: pressed ? 0.6 : isPending ? 0.5 : 1,
      })}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        {/* Name + relationship label */}
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <Text
            style={{ fontSize: 15, fontWeight: '400', color: ios.text, letterSpacing: 0.2 }}
            numberOfLines={1}
          >
            {bond.targetName}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text
              style={{ fontSize: 11, fontWeight: '300', color: ios.secondary, letterSpacing: 0.5 }}
              numberOfLines={1}
            >
              {bond.relationshipLabel}
            </Text>
            {isPending ? (
              <Text style={{ fontSize: 10, fontWeight: '300', color: ios.dim, letterSpacing: 0.5 }}>
                · {t('bond_status_pending')}
              </Text>
            ) : null}
          </View>
        </View>

        {/* Score tier label + delete */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginLeft: 8 }}>
          {tierLabel ? (
            <Text style={{ fontSize: 10, fontWeight: '300', color: categoryColor, letterSpacing: 0.5 }}>
              {tierLabel}
            </Text>
          ) : null}
          {onDelete ? (
            <Pressable onPress={handleDelete} hitSlop={8}>
              <Trash2 size={14} color={ios.dim} strokeWidth={1.2} />
            </Pressable>
          ) : null}
        </View>
      </View>
    </Pressable>
  )
}

// ── Locale-aware score tiers ──

type TierKey = 'zh' | 'zh-Hant' | 'en' | 'ja'

const TIERS: Record<TierKey, [number, string][]> = {
  zh:       [[80, '至交'], [60, '契合'], [40, '投缘'], [0, '初识']],
  'zh-Hant': [[80, '至交'], [60, '契合'], [40, '投緣'], [0, '初識']],
  en:       [[80, 'Soul Bond'], [60, 'Deep Tie'], [40, 'Aligned'], [0, 'New']],
  ja:       [[80, '最良'], [60, '深縁'], [40, '良縁'], [0, '新縁']],
}

function scoreTier(score: number, locale: string): string {
  const tiers = TIERS[locale as TierKey] ?? TIERS.en
  for (const [threshold, label] of tiers) {
    if (score >= threshold) return label
  }
  return tiers[tiers.length - 1]?.[1] ?? ''
}
