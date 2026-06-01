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

import { yuanLight, yuanPresets, yuanSpacing, yuanType } from '@zhop/hexastral-tokens/yuan'
import type { ReactNode } from 'react'
import { Pressable, Text, View } from 'react-native'
import type { RelationshipType } from '../types'
import { YuanSeal } from './YuanSeal'

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
  /** When true, the "open" CTA is visually disabled */
  openDisabled?: boolean
  /** Slot rendered between note and CTA (e.g. privacy consent checkbox) */
  consentSlot?: ReactNode
  /** Localized relationship label; falls back to English defaults when omitted */
  relationshipLabel?: string
  copy?: Partial<InviteAcceptCopy>
}

type InviteAcceptCopy = {
  prefix: string
  suffix: string
  relationshipPrefix: string
  open: string
  later: string
}

const DEFAULT_COPY: InviteAcceptCopy = {
  prefix: 'is ',
  suffix: ' inviting you in',
  relationshipPrefix: 'You are ',
  open: 'Open the thread  →',
  later: 'Later',
}

const RELATIONSHIP_LABEL: Record<RelationshipType, string> = {
  romantic: 'Partner',
  friend: 'Friend',
  family: 'Family',
  partner: 'Business partner',
  colleague: 'Colleague',
  other: 'Other',
}

export function InviteAcceptSheet({
  inviterName,
  inviterNote,
  relationshipType,
  onOpen,
  onDismiss,
  openDisabled,
  consentSlot,
  relationshipLabel,
  copy,
}: InviteAcceptSheetProps) {
  const merged = { ...DEFAULT_COPY, ...(copy ?? {}) }
  const relationship =
    relationshipLabel ?? RELATIONSHIP_LABEL[relationshipType]

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
        <YuanSeal mode='static' size={72} />
        <Text style={[yuanType.heading, { color: yuanLight.text, textAlign: 'center' }]}>
          {merged.prefix}
          <Text style={{ color: yuanLight.accent }}>{inviterName}</Text>
          {merged.suffix}
        </Text>
        <Text style={[yuanType.caption, { color: yuanLight.textSecondary }]}>
          {merged.relationshipPrefix}
          {relationship}
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

      {consentSlot}

      <View style={{ alignItems: 'center', gap: yuanSpacing.md }}>
        <Pressable onPress={onOpen} hitSlop={12} disabled={openDisabled}>
          <Text style={[yuanPresets.ctaText, openDisabled && { opacity: 0.35 }]}>
            {merged.open}
          </Text>
        </Pressable>
        <Pressable onPress={onDismiss} hitSlop={12}>
          <Text style={[yuanType.caption, { color: yuanLight.textMuted }]}>{merged.later}</Text>
        </Pressable>
      </View>
    </View>
  )
}
