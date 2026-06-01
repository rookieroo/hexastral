/**
 * InviteAcceptSheet — bottom sheet B sees on first app open after redeeming
 * an invitation via web → DDL → app.
 *
 * Flow:
 *   1. B clicks email link on web, fills birth info on /yuan/invite/[token]
 *   2. Web shows teaser + "Get full report in the app" → App Store
 *   3. App installs → DDL claims the invitation token automatically
 *   4. This sheet appears at app launch: "ta wants to know you better"
 *   5. B taps "open the report" → triggers RevealMoment → bond detail
 *
 * B's birth info is already collected on web; this sheet only confirms the
 * relationship is correctly identified and invites B into the report.
 */

import { Pressable, Text, View } from 'react-native'
import { yuanLight, yuanType, yuanSpacing, yuanPresets } from '@zhop/hexastral-tokens/yuan'
import { YuanSeal } from './YuanSeal'
import type { RelationshipType } from '../types'

export interface InviteAcceptSheetProps {
  /** Inviter (A) — display name */
  inviterName: string
  /** Inviter's optional opening note */
  inviterNote?: string
  /** Relationship type A picked when creating the invitation */
  relationshipType: RelationshipType
  /** Tap "open report" — triggers RevealMoment + navigation to bond detail */
  onOpen: () => void
  /** Tap "later" — bond stays accessible from the bonds tab */
  onDismiss: () => void
  copy?: Partial<typeof DEFAULT_COPY>
}

const DEFAULT_COPY = {
  prefix: '是 ',
  suffix: ' 邀请你进入',
  relationshipPrefix: '你们是 ',
  open: '打开缘报告  →',
  later: '稍后',
} as const

const RELATIONSHIP_LABEL: Record<RelationshipType, string> = {
  romantic: '恋人',
  friend: '朋友',
  family: '家人',
  partner: '合伙人',
  colleague: '同事',
  other: '有缘人',
}

export function InviteAcceptSheet({
  inviterName,
  inviterNote,
  relationshipType,
  onOpen,
  onDismiss,
  copy,
}: InviteAcceptSheetProps) {
  const merged = { ...DEFAULT_COPY, ...(copy ?? {}) }

  return (
    <View
      style={{
        backgroundColor: yuanLight.bg,
        paddingHorizontal: yuanSpacing.screenH,
        paddingTop: yuanSpacing.xl,
        paddingBottom: yuanSpacing.xxl,
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        gap: yuanSpacing.xl,
      }}
    >
      {/* Drag handle */}
      <View
        style={{
          alignSelf: 'center',
          width: 36,
          height: 3,
          borderRadius: 2,
          backgroundColor: yuanLight.borderStrong,
          marginBottom: yuanSpacing.md,
        }}
      />

      <View style={{ alignItems: 'center', gap: yuanSpacing.md }}>
        <YuanSeal mode="static" size={72} />
        <Text style={[yuanType.heading, { color: yuanLight.text, textAlign: 'center' }]}>
          {merged.prefix}
          <Text style={{ color: yuanLight.accent }}>{inviterName}</Text>
          {merged.suffix}
        </Text>
        <Text style={[yuanType.caption, { color: yuanLight.textSecondary }]}>
          {merged.relationshipPrefix}
          {RELATIONSHIP_LABEL[relationshipType]}
        </Text>
      </View>

      {inviterNote && (
        <View
          style={{
            padding: yuanSpacing.lg,
            backgroundColor: yuanLight.bgWarm,
            borderLeftWidth: 2,
            borderLeftColor: yuanLight.accent,
          }}
        >
          <Text style={[yuanType.body, { color: yuanLight.text, fontStyle: 'italic' }]}>
            "{inviterNote}"
          </Text>
        </View>
      )}

      <View style={{ alignItems: 'center', gap: yuanSpacing.md }}>
        <Pressable onPress={onOpen} hitSlop={12}>
          <Text style={yuanPresets.ctaText}>{merged.open}</Text>
        </Pressable>
        <Pressable onPress={onDismiss} hitSlop={12}>
          <Text style={[yuanType.caption, { color: yuanLight.textMuted }]}>{merged.later}</Text>
        </Pressable>
      </View>
    </View>
  )
}
