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
  /** Override labels per locale */
  labels?: Partial<Record<RelationshipType, string>>
}

const DEFAULT_LABELS: Record<RelationshipType, string> = {
  romantic: '恋人',
  friend: '朋友',
  family: '家人',
  partner: '合伙人',
  colleague: '同事',
  other: '其他',
}

export function RelationshipTypeSelector({
  value,
  onChange,
  labels,
}: RelationshipTypeSelectorProps) {
  const merged = { ...DEFAULT_LABELS, ...(labels ?? {}) }
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
