/**
 * RelationshipTypeSelector — chip group for picking a RelationshipType.
 *
 * Visual: row of small pill chips with subtle border. Selected chip uses
 * `accent` (ink.gold) background; others are transparent with a hairline border.
 * No animation — instant snap on tap.
 *
 * Dark-only (kindredDark): every consumer (pair-input / invite / other-meta)
 * is a kindred-app dark screen per ADR-0021. The previous kindredLight tokens
 * rendered near-invisible brown-on-black text.
 */

import {
  kindredDark,
  kindredRadius,
  kindredSpacing,
  kindredType,
} from '@zhop/hexastral-tokens/kindred'
import { Pressable, Text, View } from 'react-native'
import { RELATIONSHIP_TYPES, type RelationshipType } from '../types'

export interface RelationshipTypeSelectorProps {
  value: RelationshipType | null
  onChange: (value: RelationshipType) => void
  /** Locale for the built-in chip labels (en fallback). */
  locale?: string
  /** Explicit label overrides (win over `locale`). */
  labels?: Partial<Record<RelationshipType, string>>
}

/** Localized chip labels. Was a single hardcoded zh map, so EVERY locale saw
 *  Chinese chips — the selector now localizes by `locale`, EN as the fallback. */
const LOCALIZED_LABELS: Record<string, Record<RelationshipType, string>> = {
  en: {
    romantic: 'Partner',
    friend: 'Friend',
    family: 'Family',
    elder: 'Elder',
    sibling: 'Sibling',
    junior: 'Junior',
    partner: 'Cofounder',
    colleague: 'Colleague',
    other: 'Other',
  },
  zh: {
    romantic: '恋人',
    friend: '朋友',
    family: '家人',
    elder: '长辈',
    sibling: '平辈',
    junior: '晚辈',
    partner: '合伙人',
    colleague: '同事',
    other: '其他',
  },
  'zh-Hant': {
    romantic: '戀人',
    friend: '朋友',
    family: '家人',
    elder: '長輩',
    sibling: '平輩',
    junior: '晚輩',
    partner: '合夥人',
    colleague: '同事',
    other: '其他',
  },
  ja: {
    romantic: '恋人',
    friend: '友人',
    family: '家族',
    elder: '目上',
    sibling: '兄弟姉妹',
    junior: '目下',
    partner: 'ビジネス',
    colleague: '同僚',
    other: 'その他',
  },
}

export function RelationshipTypeSelector({
  value,
  onChange,
  labels,
  locale,
}: RelationshipTypeSelectorProps) {
  const base = LOCALIZED_LABELS[locale ?? 'en'] ?? LOCALIZED_LABELS.en
  const merged = { ...base, ...(labels ?? {}) }
  return (
    <View
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: kindredSpacing.sm,
      }}
    >
      {RELATIONSHIP_TYPES.map((rt) => {
        const isSelected = rt === value
        return (
          <Pressable
            key={rt}
            onPress={() => onChange(rt)}
            style={{
              paddingHorizontal: kindredSpacing.md,
              paddingVertical: kindredSpacing.sm,
              borderRadius: kindredRadius.sm,
              backgroundColor: isSelected ? kindredDark.accent : 'transparent',
              borderWidth: 0.5,
              borderColor: isSelected ? kindredDark.accent : kindredDark.border,
            }}
          >
            <Text
              style={{
                ...kindredType.caption,
                color: isSelected ? kindredDark.bg : kindredDark.text,
              }}
            >
              {merged[rt]}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}
